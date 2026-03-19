#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import subprocess
from collections import Counter
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

EXCLUDE_DIRS = {".git", "node_modules", ".netlify", "dist", ".temp", "__pycache__"}
SOURCE_EXTS = {".ts", ".tsx", ".js", ".jsx", ".py", ".sql", ".md", ".json", ".toml"}

MODULE_REQUIRED_KEYS = ["name", "version", "routes"]

@dataclass
class FunctionFinding:
    file: str
    empty: bool
    bytes: int
    lines: int
    notes: List[str]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def walk_files(root: Path):
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in EXCLUDE_DIRS]
        for f in fns:
            yield Path(dp) / f

def rel(root: Path, p: Path) -> str:
    return p.relative_to(root).as_posix()

def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")

def line_count(text: str) -> int:
    return text.count("\n") + 1 if text else 0

def scan_env_names(env_file: Path) -> List[str]:
    names: List[str] = []
    if not env_file.exists():
        return names
    for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        names.append(line.split("=", 1)[0])
    return names

def scan_module_manifests(root: Path) -> List[Dict[str, Any]]:
    results = []
    for path in root.glob("app/src/modules/**/module.json"):
        item: Dict[str, Any] = {"file": rel(root, path), "issues": []}
        try:
            data = json.loads(read_text(path))
            item["title"] = data.get("title") or data.get("name") or data.get("moduleId")
            for key in MODULE_REQUIRED_KEYS:
                if key not in data:
                    item["issues"].append(f"missing {key}")
            if "route" in data and "routes" not in data:
                item["issues"].append("legacy single-route manifest shape detected")
        except Exception as exc:
            item["issues"].append(f"invalid json: {exc}")
        results.append(item)
    return results

def scan_functions(root: Path) -> List[FunctionFinding]:
    findings: List[FunctionFinding] = []
    for path in sorted(root.glob("app/netlify/functions/*.ts")):
        text = read_text(path)
        notes: List[str] = []
        if not text.strip():
            notes.append("empty function file")
        lower = text.lower()
        if "fetch(" not in lower and "createclient(" not in lower and "sgmail" not in lower:
            notes.append("no obvious transport or database activity")
        findings.append(
            FunctionFinding(
                file=rel(root, path),
                empty=(not text.strip()),
                bytes=path.stat().st_size,
                lines=line_count(text),
                notes=notes,
            )
        )
    return findings

def table_reference_summary(root: Path) -> Dict[str, int]:
    table_re = re.compile(
        r"""\.from\(\s*["']([a-zA-Z0-9_]+)["']\s*\)|create table if not exists\s+([a-zA-Z0-9_.]+)""",
        re.IGNORECASE,
    )
    counts: Counter[str] = Counter()
    for path in walk_files(root):
        if path.suffix.lower() not in SOURCE_EXTS:
            continue
        text = read_text(path)
        for match in table_re.finditer(text):
            for group in match.groups():
                if group:
                    counts[group.split(".")[-1]] += 1
    return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))

def detect_router_split(root: Path) -> Dict[str, Any]:
    app = root / "app" / "src" / "App.tsx"
    main = root / "app" / "src" / "main.tsx"
    app_text = read_text(app) if app.exists() else ""
    main_text = read_text(main) if main.exists() else ""
    return {
        "app_exists": app.exists(),
        "main_exists": main.exists(),
        "app_uses_app_router": "AppRouter" in app_text,
        "main_mentions_app_router": "AppRouter" in main_text,
        "has_static_routes": "<Routes>" in app_text or "<Route " in app_text,
    }

def run_build(root: Path) -> Dict[str, Any]:
    try:
        proc = subprocess.run(
            ["bash", "-lc", "cd app && npm run build"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=180,
        )
        return {
            "exit_code": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
        }
    except Exception as exc:
        return {
            "exit_code": -1,
            "stdout": "",
            "stderr": str(exc),
        }

def main() -> None:
    root = Path.cwd().resolve()
    files = list(walk_files(root))
    ext_counts = Counter((p.suffix.lower() or "<noext>") for p in files)

    audit = {
        "generated_at": now_iso(),
        "repo_root": str(root),
        "file_count": len(files),
        "extension_counts": dict(ext_counts.most_common()),
        "env_var_names": scan_env_names(root / ".env"),
        "module_manifests": scan_module_manifests(root),
        "netlify_functions": [asdict(x) for x in scan_functions(root)],
        "table_references": table_reference_summary(root),
        "router_split": detect_router_split(root),
        "build": run_build(root),
    }

    analysis_dir = root / "analysis"
    analysis_dir.mkdir(exist_ok=True)

    (analysis_dir / "SYSTEM_AUDIT.json").write_text(json.dumps(audit, indent=2), encoding="utf-8")

    md = []
    md.append("# System Audit")
    md.append(f"Generated: {audit['generated_at']}")
    md.append("")
    md.append("## Summary")
    md.append(f"- Files scanned: **{audit['file_count']}**")
    md.append(f"- Build exit code: **{audit['build']['exit_code']}**")
    md.append(f"- Env names detected: **{len(audit['env_var_names'])}**")
    md.append("")
    md.append("## Router split")
    for k, v in audit["router_split"].items():
        md.append(f"- {k}: `{v}`")
    md.append("")
    md.append("## Module manifest issues")
    for item in audit["module_manifests"]:
        if item["issues"]:
            md.append(f"- {item['file']}: " + "; ".join(item["issues"]))
    md.append("")
    md.append("## Empty/suspicious functions")
    for item in audit["netlify_functions"]:
        if item["empty"] or item["notes"]:
            md.append(f"- {item['file']}: " + "; ".join(item["notes"]))
    md.append("")
    md.append("## Build stderr")
    md.append("```text")
    md.append(audit["build"]["stderr"].strip())
    md.append("```")

    (analysis_dir / "SYSTEM_AUDIT.md").write_text("\n".join(md), encoding="utf-8")
    (analysis_dir / "BUILD_BLOCKERS.md").write_text(audit["build"]["stderr"], encoding="utf-8")

    print("Wrote analysis/SYSTEM_AUDIT.json")
    print("Wrote analysis/SYSTEM_AUDIT.md")
    print("Wrote analysis/BUILD_BLOCKERS.md")

if __name__ == "__main__":
    main()
