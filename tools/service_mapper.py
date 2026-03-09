from __future__ import annotations

import json
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List

ROOT = Path(".").resolve()
SRC = ROOT / "app" / "src"
ANALYSIS = ROOT / "analysis"
ANALYSIS.mkdir(exist_ok=True)

TS_EXT = (".ts", ".tsx", ".js", ".jsx")

# Patterns that indicate direct infra usage
SUPABASE_PATTERN = re.compile(r"supabase\.from|createClient", re.IGNORECASE)
FETCH_PATTERN = re.compile(r"\bfetch\(", re.IGNORECASE)
AXIOS_PATTERN = re.compile(r"\baxios\(", re.IGNORECASE)
NETLIFY_PATTERN = re.compile(r"/\.netlify/functions", re.IGNORECASE)

SERVICE_IMPORT_PATTERN = re.compile(
    r'import .* from ["\'](.+?\.service)["\']', re.IGNORECASE
)


def now():
    return datetime.now(timezone.utc).isoformat()


def rel(path: Path):
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except Exception:
        return str(path)


def read(path: Path):
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def scan_source_files():
    files = []
    for ext in TS_EXT:
        files.extend(SRC.rglob(f"*{ext}"))
    return [f for f in files if f.is_file()]


def analyze_file(path: Path):

    text = read(path)

    infra_usage = []

    if SUPABASE_PATTERN.search(text):
        infra_usage.append("supabase")

    if FETCH_PATTERN.search(text):
        infra_usage.append("fetch")

    if AXIOS_PATTERN.search(text):
        infra_usage.append("axios")

    if NETLIFY_PATTERN.search(text):
        infra_usage.append("netlify_function")

    service_imports = SERVICE_IMPORT_PATTERN.findall(text)

    return {
        "path": rel(path),
        "infra_usage": infra_usage,
        "service_imports": service_imports,
    }


def build_service_map(results):

    service_consumers = defaultdict(list)
    infra_files = []

    for r in results:

        if r["infra_usage"]:
            infra_files.append(r["path"])

        for service in r["service_imports"]:
            service_consumers[service].append(r["path"])

    return service_consumers, infra_files


def find_service_candidates(results):

    candidates = []

    for r in results:

        if r["infra_usage"] and not r["service_imports"]:
            candidates.append(
                {
                    "file": r["path"],
                    "infra_usage": r["infra_usage"],
                    "recommendation": "extract logic into service",
                }
            )

    return candidates


def write_json(name, data):
    path = ANALYSIS / name
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def write_markdown(service_consumers, infra_files, candidates):

    lines = []

    lines.append("# Service Map\n")
    lines.append(f"Generated: {now()}\n")

    lines.append("## Service Consumers\n")

    if not service_consumers:
        lines.append("No services detected.\n")
    else:
        for service, consumers in service_consumers.items():
            lines.append(f"### {service}")
            for c in consumers:
                lines.append(f"- {c}")
            lines.append("")

    lines.append("## Direct Infrastructure Usage\n")

    if not infra_files:
        lines.append("None detected.\n")
    else:
        for f in infra_files:
            lines.append(f"- {f}")

    lines.append("\n## Service Extraction Candidates\n")

    if not candidates:
        lines.append("No candidates detected.\n")
    else:
        for c in candidates:
            lines.append(f"- {c['file']} → {', '.join(c['infra_usage'])}")

    path = ANALYSIS / "service_map.md"
    path.write_text("\n".join(lines), encoding="utf-8")


def main():

    print("\nSERVICE MAPPER\n")

    files = scan_source_files()

    results = [analyze_file(f) for f in files]

    service_consumers, infra_files = build_service_map(results)

    candidates = find_service_candidates(results)

    write_json("service_map.json", results)

    write_json(
        "service_extraction_candidates.json",
        candidates,
    )

    write_markdown(service_consumers, infra_files, candidates)

    print("Reports written:\n")
    print("analysis/service_map.json")
    print("analysis/service_extraction_candidates.json")
    print("analysis/service_map.md\n")


if __name__ == "__main__":
    main()