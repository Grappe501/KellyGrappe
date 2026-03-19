#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

TEXT_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".sql", ".py", ".toml",
    ".yml", ".yaml", ".html", ".css", ".scss", ".env", ".txt", ".ps1", ".sh", ".mts", ".cts",
}
CODE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".sql", ".mts", ".cts"}
TS_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"}
IGNORE_DIRS = {
    ".git", "node_modules", "dist", "build", ".next", ".vite", ".cache", ".netlify", ".vercel",
    "coverage", "tmp", "temp", "__pycache__", ".pytest_cache", ".mypy_cache", ".parcel-cache", ".idea", ".vscode"
}

IMPORT_RE = re.compile(r"""import\s+(?:type\s+)?(?:[\w*\s{},]+)\s+from\s+[\"']([^\"']+)[\"']""")
REQUIRE_RE = re.compile(r"""require\(\s*[\"']([^\"']+)[\"']\s*\)""")
DYNAMIC_IMPORT_RE = re.compile(r"""import\(\s*[\"']([^\"']+)[\"']\s*\)""")
EXPORT_RE = re.compile(r"""export\s+(?:default\s+)?(?:async\s+)?(?:class|function|const|let|var|type|interface|enum)\s+([A-Za-z0-9_]+)""")
ENV_RE = re.compile(r"""(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)""")
TODO_RE = re.compile(r"\b(TODO|FIXME|HACK|XXX|TBD|STUB|PLACEHOLDER|MOCK)\b", re.I)
ROUTE_RE = re.compile(r"""(?:path|to)\s*[:=]\s*[\"']([^\"']+)[\"']""")
FETCH_RE = re.compile(r"\bfetch\(")
NETLIFY_RE = re.compile(r"netlify/functions|/.netlify/functions|handler\s*=|schedule\(")
SUPABASE_RE = re.compile(r"\bsupabase\b", re.I)
INDEXEDDB_RE = re.compile(r"indexeddb|idb\b", re.I)
QUEUE_RE = re.compile(r"queue|job|batch|worker|retry|backoff|throttle|rate.?limit", re.I)
EMAIL_PROVIDER_RE = re.compile(r"resend|sendgrid|mailgun|postmark|smtp|nodemailer|ses|sparkpost", re.I)
SMS_PROVIDER_RE = re.compile(r"twilio|telnyx|bandwidth|plivo|sms|mms|short code|10dlc", re.I)
COMPLIANCE_RE = re.compile(r"unsubscribe|opt.?out|stop\b|help\b|consent|suppression|do not contact|dnc", re.I)
LOGGING_RE = re.compile(r"telemetry|log\(|logger|audit|event log|history", re.I)
CONTACT_RE = re.compile(r"contact|contacts|crm|supporter|constituent|lead|person|voter", re.I)
SEGMENT_RE = re.compile(r"segment|audience|filter|tag|list|cohort", re.I)
AI_RE = re.compile(r"openai|anthropic|llm|prompt|assistant|embedding|vector|gpt\b|claude\b", re.I)
AUTH_RE = re.compile(r"auth|login|session|token|jwt|clerk|supabase\.auth|role|permission|rbac", re.I)
TEST_FILE_RE = re.compile(r"(test|spec)\.(ts|tsx|js|jsx|py)$", re.I)
BUILD_ERR_RE = re.compile(r"error TS\d+:|Cannot find module|is not assignable to type|Expected \d+ arguments|Property '.*' does not exist|Build failed|Failed to compile", re.I)


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


def clamp(value: float, low: int = 0, high: int = 100) -> int:
    return int(max(low, min(high, round(value))))


def first_nonempty(*values: Optional[str]) -> Optional[str]:
    for v in values:
        if v:
            return v
    return None


@dataclass
class FileFacts:
    path: str
    size: int
    lines: int
    imports: List[str] = field(default_factory=list)
    exports: List[str] = field(default_factory=list)
    env_vars: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    todos: int = 0
    routes: List[str] = field(default_factory=list)
    indicators: Dict[str, int] = field(default_factory=dict)


class Auditor:
    def __init__(self, root: Path, output_dir: Path, run_build: bool = False, build_command: Optional[List[str]] = None):
        self.root = root.resolve()
        self.output_dir = output_dir.resolve()
        self.run_build = run_build
        self.build_command = build_command or []
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.file_facts: Dict[str, FileFacts] = {}
        self.import_graph: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_import_graph: Dict[str, Set[str]] = defaultdict(set)
        self.env_usage: Dict[str, Set[str]] = defaultdict(set)
        self.todo_hits: List[Dict[str, Any]] = []
        self.build_errors: List[str] = []

    def run(self) -> Dict[str, Any]:
        files = list(iter_files(self.root))
        text_files = [f for f in files if is_probably_text(f)]
        code_files = [f for f in text_files if f.suffix.lower() in CODE_EXTENSIONS]

        manifests = self.scan_manifests()
        repo_stats = self.scan_repo_stats(files, text_files, code_files)
        architecture = self.scan_files(text_files)
        pipeline_map = self.build_pipeline_map()
        build_probe = self.run_build_probe(manifests)
        readiness = self.compute_readiness(manifests, pipeline_map, build_probe)
        risks = self.build_risks(readiness, manifests, pipeline_map, build_probe)
        phases = self.recommend_phases(readiness, pipeline_map, build_probe)
        hotspots = self.compute_hotspots()

        report = {
            "generated_at": now_iso(),
            "root": str(self.root),
            "repo_stats": repo_stats,
            "manifests": manifests,
            "architecture": architecture,
            "pipeline_map": pipeline_map,
            "build_probe": build_probe,
            "readiness": readiness,
            "hotspots": hotspots,
            "risk_register": risks,
            "recommended_phases": phases,
            "env_usage": {k: sorted(v) for k, v in sorted(self.env_usage.items())},
            "todo_summary": {
                "count": len(self.todo_hits),
                "sample": self.todo_hits[:200],
            },
        }
        self.write_outputs(report)
        return report

    def scan_repo_stats(self, files: List[Path], text_files: List[Path], code_files: List[Path]) -> Dict[str, Any]:
        ext_counter = Counter(f.suffix.lower() or "<none>" for f in files)
        top_dirs = Counter()
        total_bytes = 0
        for f in files:
            try:
                total_bytes += f.stat().st_size
                top_dirs[rel(f.parent, self.root).split("/")[0]] += 1
            except Exception:
                pass
        return {
            "file_count": len(files),
            "text_file_count": len(text_files),
            "code_file_count": len(code_files),
            "total_bytes": total_bytes,
            "extensions": ext_counter.most_common(40),
            "top_level_distribution": top_dirs.most_common(30),
        }

    def scan_manifests(self) -> Dict[str, Any]:
        package_json = self.root / "package.json"
        package = {}
        if package_json.exists():
            try:
                package = json.loads(safe_read(package_json) or "{}")
            except Exception:
                package = {}
        scripts = package.get("scripts", {}) if isinstance(package, dict) else {}
        deps = package.get("dependencies", {}) if isinstance(package, dict) else {}
        dev_deps = package.get("devDependencies", {}) if isinstance(package, dict) else {}
        all_deps = {**deps, **dev_deps}
        tsconfig_files = [rel(p, self.root) for p in self.root.glob("tsconfig*.json")]
        return {
            "package_json_present": package_json.exists(),
            "name": package.get("name"),
            "scripts": scripts,
            "script_names": sorted(scripts.keys()),
            "dependency_count": len(all_deps),
            "dependencies_sample": sorted(all_deps.keys())[:100],
            "has_vite": "vite" in all_deps,
            "has_typescript": "typescript" in all_deps,
            "has_react": "react" in all_deps,
            "has_netlify": (self.root / "netlify.toml").exists() or "netlify-cli" in all_deps,
            "has_supabase": any("supabase" in d for d in all_deps),
            "has_email_provider": any(EMAIL_PROVIDER_RE.search(d) for d in all_deps),
            "has_sms_provider": any(SMS_PROVIDER_RE.search(d) for d in all_deps),
            "has_tests": any(k in scripts for k in ["test", "test:unit", "test:ci", "vitest", "jest"]),
            "tsconfig_files": tsconfig_files,
        }

    def classify_tags(self, text: str, path_str: str) -> List[str]:
        tags = []
        combo = f"{path_str}\n{text[:20000]}"
        pairs = [
            ("contacts", CONTACT_RE),
            ("email", EMAIL_PROVIDER_RE),
            ("sms", SMS_PROVIDER_RE),
            ("queue", QUEUE_RE),
            ("compliance", COMPLIANCE_RE),
            ("logging", LOGGING_RE),
            ("database", re.compile(r"supabase|postgres|schema|migration|indexeddb|idb|sql", re.I)),
            ("segmentation", SEGMENT_RE),
            ("ai", AI_RE),
            ("auth", AUTH_RE),
            ("serverless", NETLIFY_RE),
            ("routing", re.compile(r"react-router|createBrowserRouter|Routes>|Route>|router", re.I)),
            ("ui", re.compile(r"component|tsx|tailwind|dashboard|panel|console|cockpit", re.I)),
            ("testing", re.compile(r"vitest|jest|playwright|cypress|expect\(", re.I)),
        ]
        for name, regex in pairs:
            if regex.search(combo):
                tags.append(name)
        return tags

    def scan_files(self, text_files: List[Path]) -> Dict[str, Any]:
        files_by_tag: Dict[str, List[str]] = defaultdict(list)
        route_files: List[str] = []
        netlify_functions: List[str] = []
        test_files: List[str] = []
        docs: List[str] = []
        source_roots = Counter()

        for path in text_files:
            path_str = rel(path, self.root)
            text = safe_read(path)
            size = path.stat().st_size if path.exists() else 0
            lines = text.count("\n") + (1 if text else 0)
            imports = IMPORT_RE.findall(text) + REQUIRE_RE.findall(text) + DYNAMIC_IMPORT_RE.findall(text)
            exports = EXPORT_RE.findall(text)
            envs = sorted(set(ENV_RE.findall(text)))
            routes = ROUTE_RE.findall(text)
            tags = self.classify_tags(text, path_str)
            todo_count = len(TODO_RE.findall(text))

            indicators = {
                "fetch_calls": len(FETCH_RE.findall(text)),
                "todo_count": todo_count,
                "build_error_markers": len(BUILD_ERR_RE.findall(text)),
                "queue_markers": len(QUEUE_RE.findall(text)),
                "compliance_markers": len(COMPLIANCE_RE.findall(text)),
                "logging_markers": len(LOGGING_RE.findall(text)),
            }

            facts = FileFacts(
                path=path_str,
                size=size,
                lines=lines,
                imports=imports,
                exports=exports,
                env_vars=envs,
                tags=tags,
                todos=todo_count,
                routes=routes,
                indicators=indicators,
            )
            self.file_facts[path_str] = facts

            for tag in tags:
                files_by_tag[tag].append(path_str)
            for env_name in envs:
                self.env_usage[env_name].add(path_str)
            if todo_count:
                self.todo_hits.append({"path": path_str, "count": todo_count})
            if BUILD_ERR_RE.search(text):
                self.build_errors.append(path_str)
            if routes:
                route_files.append(path_str)
            if "netlify/functions" in path_str or "/functions/" in path_str.replace("\\", "/"):
                netlify_functions.append(path_str)
            if TEST_FILE_RE.search(path_str):
                test_files.append(path_str)
            if path.suffix.lower() == ".md":
                docs.append(path_str)
            if "/" in path_str:
                source_roots[path_str.split("/")[0]] += 1

            for imp in imports:
                self.import_graph[path_str].add(imp)
                self.reverse_import_graph[imp].add(path_str)

        return {
            "files_by_tag_counts": {k: len(v) for k, v in sorted(files_by_tag.items())},
            "files_by_tag_samples": {k: v[:40] for k, v in sorted(files_by_tag.items())},
            "route_files": route_files[:200],
            "netlify_functions": netlify_functions[:200],
            "test_files": test_files[:200],
            "doc_files": docs[:200],
            "source_root_distribution": source_roots.most_common(30),
        }

    def files_matching(self, *patterns: re.Pattern[str]) -> List[str]:
        matches = []
        for path, facts in self.file_facts.items():
            text = " ".join([path] + facts.tags + facts.imports + facts.exports + facts.env_vars)
            if any(p.search(text) for p in patterns):
                matches.append(path)
        return matches

    def count_files_with_tag(self, tag: str) -> int:
        return sum(1 for f in self.file_facts.values() if tag in f.tags)

    def feature_presence(self, predicate) -> Tuple[int, List[str]]:
        hits = [p for p, facts in self.file_facts.items() if predicate(p, facts)]
        return (1 if hits else 0, hits[:50])

    def build_pipeline_map(self) -> Dict[str, Any]:
        def has(pred):
            return self.feature_presence(pred)

        contacts_model, contacts_model_files = has(lambda p, f: "contacts" in f.tags and ("database" in f.tags or "segmentation" in f.tags))
        contacts_import, contacts_import_files = has(lambda p, f: "contacts" in f.tags and re.search(r"import|csv|upload|upsert|dedup", p, re.I))
        contacts_ui, contacts_ui_files = has(lambda p, f: "contacts" in f.tags and "ui" in f.tags)
        contacts_db, contacts_db_files = has(lambda p, f: "contacts" in f.tags and "database" in f.tags)
        contacts_seg, contacts_seg_files = has(lambda p, f: "contacts" in f.tags and "segmentation" in f.tags)
        contacts_audit, contacts_audit_files = has(lambda p, f: "contacts" in f.tags and "logging" in f.tags)

        email_provider, email_provider_files = has(lambda p, f: "email" in f.tags)
        email_templates, email_template_files = has(lambda p, f: "email" in f.tags and re.search(r"template|subject|html|mjml", p, re.I))
        email_queue, email_queue_files = has(lambda p, f: "email" in f.tags and "queue" in f.tags)
        email_logging, email_logging_files = has(lambda p, f: "email" in f.tags and "logging" in f.tags)
        email_compliance, email_compliance_files = has(lambda p, f: "email" in f.tags and "compliance" in f.tags)
        email_segmentation, email_seg_files = has(lambda p, f: "email" in f.tags and "segmentation" in f.tags)

        sms_provider, sms_provider_files = has(lambda p, f: "sms" in f.tags)
        sms_queue, sms_queue_files = has(lambda p, f: "sms" in f.tags and "queue" in f.tags)
        sms_logging, sms_logging_files = has(lambda p, f: "sms" in f.tags and "logging" in f.tags)
        sms_compliance, sms_compliance_files = has(lambda p, f: "sms" in f.tags and "compliance" in f.tags)
        sms_seg, sms_seg_files = has(lambda p, f: "sms" in f.tags and "segmentation" in f.tags)
        sms_reply, sms_reply_files = has(lambda p, f: "sms" in f.tags and re.search(r"webhook|inbound|reply|message status", p, re.I))

        operator_ui, operator_ui_files = has(lambda p, f: "ui" in f.tags and re.search(r"dashboard|console|cockpit|admin|operator", p, re.I))
        operator_audience, operator_audience_files = has(lambda p, f: "ui" in f.tags and "segmentation" in f.tags)
        operator_history, operator_history_files = has(lambda p, f: "ui" in f.tags and "logging" in f.tags)

        ai_runtime, ai_runtime_files = has(lambda p, f: "ai" in f.tags)
        ai_prompts, ai_prompt_files = has(lambda p, f: "ai" in f.tags and re.search(r"prompt|template|instruction", p, re.I))
        ai_automation, ai_automation_files = has(lambda p, f: "ai" in f.tags and ("queue" in f.tags or "serverless" in f.tags))

        auth, auth_files = has(lambda p, f: "auth" in f.tags)
        tests, test_files = has(lambda p, f: "testing" in f.tags or TEST_FILE_RE.search(p) is not None)
        telemetry, telemetry_files = has(lambda p, f: "logging" in f.tags and re.search(r"telemetry|audit|event", p, re.I))
        serverless, serverless_files = has(lambda p, f: "serverless" in f.tags)

        pipelines = {
            "contact_backbone": self.make_pipeline_score(
                {
                    "canonical_model": (contacts_model, 20, contacts_model_files),
                    "import_upsert": (contacts_import, 20, contacts_import_files),
                    "database_binding": (contacts_db, 20, contacts_db_files),
                    "segmentation": (contacts_seg, 15, contacts_seg_files),
                    "operator_ui": (contacts_ui, 15, contacts_ui_files),
                    "audit_logging": (contacts_audit, 10, contacts_audit_files),
                }
            ),
            "email_pipeline": self.make_pipeline_score(
                {
                    "provider_or_sender": (email_provider, 20, email_provider_files),
                    "templates": (email_templates, 15, email_template_files),
                    "audience_or_segmentation": (email_segmentation, 15, email_seg_files),
                    "queue_or_batching": (email_queue, 20, email_queue_files),
                    "delivery_logging": (email_logging, 15, email_logging_files),
                    "compliance_controls": (email_compliance, 15, email_compliance_files),
                }
            ),
            "sms_pipeline": self.make_pipeline_score(
                {
                    "provider_or_sender": (sms_provider, 20, sms_provider_files),
                    "audience_or_segmentation": (sms_seg, 10, sms_seg_files),
                    "queue_or_batching": (sms_queue, 20, sms_queue_files),
                    "delivery_logging": (sms_logging, 15, sms_logging_files),
                    "compliance_controls": (sms_compliance, 20, sms_compliance_files),
                    "reply_or_webhook_handling": (sms_reply, 15, sms_reply_files),
                }
            ),
            "operator_console": self.make_pipeline_score(
                {
                    "operator_ui": (operator_ui, 35, operator_ui_files),
                    "audience_builder": (operator_audience, 25, operator_audience_files),
                    "history_or_logs": (operator_history, 20, operator_history_files),
                    "telemetry": (telemetry, 20, telemetry_files),
                }
            ),
            "ai_automation": self.make_pipeline_score(
                {
                    "runtime_or_clients": (ai_runtime, 35, ai_runtime_files),
                    "prompt_system": (ai_prompts, 25, ai_prompt_files),
                    "automation_or_workers": (ai_automation, 20, ai_automation_files),
                    "serverless_execution": (serverless, 20, serverless_files),
                }
            ),
            "production_hardening": self.make_pipeline_score(
                {
                    "auth_controls": (auth, 20, auth_files),
                    "test_assets": (tests, 25, test_files),
                    "telemetry": (telemetry, 25, telemetry_files),
                    "serverless_or_runtime": (serverless, 15, serverless_files),
                    "queue_or_retry_controls": (1 if any("queue" in f.tags for f in self.file_facts.values()) else 0, 15, [p for p, f in self.file_facts.items() if "queue" in f.tags][:50]),
                }
            ),
        }
        return pipelines

    def make_pipeline_score(self, feature_map: Dict[str, Tuple[int, int, List[str]]]) -> Dict[str, Any]:
        score = 0
        present = 0
        details = {}
        for name, (present_flag, weight, files) in feature_map.items():
            earned = weight if present_flag else 0
            score += earned
            if present_flag:
                present += 1
            details[name] = {
                "present": bool(present_flag),
                "weight": weight,
                "earned": earned,
                "sample_files": files[:20],
            }
        return {
            "score": clamp(score),
            "feature_count": len(feature_map),
            "features_present": present,
            "details": details,
        }

    def run_build_probe(self, manifests: Dict[str, Any]) -> Dict[str, Any]:
        if not self.run_build:
            return {"ran": False, "status": "skipped"}

        if self.build_command:
            cmd = self.build_command
        elif manifests.get("package_json_present"):
            scripts = manifests.get("scripts", {})
            if "build" in scripts:
                if (self.root / "pnpm-lock.yaml").exists():
                    cmd = ["pnpm", "build"]
                elif (self.root / "yarn.lock").exists():
                    cmd = ["yarn", "build"]
                else:
                    cmd = ["npm", "run", "build"]
            else:
                return {"ran": False, "status": "no-build-script"}
        else:
            return {"ran": False, "status": "no-package-json"}

        try:
            proc = subprocess.run(
                cmd,
                cwd=str(self.root),
                capture_output=True,
                text=True,
                timeout=300,
                shell=False,
            )
            output = (proc.stdout or "") + "\n" + (proc.stderr or "")
            error_lines = []
            for line in output.splitlines():
                if BUILD_ERR_RE.search(line):
                    error_lines.append(line.strip())
            return {
                "ran": True,
                "status": "passed" if proc.returncode == 0 else "failed",
                "command": cmd,
                "returncode": proc.returncode,
                "error_count": len(error_lines),
                "error_lines": error_lines[:200],
                "output_tail": output.splitlines()[-200:],
            }
        except Exception as e:
            return {
                "ran": True,
                "status": "error",
                "command": cmd,
                "message": str(e),
            }

    def compute_readiness(self, manifests: Dict[str, Any], pipeline_map: Dict[str, Any], build_probe: Dict[str, Any]) -> Dict[str, Any]:
        has_main = any(p.endswith("main.tsx") or p.endswith("main.ts") or p.endswith("index.tsx") for p in self.file_facts)
        has_app = any(p.endswith("App.tsx") or p.endswith("App.ts") for p in self.file_facts)
        route_files = [p for p, f in self.file_facts.items() if "routing" in f.tags]
        tests = [p for p, f in self.file_facts.items() if "testing" in f.tags or TEST_FILE_RE.search(p)]
        todo_penalty = min(25, len(self.todo_hits) // 10)

        build_score = 0
        checks = {
            "package_json": (1 if manifests.get("package_json_present") else 0, 10),
            "tsconfig": (1 if manifests.get("tsconfig_files") else 0, 10),
            "vite_or_equivalent": (1 if manifests.get("has_vite") else 0, 10),
            "entrypoint": (1 if has_main else 15, 15),
            "app_shell": (1 if has_app else 0, 10),
            "routing": (1 if route_files else 0, 10),
            "netlify": (1 if manifests.get("has_netlify") else 0, 10),
            "tests_present": (1 if tests else 0, 10),
            "build_pass": (1 if build_probe.get("status") == "passed" else 0, 15),
        }
        details = {}
        for key, (present, weight) in checks.items():
            build_score += weight if present else 0
            details[key] = {"present": bool(present), "weight": weight, "earned": weight if present else 0}
        build_score = clamp(build_score - todo_penalty)

        readiness = {
            "build_foundation": {
                "score": build_score,
                "details": details,
                "todo_penalty": todo_penalty,
            },
            "contact_backbone": pipeline_map["contact_backbone"],
            "email_pipeline": pipeline_map["email_pipeline"],
            "sms_pipeline": pipeline_map["sms_pipeline"],
            "operator_console": pipeline_map["operator_console"],
            "ai_automation": pipeline_map["ai_automation"],
            "production_hardening": pipeline_map["production_hardening"],
        }
        return readiness

    def compute_hotspots(self) -> Dict[str, Any]:
        import_counts = []
        todo_counts = []
        line_counts = []
        for path, facts in self.file_facts.items():
            import_counts.append((path, len(facts.imports)))
            todo_counts.append((path, facts.todos))
            line_counts.append((path, facts.lines))
        return {
            "most_imports": sorted(import_counts, key=lambda x: x[1], reverse=True)[:50],
            "most_todos": sorted(todo_counts, key=lambda x: x[1], reverse=True)[:50],
            "largest_files": sorted(line_counts, key=lambda x: x[1], reverse=True)[:50],
        }

    def build_risks(self, readiness: Dict[str, Any], manifests: Dict[str, Any], pipeline_map: Dict[str, Any], build_probe: Dict[str, Any]) -> List[Dict[str, Any]]:
        risks = []

        def add(title: str, severity: str, area: str, evidence: List[str], recommendation: str):
            risks.append({
                "title": title,
                "severity": severity,
                "area": area,
                "evidence": evidence[:20],
                "recommendation": recommendation,
            })

        if build_probe.get("status") == "failed":
            add(
                "Build is currently failing",
                "critical",
                "build_foundation",
                build_probe.get("error_lines", [])[:20],
                "Fix compile/runtime typing issues before feature expansion."
            )
        if readiness["sms_pipeline"]["score"] < 60:
            add(
                "SMS pipeline is not production complete",
                "high",
                "sms_pipeline",
                [k for k, v in pipeline_map["sms_pipeline"]["details"].items() if not v["present"]],
                "Add provider integration, compliance controls, logging, queueing, and reply handling."
            )
        if readiness["email_pipeline"]["score"] < 70:
            add(
                "Email pipeline lacks production controls",
                "high",
                "email_pipeline",
                [k for k, v in pipeline_map["email_pipeline"]["details"].items() if not v["present"]],
                "Add queueing, suppression/unsubscribe, campaign logging, and audience controls."
            )
        if readiness["contact_backbone"]["score"] < 70:
            add(
                "Contact backbone is incomplete or fragmented",
                "high",
                "contact_backbone",
                [k for k, v in pipeline_map["contact_backbone"]["details"].items() if not v["present"]],
                "Define one canonical contact model and one production source of truth."
            )
        if readiness["production_hardening"]["score"] < 60:
            add(
                "Production hardening is weak",
                "high",
                "production_hardening",
                [k for k, v in pipeline_map["production_hardening"]["details"].items() if not v["present"]],
                "Increase test coverage, telemetry, auth controls, and queue/retry handling."
            )
        if len(self.todo_hits) > 50:
            add(
                "Large number of TODO/FIXME markers",
                "medium",
                "repo_quality",
                [f"{x['path']} ({x['count']})" for x in sorted(self.todo_hits, key=lambda x: x['count'], reverse=True)[:20]],
                "Resolve placeholders in the active production path before adding new features."
            )
        if manifests.get("has_supabase") and any("database" in f.tags for f in self.file_facts.values()) and any("indexeddb" in safe_read(self.root / p).lower() for p in self.file_facts if p.endswith((".ts", ".tsx", ".js", ".jsx"))):
            add(
                "Multiple data persistence patterns detected",
                "medium",
                "data_layer",
                [p for p, f in self.file_facts.items() if "database" in f.tags][:20],
                "Choose a canonical production persistence strategy and document fallback/offline behavior."
            )
        return risks

    def recommend_phases(self, readiness: Dict[str, Any], pipeline_map: Dict[str, Any], build_probe: Dict[str, Any]) -> List[Dict[str, Any]]:
        phases = []
        phases.append({
            "phase": "Phase 0 - Build Stabilization",
            "priority": 1,
            "goal": "Get the app building and deploying from one stable baseline.",
            "target_score": ">= 80 build_foundation",
            "focus_files": [p for p, _ in self.compute_hotspots()["most_imports"][:20]],
            "acceptance": [
                "npm/pnpm/yarn build passes",
                "No critical TypeScript errors",
                "Netlify deploy path confirmed",
            ],
        })
        phases.append({
            "phase": "Phase 1 - Contact Backbone",
            "priority": 2,
            "goal": "Normalize contacts into one canonical, production-safe pipeline.",
            "target_score": ">= 85 contact_backbone",
            "acceptance": [
                "Canonical contact schema defined",
                "Import/upsert/dedupe path works",
                "Segmentation fields are consistent",
            ],
        })
        phases.append({
            "phase": "Phase 2 - Email Pipeline",
            "priority": 3,
            "goal": "Enable production-safe statewide email tied to contacts.",
            "target_score": ">= 85 email_pipeline",
            "acceptance": [
                "Audience selection works",
                "Queue/batch and logging are in place",
                "Unsubscribe/suppression controls work",
            ],
        })
        phases.append({
            "phase": "Phase 3 - SMS Pipeline",
            "priority": 4,
            "goal": "Enable production-safe statewide text messaging tied to contacts.",
            "target_score": ">= 85 sms_pipeline",
            "acceptance": [
                "Provider send path works",
                "STOP/HELP/opt-out compliance works",
                "Delivery logs and webhook handling work",
            ],
        })
        phases.append({
            "phase": "Phase 4 - Unified Operator Console",
            "priority": 5,
            "goal": "Run outreach operations from one operator workflow.",
            "target_score": ">= 85 operator_console",
            "acceptance": [
                "Audience builder available",
                "Email/SMS campaign flows visible",
                "Logs/history available in UI",
            ],
        })
        phases.append({
            "phase": "Phase 5 - Hardening and Expansion",
            "priority": 6,
            "goal": "Increase safety, testing, telemetry, and AI-assisted operations.",
            "target_score": ">= 80 production_hardening and ai_automation",
            "acceptance": [
                "Critical paths tested",
                "Telemetry and audit logs complete",
                "AI layer runs on stable production foundation",
            ],
        })
        return phases

    def write_outputs(self, report: Dict[str, Any]) -> None:
        json_path = self.output_dir / "master_system_audit_v2.json"
        json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

        (self.output_dir / "MASTER_SYSTEM_AUDIT_V2.md").write_text(self.render_master_audit(report), encoding="utf-8")
        (self.output_dir / "MASTER_BUILD_MAP_V2.md").write_text(self.render_build_map(report), encoding="utf-8")
        (self.output_dir / "PIPELINE_BREAKDOWN_V2.md").write_text(self.render_pipeline_breakdown(report), encoding="utf-8")
        (self.output_dir / "BLOCKER_ANALYSIS_V2.md").write_text(self.render_blockers(report), encoding="utf-8")
        (self.output_dir / "HANDOFF_SNAPSHOT_V2.md").write_text(self.render_handoff(report), encoding="utf-8")

    def render_master_audit(self, report: Dict[str, Any]) -> str:
        lines = [
            "# Master System Audit V2",
            "",
            f"Generated: {report['generated_at']}",
            f"Root: `{report['root']}`",
            "",
            "## Readiness Scores",
            "",
        ]
        for area, data in report["readiness"].items():
            lines.append(f"- **{area}**: {data['score']}")
        lines.extend([
            "",
            "## Top Risks",
            "",
        ])
        for risk in report["risk_register"]:
            lines.append(f"- **[{risk['severity'].upper()}] {risk['title']}** — {risk['recommendation']}")
        lines.extend([
            "",
            "## Build Probe",
            "",
            f"- Status: **{report['build_probe'].get('status')}**",
        ])
        if report["build_probe"].get("error_lines"):
            lines.append("- Key errors:")
            for err in report["build_probe"]["error_lines"][:20]:
                lines.append(f"  - `{err}`")
        lines.extend([
            "",
            "## Repo Summary",
            "",
            f"- File count: {report['repo_stats']['file_count']}",
            f"- Code file count: {report['repo_stats']['code_file_count']}",
            f"- TODO markers: {report['todo_summary']['count']}",
        ])
        return "\n".join(lines) + "\n"

    def render_build_map(self, report: Dict[str, Any]) -> str:
        lines = [
            "# Master Build Map V2",
            "",
            "## System Areas",
            "",
        ]
        for area, data in report["pipeline_map"].items():
            lines.append(f"### {area}")
            lines.append("")
            lines.append(f"Score: **{data['score']}**")
            lines.append("")
            for name, detail in data["details"].items():
                status = "✔" if detail["present"] else "✖"
                lines.append(f"- {status} {name} (weight {detail['weight']})")
            lines.append("")
        lines.append("## Hotspots")
        lines.append("")
        lines.append("### Largest Files")
        for path, count in report["hotspots"]["largest_files"][:20]:
            lines.append(f"- `{path}` — {count} lines")
        lines.append("")
        lines.append("### Most TODOs")
        for path, count in report["hotspots"]["most_todos"][:20]:
            if count:
                lines.append(f"- `{path}` — {count}")
        return "\n".join(lines) + "\n"

    def render_pipeline_breakdown(self, report: Dict[str, Any]) -> str:
        lines = ["# Pipeline Breakdown V2", ""]
        for area, data in report["pipeline_map"].items():
            lines.append(f"## {area}")
            lines.append("")
            lines.append(f"Overall score: **{data['score']}**")
            lines.append("")
            for name, detail in data["details"].items():
                lines.append(f"### {name}")
                lines.append("")
                lines.append(f"- Present: **{detail['present']}**")
                lines.append(f"- Weight: **{detail['weight']}**")
                if detail["sample_files"]:
                    lines.append("- Sample files:")
                    for f in detail["sample_files"][:10]:
                        lines.append(f"  - `{f}`")
                else:
                    lines.append("- Sample files: none detected")
                lines.append("")
        return "\n".join(lines) + "\n"

    def render_blockers(self, report: Dict[str, Any]) -> str:
        lines = ["# Blocker Analysis V2", ""]
        bp = report["build_probe"]
        lines.append(f"## Build Status: {bp.get('status')}")
        lines.append("")
        if bp.get("error_lines"):
            lines.append("### Build Errors")
            lines.append("")
            for err in bp["error_lines"][:100]:
                lines.append(f"- `{err}`")
            lines.append("")
        lines.append("## Missing Production Controls")
        lines.append("")
        for area in ["contact_backbone", "email_pipeline", "sms_pipeline", "operator_console", "production_hardening"]:
            data = report["pipeline_map"][area]
            missing = [k for k, v in data["details"].items() if not v["present"]]
            lines.append(f"### {area}")
            if missing:
                for m in missing:
                    lines.append(f"- {m}")
            else:
                lines.append("- no missing controls detected by heuristic scan")
            lines.append("")
        return "\n".join(lines) + "\n"

    def render_handoff(self, report: Dict[str, Any]) -> str:
        next_phase = report["recommended_phases"][0]
        lines = [
            "# Handoff Snapshot V2",
            "",
            f"Generated: {report['generated_at']}",
            "",
            "## Current Scores",
            "",
        ]
        for area, data in report["readiness"].items():
            lines.append(f"- {area}: {data['score']}")
        lines.extend([
            "",
            "## Current Priority",
            "",
            f"- {next_phase['phase']}",
            f"- Goal: {next_phase['goal']}",
            "",
            "## Key Risks",
            "",
        ])
        for risk in report["risk_register"][:10]:
            lines.append(f"- [{risk['severity']}] {risk['title']}")
        return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Comprehensive platform mapper/auditor V2")
    parser.add_argument("root", nargs="?", default=".", help="Repo root")
    parser.add_argument("--output-dir", default="analysis/master_audit_v2", help="Output directory")
    parser.add_argument("--run-build", action="store_true", help="Run build command if available")
    parser.add_argument("--build-command", nargs="+", help="Custom build command")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    auditor = Auditor(
        root=Path(args.root),
        output_dir=Path(args.output_dir),
        run_build=args.run_build,
        build_command=args.build_command,
    )
    report = auditor.run()
    summary = {
        "status": "ok",
        "root": report["root"],
        "output_dir": str(Path(args.output_dir).resolve()),
        "readiness": {k: v["score"] for k, v in report["readiness"].items()},
        "risk_count": len(report["risk_register"]),
        "build_status": report["build_probe"].get("status"),
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
