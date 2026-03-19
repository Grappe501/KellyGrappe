import os
import json
from pathlib import Path
from collections import defaultdict

ROOT = Path("app/src")
OUTPUT_DIR = Path("analysis")
OUTPUT_DIR.mkdir(exist_ok=True)

EXTENSIONS = [".ts", ".tsx"]

report = {
    "summary": {},
    "folders": {},
    "files": [],
    "ai_engines": [],
    "cockpit_engines": [],
    "dashboards": [],
    "cards": [],
    "modules": [],
}

folder_map = defaultdict(int)


def analyze_file(path: Path):
    rel = str(path.relative_to(ROOT))
    folder = str(path.parent.relative_to(ROOT))

    folder_map[folder] += 1

    try:
        content = path.read_text(encoding="utf8")
    except:
        return

    file_info = {
        "path": rel,
        "lines": len(content.splitlines())
    }

    report["files"].append(file_info)

    lower = rel.lower()

    if "ai/" in lower:
        report["ai_engines"].append(rel)

    if "cockpit" in lower:
        report["cockpit_engines"].append(rel)

    if "dashboard" in lower:
        report["dashboards"].append(rel)

    if "/cards/" in lower:
        report["cards"].append(rel)

    if "/modules/" in lower:
        report["modules"].append(rel)


def scan_project():
    for path in ROOT.rglob("*"):
        if path.suffix in EXTENSIONS:
            analyze_file(path)


def build_summary():
    report["summary"] = {
        "total_files": len(report["files"]),
        "total_ai_engines": len(report["ai_engines"]),
        "total_cockpit_files": len(report["cockpit_engines"]),
        "total_dashboards": len(report["dashboards"]),
        "total_cards": len(report["cards"]),
        "total_modules": len(report["modules"]),
    }

    report["folders"] = dict(folder_map)


def write_reports():

    json_path = OUTPUT_DIR / "platform_build_map.json"
    md_path = OUTPUT_DIR / "platform_build_map.md"

    with open(json_path, "w") as f:
        json.dump(report, f, indent=2)

    md = []

    md.append("# Platform Build Map\n")

    md.append("## Summary\n")

    for k, v in report["summary"].items():
        md.append(f"- {k}: {v}")

    md.append("\n## Folders\n")

    for k, v in sorted(report["folders"].items()):
        md.append(f"- {k}: {v} files")

    md.append("\n## AI Engines\n")

    for f in report["ai_engines"]:
        md.append(f"- {f}")

    md.append("\n## Cockpit System\n")

    for f in report["cockpit_engines"]:
        md.append(f"- {f}")

    md.append("\n## Dashboards\n")

    for f in report["dashboards"]:
        md.append(f"- {f}")

    md.append("\n## Cards\n")

    for f in report["cards"]:
        md.append(f"- {f}")

    md.append("\n## Modules\n")

    for f in report["modules"]:
        md.append(f"- {f}")

    with open(md_path, "w") as f:
        f.write("\n".join(md))


def main():
    print("\nMapping platform build...\n")

    scan_project()
    build_summary()
    write_reports()

    print("Platform map created.\n")
    print("Output:")
    print("analysis/platform_build_map.json")
    print("analysis/platform_build_map.md")


if __name__ == "__main__":
    main()