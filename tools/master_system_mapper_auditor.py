#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

TEXT_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".sql", ".py", ".toml",
    ".yml", ".yaml", ".html", ".css", ".scss", ".env", ".txt", ".ps1", ".sh",
}
SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py", ".sql"}
TS_LIKE = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
IGNORE_DIRS = {
    ".git", "node_modules", "dist", "build", ".next", ".vite", ".cache", ".netlify", ".vercel",
    "coverage", "tmp", "temp", "__pycache__", ".pytest_cache", ".mypy_cache",
}

IMPORT_RE = re.compile(r"""import\s+(?:type\s+)?(?:[\w*\s{},]+)\s+from\s+[\"']([^\"']+)[\"']""")
REQUIRE_RE = re.compile(r"""require\(\s*[\"']([^\"']+)[\"']\s*\)""")
DYNAMIC_IMPORT_RE = re.compile(r"""import\(\s*[\"']([^\"']+)[\"']\s*\)""")
EXPORT_RE = re.compile(r"""export\s+(?:default\s+)?(?:class|function|const|let|var|type|interface|enum)\s+([A-Za-z0-9_]+)""")
ENV_RE = re.compile(r"""(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)""")
ROUTE_RE = re.compile(r"""(?:path|to)\s*[:=]\s*[\"']([^\"']+)[\"']""")
JSX_COMPONENT_RE = re.compile(r"""<([A-Z][A-Za-z0-9_]*)\b""")
URL_HINT_RE = re.compile(r"""https?://|supabase|twilio|sendgrid|mailgun|postmark|resend|netlify|openai|anthropic|facebook|x\.com|smtp|postgres|redis""", re.I)
PHONE_HINT_RE = re.compile(r"""sms|text(?:ing)?|twilio|opt-?out|unsubscribe|stop\b|mms\b""", re.I)
EMAIL_HINT_RE = re.compile(r"""sendgrid|resend|mailgun|postmark|smtp|email|unsubscribe|campaign""", re.I)
CONTACT_HINT_RE = re.compile(r"""contact|contacts|supporter|voter|constituent|crm|lead|person""", re.I)
DB_HINT_RE = re.compile(r"""supabase|postgres|sqlite|indexeddb|idb|database|migration|schema|table""", re.I)
AI_HINT_RE = re.compile(r"""openai|anthropic|llm|prompt|assistant|ai\b|gpt\b|embedding|vector""", re.I)
BUILD_ERROR_RE = re.compile(r"""error TS\d+:|\berror\b|failed|cannot find module|type .* is not assignable""", re.I)

STAGE_RULES = {
    "build_foundation": {
        "positive": [r"package\.json$", r"vite\.config", r"netlify\.toml$", r"tsconfig", r"main\.tsx?$", r"App\.tsx?$"],
        "negative": [r"error TS\d+:", r"failed", r"TODO", r"FIXME"],
        "cap": 100,
    },
    "contact_backbone": {
        "positive": [r"contact", r"contacts", r"crm", r"supabase", r"schema", r"import", r"upsert", r"dedup"],
        "negative": [r"TODO", r"stub", r"placeholder"],
        "cap": 100,
    },
    "email_pipeline": {
        "positive": [r"email", r"sendgrid", r"resend", r"mailgun", r"campaign", r"unsubscribe", r"template"],
        "negative": [r"TODO", r"mock", r"demo"],
        "cap": 100,
    },
    "sms_pipeline": {
        "positive": [r"sms", r"text", r"twilio", r"stop\b", r"opt-?out", r"phone"],
        "negative": [r"TODO", r"mock", r"demo"],
        "cap": 100,
    },
    "operator_console": {
        "positive": [r"dashboard", r"console", r"cockpit", r"audience", r"segment", r"history", r"log"],
        "negative": [r"TODO", r"placeholder", r"demo"],
        "cap": 100,
    },
    "ai_automation": {
        "positive": [r"openai", r"anthropic", r"assistant", r"prompt", r"ai", r"automation"],
        "negative": [r"TODO", r"stub"],
        "cap": 100,
    },
    "production_hardening": {
        "positive": [r"test", r"validate", r"audit", r"telemetry", r"error", r"retry", r"queue", r"compliance"],
        "negative": [r"TODO", r"FIXME", r"hack"],
        "cap": 100,
    },
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def rel(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root)).replace("\\", "/")
    except Exception:
        return str(path).replace("\\", "/")


def is_probably_text(path: Path) -> bool:
    if path.suffix.lower() in TEXT_EXTENSIONS:
        return True
    try:
        with path.open("rb") as f:
            chunk = f.read(2048)
        return b"\x00" not in chunk
    except Exception:
        return False


def iter_files(root: Path) -> Iterable[Path]:
    for current_root, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for name in files:
            yield Path(current_root) / name


def resolve_local_import(source_file: Path, import_path: str) -> Optional[Path]:
    if not import_path.startswith("."):
        return None
    base = (source_file.parent / import_path).resolve()
    candidates = [
        base,
        base.with_suffix(".ts"), base.with_suffix(".tsx"), base.with_suffix(".js"), base.with_suffix(".jsx"),
        base / "index.ts", base / "index.tsx", base / "index.js", base / "index.jsx",
    ]
    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


@dataclass
class SourceFileSummary:
    path: str
    lines: int
    bytes: int
    imports: List[str]
    dynamic_imports: List[str]
    exports: List[str]
    env_vars: List[str]
    routes: List[str]
    component_tags: List[str]
    tags: List[str]


class MasterSystemMapperAuditor:
    def __init__(self, root: Path, output_dir: Path, run_build: bool = False, build_command: Optional[List[str]] = None):
        self.root = root.resolve()
        self.output_dir = output_dir.resolve()
        self.run_build = run_build
        self.build_command = build_command or []
        self.analysis_dir = self.output_dir
        self.analysis_dir.mkdir(parents=True, exist_ok=True)
        self.source_index: Dict[str, SourceFileSummary] = {}
        self.import_graph: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_import_graph: Dict[str, Set[str]] = defaultdict(set)
        self.files_by_tag: Dict[str, List[str]] = defaultdict(list)
        self.todo_hits: List[Dict[str, Any]] = []
        self.build_errors: List[Dict[str, Any]] = []
        self.doc_hints: List[Dict[str, str]] = []
        self.env_usage: Dict[str, Set[str]] = defaultdict(set)

    def run(self) -> Dict[str, Any]:
        files = list(iter_files(self.root))
        text_files = [f for f in files if is_probably_text(f)]
        source_files = [f for f in text_files if f.suffix.lower() in SOURCE_EXTENSIONS | TS_LIKE]

        repo_stats = self._collect_repo_stats(files, text_files, source_files)
        manifests = self._collect_manifests()
        source_map = self._scan_source_files(source_files)
        docs = self._scan_documentation(text_files)
        data_layer = self._scan_data_layer(text_files)
        messaging = self._scan_messaging(text_files)
        platform = self._scan_platform(text_files)
        build_runtime = self._scan_build_runtime(text_files, manifests)
        stage_completion = self._score_stages(text_files)
        risk_register = self._build_risk_register(stage_completion, messaging, data_layer, build_runtime)
        recommended_phases = self._build_phase_plan(stage_completion, messaging, data_layer, build_runtime)
        build_probe = self._run_build_probe()

        report = {
            "generated_at": now_iso(),
            "root": str(self.root),
            "repo_stats": repo_stats,
            "manifests": manifests,
            "source_map": source_map,
            "documentation": docs,
            "data_layer": data_layer,
            "messaging": messaging,
            "platform": platform,
            "build_runtime": build_runtime,
            "build_probe": build_probe,
            "stage_completion": stage_completion,
            "risk_register": risk_register,
            "recommended_phases": recommended_phases,
            "todos": self.todo_hits[:500],
            "build_errors_detected": self.build_errors[:300],
            "env_usage": {k: sorted(v) for k, v in sorted(self.env_usage.items())},
        }
        self._write_outputs(report)
        return report

    def _collect_repo_stats(self, files: List[Path], text_files: List[Path], source_files: List[Path]) -> Dict[str, Any]:
        ext_counter = Counter(f.suffix.lower() or "<none>" for f in files)
        top_dirs = Counter()
        total_bytes = 0
        for f in files:
            total_bytes += f.stat().st_size if f.exists() else 0
            try:
                top_dirs[rel(f.parent, self.root).split("/")[0]] += 1
            except Exception:
                pass
        return {
            "file_count": len(files),
            "text_file_count": len(text_files),
            "source_file_count": len(source_files),
            "total_bytes": total_bytes,
            "largest_extensions": ext_counter.most_common(25),
            "top_level_distribution": top_dirs.most_common(25),
        }

    def _collect_manifests(self) -> Dict[str, Any]:
        manifest_paths = [
            self.root / "package.json",
            self.root / "app" / "package.json",
            self.root / "netlify.toml",
            self.root / "app" / "vite.config.ts",
            self.root / "app" / "tsconfig.json",
            self.root / "supabase" / "config.toml",
        ]
        manifests: Dict[str, Any] = {}
        for path in manifest_paths:
            key = rel(path, self.root)
            if not path.exists():
                manifests[key] = {"exists": False}
                continue
            text = safe_read(path)
            data: Dict[str, Any] = {"exists": True, "path": key}
            if path.suffix == ".json":
                try:
                    parsed = json.loads(text)
                    data["name"] = parsed.get("name")
                    data["scripts"] = parsed.get("scripts", {})
                    data["dependencies"] = sorted((parsed.get("dependencies") or {}).keys())
                    data["devDependencies"] = sorted((parsed.get("devDependencies") or {}).keys())
                except Exception as exc:
                    data["parse_error"] = str(exc)
            else:
                data["preview"] = "\n".join(text.splitlines()[:40])
            manifests[key] = data
        return manifests

    def _classify_text(self, text: str, path_str: str) -> List[str]:
        tags: Set[str] = set()
        low = f"{path_str}\n{text[:12000]}".lower()
        if CONTACT_HINT_RE.search(low): tags.add("contacts")
        if EMAIL_HINT_RE.search(low): tags.add("email")
        if PHONE_HINT_RE.search(low): tags.add("sms")
        if DB_HINT_RE.search(low): tags.add("database")
        if AI_HINT_RE.search(low): tags.add("ai")
        if "dashboard" in low or "cockpit" in low: tags.add("dashboard")
        if "queue" in low or "job" in low or "worker" in low: tags.add("queue")
        if "netlify/functions" in low or "handler(" in low: tags.add("serverless")
        if "supabase" in low: tags.add("supabase")
        if "indexeddb" in low or "idb" in low: tags.add("indexeddb")
        if "telemetry" in low or "analytics" in low: tags.add("telemetry")
        if "twilio" in low: tags.add("twilio")
        if "sendgrid" in low or "resend" in low or "mailgun" in low or "postmark" in low: tags.add("mailer")
        return sorted(tags)

    def _scan_source_files(self, files: List[Path]) -> Dict[str, Any]:
        for path in files:
            text = safe_read(path)
            path_str = rel(path, self.root)
            imports = IMPORT_RE.findall(text) + REQUIRE_RE.findall(text)
            dynamic_imports = DYNAMIC_IMPORT_RE.findall(text)
            exports = EXPORT_RE.findall(text)
            env_vars = sorted(set(ENV_RE.findall(text)))
            routes = sorted(set(ROUTE_RE.findall(text)))
            component_tags = sorted(set(JSX_COMPONENT_RE.findall(text)))[:50]
            tags = self._classify_text(text, path_str)
            for env_var in env_vars:
                self.env_usage[env_var].add(path_str)
            summary = SourceFileSummary(
                path=path_str,
                lines=text.count("\n") + 1,
                bytes=path.stat().st_size if path.exists() else 0,
                imports=sorted(set(imports)),
                dynamic_imports=sorted(set(dynamic_imports)),
                exports=sorted(set(exports)),
                env_vars=env_vars,
                routes=routes,
                component_tags=component_tags,
                tags=tags,
            )
            self.source_index[path_str] = summary
            for tag in tags:
                self.files_by_tag[tag].append(path_str)
            self._collect_todos(path_str, text)
            self._collect_build_errors(path_str, text)
            self._collect_import_edges(path, imports, dynamic_imports)

        hotspots = sorted(
            (
                {
                    "path": p,
                    "imports_out": len(self.import_graph.get(p, [])),
                    "imports_in": len(self.reverse_import_graph.get(p, [])),
                    "lines": self.source_index[p].lines,
                    "tags": self.source_index[p].tags,
                }
                for p in self.source_index
            ),
            key=lambda x: (x["imports_in"] + x["imports_out"], x["lines"]),
            reverse=True,
        )[:100]

        return {
            "file_summaries": [asdict(v) for _, v in sorted(self.source_index.items())],
            "tag_buckets": {k: sorted(v) for k, v in sorted(self.files_by_tag.items())},
            "hotspots": hotspots,
            "import_graph_summary": {
                "node_count": len(self.source_index),
                "edge_count": sum(len(v) for v in self.import_graph.values()),
                "most_imported": sorted(
                    ((k, len(v)) for k, v in self.reverse_import_graph.items()),
                    key=lambda x: x[1],
                    reverse=True,
                )[:50],
            },
        }

    def _collect_todos(self, path_str: str, text: str) -> None:
        for i, line in enumerate(text.splitlines(), start=1):
            if any(token in line for token in ["TODO", "FIXME", "HACK", "XXX", "placeholder", "stub"]):
                self.todo_hits.append({"path": path_str, "line": i, "text": line.strip()[:300]})

    def _collect_build_errors(self, path_str: str, text: str) -> None:
        for i, line in enumerate(text.splitlines(), start=1):
            if BUILD_ERROR_RE.search(line):
                self.build_errors.append({"path": path_str, "line": i, "text": line.strip()[:300]})

    def _collect_import_edges(self, path: Path, imports: List[str], dynamic_imports: List[str]) -> None:
        source = rel(path, self.root)
        for item in imports + dynamic_imports:
            resolved = resolve_local_import(path, item)
            if resolved:
                target = rel(resolved, self.root)
                self.import_graph[source].add(target)
                self.reverse_import_graph[target].add(source)

    def _scan_documentation(self, files: List[Path]) -> Dict[str, Any]:
        docs = []
        for path in files:
            if path.suffix.lower() != ".md":
                continue
            path_str = rel(path, self.root)
            text = safe_read(path)
            heading = next((line.strip() for line in text.splitlines() if line.startswith("#")), "")
            tags = self._classify_text(text, path_str)
            docs.append({"path": path_str, "heading": heading, "tags": tags})
            if URL_HINT_RE.search(text[:8000]):
                self.doc_hints.append({"path": path_str, "heading": heading})
        return {
            "markdown_count": len(docs),
            "key_docs": sorted(docs, key=lambda d: (len(d["tags"]), d["path"]), reverse=True)[:100],
        }

    def _scan_data_layer(self, files: List[Path]) -> Dict[str, Any]:
        sql_files = []
        tables = Counter()
        db_files = []
        for path in files:
            text = safe_read(path)
            path_str = rel(path, self.root)
            if path.suffix.lower() == ".sql":
                sql_files.append(path_str)
                for match in re.findall(r"create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_\.]+)", text, flags=re.I):
                    tables[match] += 1
            if any(tag in self._classify_text(text, path_str) for tag in ["database", "supabase", "indexeddb", "contacts"]):
                db_files.append(path_str)
        contact_candidates = [p for p in db_files if CONTACT_HINT_RE.search(p)]
        return {
            "sql_files": sorted(sql_files),
            "table_candidates": tables.most_common(100),
            "database_related_files": sorted(set(db_files))[:400],
            "contact_related_files": sorted(set(contact_candidates))[:200],
            "supabase_present": (self.root / "supabase").exists(),
            "indexeddb_present": any("indexeddb" in p or "idb" in p.lower() for p in db_files),
        }

    def _scan_messaging(self, files: List[Path]) -> Dict[str, Any]:
        email_files, sms_files, queue_files, compliance_files = [], [], [], []
        providers = Counter()
        for path in files:
            text = safe_read(path)
            path_str = rel(path, self.root)
            low = f"{path_str}\n{text[:20000]}".lower()
            if EMAIL_HINT_RE.search(low):
                email_files.append(path_str)
            if PHONE_HINT_RE.search(low):
                sms_files.append(path_str)
            if "queue" in low or "job" in low or "worker" in low:
                queue_files.append(path_str)
            if any(token in low for token in ["unsubscribe", "opt-out", "opt out", "stop", "consent", "suppression"]):
                compliance_files.append(path_str)
            for provider in ["sendgrid", "resend", "mailgun", "postmark", "twilio", "smtp"]:
                if provider in low:
                    providers[provider] += 1
        return {
            "email_related_files": sorted(set(email_files))[:300],
            "sms_related_files": sorted(set(sms_files))[:300],
            "queue_related_files": sorted(set(queue_files))[:300],
            "compliance_related_files": sorted(set(compliance_files))[:300],
            "providers_detected": providers.most_common(),
            "email_feature_present": bool(email_files),
            "sms_feature_present": bool(sms_files),
            "queue_present": bool(queue_files),
        }

    def _scan_platform(self, files: List[Path]) -> Dict[str, Any]:
        route_files, dashboard_files, card_files, ai_files, function_files = [], [], [], [], []
        routes = set()
        for path in files:
            text = safe_read(path)
            path_str = rel(path, self.root)
            low = path_str.lower()
            if "route" in low or "router" in low:
                route_files.append(path_str)
            if "dashboard" in low or "cockpit" in low:
                dashboard_files.append(path_str)
            if "card" in low:
                card_files.append(path_str)
            if AI_HINT_RE.search(f"{path_str}\n{text[:15000]}"):
                ai_files.append(path_str)
            if "netlify/functions" in low or path_str.startswith("netlify/functions/") or "/functions/" in low:
                function_files.append(path_str)
            for route in ROUTE_RE.findall(text):
                routes.add(route)
        return {
            "route_files": sorted(set(route_files))[:200],
            "dashboard_files": sorted(set(dashboard_files))[:300],
            "card_files": sorted(set(card_files))[:500],
            "ai_files": sorted(set(ai_files))[:300],
            "serverless_files": sorted(set(function_files))[:200],
            "routes_detected": sorted(routes)[:300],
        }

    def _scan_build_runtime(self, files: List[Path], manifests: Dict[str, Any]) -> Dict[str, Any]:
        package_root = manifests.get("package.json", {})
        package_app = manifests.get("app/package.json", {})
        root_scripts = package_root.get("scripts", {}) if isinstance(package_root, dict) else {}
        app_scripts = package_app.get("scripts", {}) if isinstance(package_app, dict) else {}
        ts_error_files = sorted({hit["path"] for hit in self.build_errors if hit["path"].endswith((".ts", ".tsx", ".js", ".jsx", ".txt", ".md"))})
        runtime_files = []
        for path in files:
            path_str = rel(path, self.root)
            if any(name in path_str.lower() for name in ["main.tsx", "app.tsx", "platformbootstrap", "router", "registry", "vite.config", "netlify.toml"]):
                runtime_files.append(path_str)
        return {
            "root_scripts": root_scripts,
            "app_scripts": app_scripts,
            "runtime_files": sorted(set(runtime_files)),
            "build_error_file_candidates": ts_error_files[:200],
            "has_root_package": bool(package_root.get("exists")),
            "has_app_package": bool(package_app.get("exists")),
        }

    def _score_stages(self, files: List[Path]) -> Dict[str, Any]:
        docs: List[Tuple[str, str]] = []
        for path in files:
            if path.suffix.lower() not in TEXT_EXTENSIONS:
                continue
            path_str = rel(path, self.root)
            docs.append((path_str, safe_read(path)[:15000]))
        scores = {}
        for stage, rules in STAGE_RULES.items():
            positive_file_hits = 0
            negative_file_hits = 0
            evidence = []
            for pat in rules["positive"]:
                matched_files = []
                regex = re.compile(pat, flags=re.I)
                for path_str, text in docs:
                    if regex.search(path_str) or regex.search(text):
                        matched_files.append(path_str)
                if matched_files:
                    positive_file_hits += min(len(matched_files), 20)
                    evidence.append({"type": "positive", "pattern": pat, "files": matched_files[:8], "count": len(matched_files)})
            for pat in rules["negative"]:
                matched_files = []
                regex = re.compile(pat, flags=re.I)
                for path_str, text in docs:
                    if regex.search(path_str) or regex.search(text):
                        matched_files.append(path_str)
                if matched_files:
                    negative_file_hits += min(len(matched_files), 20)
                    evidence.append({"type": "negative", "pattern": pat, "files": matched_files[:8], "count": len(matched_files)})
            raw = max(0, positive_file_hits * 3 - negative_file_hits * 2)
            score = min(rules["cap"], raw)
            status = "not started" if score < 20 else "early" if score < 45 else "partial" if score < 70 else "advanced" if score < 90 else "near complete"
            scores[stage] = {"score": score, "status": status, "evidence": evidence[:30]}
        return scores

    def _build_risk_register(self, stages: Dict[str, Any], messaging: Dict[str, Any], data_layer: Dict[str, Any], build_runtime: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []
        if self.build_errors:
            risks.append({
                "priority": "critical",
                "domain": "build",
                "issue": "Static analysis found likely build/type errors in repository artifacts.",
                "evidence_count": len(self.build_errors),
                "recommended_action": "Fix compile/type mismatches before feature expansion.",
            })
        if messaging["email_feature_present"] and not messaging["queue_present"]:
            risks.append({
                "priority": "high",
                "domain": "messaging",
                "issue": "Email-related code exists without a clear queue/worker backbone.",
                "recommended_action": "Add durable job queue, delivery logging, retry policy, and suppression handling.",
            })
        if not messaging["sms_feature_present"]:
            risks.append({
                "priority": "high",
                "domain": "sms",
                "issue": "No strong evidence of a production SMS pipeline.",
                "recommended_action": "Build provider integration, compliance flow, queue, logging, and operator controls.",
            })
        if data_layer["supabase_present"] and data_layer["indexeddb_present"]:
            risks.append({
                "priority": "high",
                "domain": "data",
                "issue": "Evidence suggests multiple contact/data persistence layers are present.",
                "recommended_action": "Define one canonical source of truth and sync policy for contacts.",
            })
        if stages["production_hardening"]["score"] < 40:
            risks.append({
                "priority": "high",
                "domain": "ops",
                "issue": "Production hardening signals are weak relative to platform size.",
                "recommended_action": "Add test gates, validation scripts, deploy checklists, logging, and rollback rules.",
            })
        if not build_runtime.get("has_app_package"):
            risks.append({
                "priority": "medium",
                "domain": "build",
                "issue": "Application package manifest was not found.",
                "recommended_action": "Verify deployment root and application package boundaries.",
            })
        return risks

    def _build_phase_plan(self, stages: Dict[str, Any], messaging: Dict[str, Any], data_layer: Dict[str, Any], build_runtime: Dict[str, Any]) -> List[Dict[str, Any]]:
        phases = []
        phases.append({
            "phase": 0,
            "name": "Build Stabilization Baseline",
            "goal": "Produce one clean build and one reliable deploy path.",
            "acceptance": ["Build completes successfully", "Deployment root is unambiguous", "Core boot/runtime files are type-safe"],
            "why_now": "Build stability is the dependency for every other production phase.",
            "inputs": build_runtime["runtime_files"][:30],
        })
        phases.append({
            "phase": 1,
            "name": "Contact Backbone Hardening",
            "goal": "Define and enforce the canonical contact data model and source of truth.",
            "acceptance": ["Contacts import cleanly", "Deduping is deterministic", "Supabase/local roles are explicit"],
            "why_now": "Statewide outreach depends on trusted contact records.",
            "inputs": data_layer["contact_related_files"][:30],
        })
        phases.append({
            "phase": 2,
            "name": "Production Email Pipeline",
            "goal": "Enable campaign-grade outbound email tied to contact segments with logs and compliance.",
            "acceptance": ["Audience selection works", "Email sends via provider", "Delivery logs and unsubscribe flow exist"],
            "why_now": "Email is the fastest high-value statewide comms channel to operationalize.",
            "inputs": messaging["email_related_files"][:30],
        })
        phases.append({
            "phase": 3,
            "name": "Production SMS Pipeline",
            "goal": "Enable compliant outbound SMS/text capability tied to the same contact backbone.",
            "acceptance": ["Phone normalization exists", "Opt-out flow is enforced", "Batch send and logging work"],
            "why_now": "Texting completes the statewide rapid-response communications backbone.",
            "inputs": messaging["sms_related_files"][:30],
        })
        phases.append({
            "phase": 4,
            "name": "Unified Outreach Console",
            "goal": "Run segmentation, preview, send, and message history from one operator workflow.",
            "acceptance": ["One operator console controls email and SMS", "Campaign history is visible", "Failures are diagnosable"],
            "why_now": "Operations become repeatable only when the channels share one workflow.",
            "inputs": self.files_by_tag.get("dashboard", [])[:30],
        })
        return phases

    def _run_build_probe(self) -> Dict[str, Any]:
        if not self.run_build:
            return {"ran": False}
        commands = []
        if self.build_command:
            commands.append(self.build_command)
        else:
            if (self.root / "app" / "package.json").exists():
                commands.append(["npm", "run", "build"])
            if (self.root / "package.json").exists():
                commands.append(["npm", "run", "build"])
        results = []
        for cmd in commands[:2]:
            workdir = self.root / "app" if (self.root / "app" / "package.json").exists() and cmd == ["npm", "run", "build"] else self.root
            try:
                proc = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True, timeout=180)
                stderr = (proc.stderr or "")[-20000:]
                stdout = (proc.stdout or "")[-20000:]
                errors = []
                for line in (stdout + "\n" + stderr).splitlines():
                    if BUILD_ERROR_RE.search(line):
                        errors.append(line.strip()[:400])
                results.append({
                    "command": cmd,
                    "workdir": str(workdir),
                    "returncode": proc.returncode,
                    "stdout_tail": stdout,
                    "stderr_tail": stderr,
                    "error_lines": errors[:200],
                })
            except Exception as exc:
                results.append({"command": cmd, "workdir": str(workdir), "error": str(exc)})
        return {"ran": True, "results": results}

    def _write_outputs(self, report: Dict[str, Any]) -> None:
        json_path = self.analysis_dir / "master_system_audit.json"
        md_path = self.analysis_dir / "MASTER_SYSTEM_AUDIT.md"
        build_map_path = self.analysis_dir / "MASTER_BUILD_MAP.md"
        handoff_path = self.analysis_dir / "HANDOFF_SNAPSHOT.md"
        json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        md_path.write_text(self._render_markdown_report(report), encoding="utf-8")
        build_map_path.write_text(self._render_build_map(report), encoding="utf-8")
        handoff_path.write_text(self._render_handoff(report), encoding="utf-8")

    def _render_markdown_report(self, report: Dict[str, Any]) -> str:
        lines = []
        add = lines.append
        add("# Master System Audit")
        add("")
        add(f"Generated: {report['generated_at']}")
        add("")
        add("## Repo Overview")
        rs = report["repo_stats"]
        add(f"- Files scanned: {rs['file_count']}")
        add(f"- Text files: {rs['text_file_count']}")
        add(f"- Source files: {rs['source_file_count']}")
        add(f"- Total bytes: {rs['total_bytes']}")
        add("")
        add("## Stage Completion")
        for stage, data in report["stage_completion"].items():
            add(f"- **{stage}**: {data['score']}/100 ({data['status']})")
        add("")
        add("## Highest Risks")
        for risk in report["risk_register"]:
            add(f"- **{risk['priority'].upper()} | {risk['domain']}** — {risk['issue']} Recommended action: {risk['recommended_action']}")
        add("")
        add("## Messaging Snapshot")
        msg = report["messaging"]
        add(f"- Providers detected: {', '.join([p for p, _ in msg['providers_detected']]) or 'none'}")
        add(f"- Email files: {len(msg['email_related_files'])}")
        add(f"- SMS files: {len(msg['sms_related_files'])}")
        add(f"- Queue files: {len(msg['queue_related_files'])}")
        add(f"- Compliance files: {len(msg['compliance_related_files'])}")
        add("")
        add("## Contact/Data Snapshot")
        data = report["data_layer"]
        add(f"- Supabase present: {data['supabase_present']}")
        add(f"- IndexedDB present: {data['indexeddb_present']}")
        add(f"- SQL files: {len(data['sql_files'])}")
        add(f"- Contact-related files: {len(data['contact_related_files'])}")
        add("")
        add("## Build Runtime Snapshot")
        br = report["build_runtime"]
        add(f"- Root package present: {br['has_root_package']}")
        add(f"- App package present: {br['has_app_package']}")
        add(f"- Runtime files detected: {len(br['runtime_files'])}")
        add(f"- Build error file candidates: {len(br['build_error_file_candidates'])}")
        add("")
        add("## Recommended Phase Order")
        for phase in report["recommended_phases"]:
            add(f"### Phase {phase['phase']} — {phase['name']}")
            add(f"- Goal: {phase['goal']}")
            add(f"- Why now: {phase['why_now']}")
            add("- Acceptance:")
            for item in phase["acceptance"]:
                add(f"  - {item}")
            if phase["inputs"]:
                add("- Representative files:")
                for p in phase["inputs"][:12]:
                    add(f"  - {p}")
            add("")
        add("## Hottest Code Hotspots")
        for item in report["source_map"]["hotspots"][:25]:
            add(f"- {item['path']} — in:{item['imports_in']} out:{item['imports_out']} lines:{item['lines']} tags:{', '.join(item['tags'])}")
        add("")
        add("## TODO / FIXME Signals")
        for hit in report["todos"][:50]:
            add(f"- {hit['path']}:{hit['line']} — {hit['text']}")
        add("")
        if report["build_probe"].get("ran"):
            add("## Build Probe")
            for result in report["build_probe"].get("results", []):
                add(f"- Command: `{' '.join(result.get('command', []))}` returncode={result.get('returncode', 'n/a')}")
                for err in result.get("error_lines", [])[:20]:
                    add(f"  - {err}")
        return "\n".join(lines) + "\n"

    def _render_build_map(self, report: Dict[str, Any]) -> str:
        lines = [
            "# Master Build Map",
            "",
            "## Current Direction",
            "",
            "Work in small, full-file-replacement phases. Stabilize the build first, then harden the contact backbone, then productionize email, then SMS, then unify operator workflows.",
            "",
            "## Phase Ladder",
            "",
        ]
        for phase in report["recommended_phases"]:
            lines.append(f"### Phase {phase['phase']} — {phase['name']}")
            lines.append(f"Goal: {phase['goal']}")
            lines.append("Acceptance:")
            for item in phase["acceptance"]:
                lines.append(f"- {item}")
            lines.append("Representative files:")
            for p in phase["inputs"][:10]:
                lines.append(f"- {p}")
            lines.append("")
        lines.extend([
            "## Operating Rules",
            "",
            "- Full file replacement only.",
            "- One bounded phase at a time.",
            "- Zip every phase with apply order and tests.",
            "- Push to git, deploy to Netlify, test, then fix errors before moving on.",
            "- Update ledger and handoff after every phase.",
            "",
        ])
        return "\n".join(lines) + "\n"

    def _render_handoff(self, report: Dict[str, Any]) -> str:
        top_risks = report["risk_register"][:5]
        stages = report["stage_completion"]
        lines = [
            "# Handoff Snapshot",
            "",
            f"Generated: {report['generated_at']}",
            "",
            "## Current Truth",
            f"- Build foundation: {stages['build_foundation']['score']}/100 ({stages['build_foundation']['status']})",
            f"- Contact backbone: {stages['contact_backbone']['score']}/100 ({stages['contact_backbone']['status']})",
            f"- Email pipeline: {stages['email_pipeline']['score']}/100 ({stages['email_pipeline']['status']})",
            f"- SMS pipeline: {stages['sms_pipeline']['score']}/100 ({stages['sms_pipeline']['status']})",
            "",
            "## Next Active Phase",
            "- Phase 0 — Build Stabilization Baseline",
            "",
            "## Top Risks",
        ]
        for risk in top_risks:
            lines.append(f"- {risk['priority'].upper()} | {risk['domain']}: {risk['issue']}")
        lines.extend([
            "",
            "## Workflow Protocol",
            "- Full-file replacement only.",
            "- Apply one phase zip at a time.",
            "- Commit, deploy, test, log errors, then continue.",
        ])
        return "\n".join(lines) + "\n"


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Comprehensive platform mapper and auditor for master build planning.")
    parser.add_argument("root", nargs="?", default=".", help="Repository root to analyze.")
    parser.add_argument("--output-dir", default="analysis/master_audit", help="Directory for generated reports.")
    parser.add_argument("--run-build", action="store_true", help="Attempt a local build probe and include results.")
    parser.add_argument("--build-command", nargs="+", help="Custom build command to run, e.g. --build-command npm run build")
    return parser.parse_args(argv)


def main(argv: List[str]) -> int:
    args = parse_args(argv)
    root = Path(args.root).resolve()
    output_dir = (root / args.output_dir).resolve() if not Path(args.output_dir).is_absolute() else Path(args.output_dir).resolve()
    auditor = MasterSystemMapperAuditor(root=root, output_dir=output_dir, run_build=args.run_build, build_command=args.build_command)
    report = auditor.run()
    print(json.dumps({
        "status": "ok",
        "root": str(root),
        "output_dir": str(output_dir),
        "stage_completion": {k: v['score'] for k, v in report['stage_completion'].items()},
        "risk_count": len(report['risk_register']),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
