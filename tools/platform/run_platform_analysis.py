import os
import json
import subprocess
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
ANALYSIS_DIR = ROOT / "analysis"

ANALYSIS_DIR.mkdir(exist_ok=True)

print("====================================================")
print(" CIVICS OS PLATFORM ANALYZER")
print(" Root:", ROOT)
print("====================================================")


def safe_run(script_path):
    """Run a python script safely if it exists"""
    full_path = ROOT / script_path

    if not full_path.exists():
        print("SKIP:", script_path)
        return

    print("RUN:", script_path)

    try:
        subprocess.run(
            ["python", str(full_path)],
            cwd=str(ROOT),
            check=False
        )
    except Exception as e:
        print("ERROR running", script_path, e)


# --------------------------------------------------
# RUN EXISTING TOOLCHAIN
# --------------------------------------------------

safe_run("tools/migration_repo_analyzer.py")
safe_run("tools/platform/schema/schema_registry_builder.py")
safe_run("tools/platform/schema/entity_registry_builder.py")
safe_run("tools/platform/schema/entity_model_builder.py")
safe_run("tools/platform/schema/schema_discovery_engine.py")
safe_run("tools/platform/schema/architecture_graph_builder.py")

print("--------------------------------------------------")
print("Scanning repository structure...")
print("--------------------------------------------------")


def scan_files(base):
    files = []
    for root, dirs, filenames in os.walk(base):
        for f in filenames:
            files.append(os.path.join(root, f))
    return files


repo_files = scan_files(ROOT)

cards = []
dashboards = []
registries = []
services = []
modules = []
functions = []

for f in repo_files:

    if "Card.tsx" in f:
        cards.append(f)

    if "template.ts" in f or "manifest.json" in f:
        dashboards.append(f)

    if "registry" in f and f.endswith(".ts"):
        registries.append(f)

    if "service" in f.lower() and f.endswith(".ts"):
        services.append(f)

    if "modules" in f and f.endswith(".tsx"):
        modules.append(f)

    if "netlify/functions" in f:
        functions.append(f)


architecture = {
    "generated": datetime.utcnow().isoformat(),

    "counts": {
        "total_files": len(repo_files),
        "cards": len(cards),
        "dashboards": len(dashboards),
        "registries": len(registries),
        "services": len(services),
        "modules": len(modules),
        "netlify_functions": len(functions)
    },

    "cards": cards,
    "dashboards": dashboards,
    "registries": registries,
    "services": services,
    "modules": modules,
    "netlify_functions": functions
}

json_path = ANALYSIS_DIR / "SYSTEM_ARCHITECTURE_MAP.json"

with open(json_path, "w") as f:
    json.dump(architecture, f, indent=2)

print("Architecture JSON written:")
print(json_path)


# --------------------------------------------------
# GENERATE HUMAN READABLE MAP
# --------------------------------------------------

report_lines = []

report_lines.append("# CIVICS OS SYSTEM ARCHITECTURE MAP\n")
report_lines.append(f"Generated: {datetime.utcnow().isoformat()}\n")

report_lines.append("## System Counts\n")

for k, v in architecture["counts"].items():
    report_lines.append(f"- {k}: {v}")

report_lines.append("\n## Cards\n")

for c in cards:
    report_lines.append(f"- {c}")

report_lines.append("\n## Dashboards\n")

for d in dashboards:
    report_lines.append(f"- {d}")

report_lines.append("\n## Registries\n")

for r in registries:
    report_lines.append(f"- {r}")

report_lines.append("\n## Services\n")

for s in services:
    report_lines.append(f"- {s}")

report_lines.append("\n## Modules\n")

for m in modules:
    report_lines.append(f"- {m}")

report_lines.append("\n## Netlify Functions\n")

for f in functions:
    report_lines.append(f"- {f}")

md_path = ANALYSIS_DIR / "SYSTEM_ARCHITECTURE_MAP.md"

with open(md_path, "w") as f:
    f.write("\n".join(report_lines))

print("\nArchitecture Report Written:")
print(md_path)

print("\n====================================================")
print(" PLATFORM ANALYSIS COMPLETE")
print("====================================================")