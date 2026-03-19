import os
import json
from pathlib import Path

"""
Circle Registry Auto Builder

Scans platform circles and generates registry files used by the application.

Outputs:
    app/src/platform/registry/circle.registry.ts
    app/src/platform/registry/card.registry.ts
    app/src/platform/registry/dashboard.registry.ts
    app/src/platform/registry/engine.registry.ts
"""

# --------------------------------------------------
# CONFIG
# --------------------------------------------------

PLATFORM_PATH = "app/src/platform"
CARDS_PATH = "app/src/platform"
REGISTRY_OUTPUT = "app/src/platform/registry"

# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def scan_directory(path, suffix=None):
    results = []
    for root, dirs, files in os.walk(path):
        for file in files:
            if suffix is None or file.endswith(suffix):
                full_path = os.path.join(root, file)
                results.append(full_path)
    return results


def normalize_import(path):
    path = path.replace("\\", "/")
    path = path.replace("app/src/", "")
    path = path.replace(".ts", "")
    path = path.replace(".tsx", "")
    return path


def extract_name(file_path):
    return Path(file_path).stem


# --------------------------------------------------
# SCAN CIRCLES
# --------------------------------------------------

def discover_circles():
    circles = []

    for item in os.listdir(PLATFORM_PATH):
        circle_path = os.path.join(PLATFORM_PATH, item)

        if os.path.isdir(circle_path):
            circles.append(item)

    return sorted(circles)


# --------------------------------------------------
# DISCOVER ENGINES
# --------------------------------------------------

def discover_engines():
    engines = []

    engine_files = scan_directory(PLATFORM_PATH, ".engine.ts")

    for file in engine_files:
        engines.append({
            "name": extract_name(file),
            "import": normalize_import(file)
        })

    return engines


# --------------------------------------------------
# DISCOVER CARDS
# --------------------------------------------------

def discover_cards():
    cards = []

    card_files = scan_directory(PLATFORM_PATH, ".tsx")

    for file in card_files:
        if "Card" in file:
            cards.append({
                "name": extract_name(file),
                "import": normalize_import(file)
            })

    return cards


# --------------------------------------------------
# DISCOVER DASHBOARDS
# --------------------------------------------------

def discover_dashboards():
    dashboards = []

    dashboard_files = scan_directory(PLATFORM_PATH, ".template.ts")

    for file in dashboard_files:
        dashboards.append({
            "name": extract_name(file),
            "import": normalize_import(file)
        })

    return dashboards


# --------------------------------------------------
# WRITE REGISTRY FILES
# --------------------------------------------------

def write_circle_registry(circles):
    path = os.path.join(REGISTRY_OUTPUT, "circle.registry.ts")

    lines = [
        "// AUTO-GENERATED FILE",
        "",
        "export const CircleRegistry = {"
    ]

    for c in circles:
        lines.append(f"  {c}: true,")

    lines.append("};")

    with open(path, "w") as f:
        f.write("\n".join(lines))

    print(f"Generated {path}")


def write_engine_registry(engines):
    path = os.path.join(REGISTRY_OUTPUT, "engine.registry.ts")

    imports = []
    entries = []

    for engine in engines:
        name = engine["name"]
        imp = engine["import"]

        imports.append(f"import {name} from '../../{imp}'")
        entries.append(f"  {name},")

    content = "\n".join(imports) + "\n\n"
    content += "export const EngineRegistry = {\n"
    content += "\n".join(entries)
    content += "\n};"

    with open(path, "w") as f:
        f.write(content)

    print(f"Generated {path}")


def write_card_registry(cards):
    path = os.path.join(REGISTRY_OUTPUT, "card.registry.ts")

    imports = []
    entries = []

    for card in cards:
        name = card["name"]
        imp = card["import"]

        imports.append(f"import {name} from '../../{imp}'")
        entries.append(f"  {name},")

    content = "\n".join(imports) + "\n\n"
    content += "export const CardRegistry = {\n"
    content += "\n".join(entries)
    content += "\n};"

    with open(path, "w") as f:
        f.write(content)

    print(f"Generated {path}")


def write_dashboard_registry(dashboards):
    path = os.path.join(REGISTRY_OUTPUT, "dashboard.registry.ts")

    imports = []
    entries = []

    for dash in dashboards:
        name = dash["name"]
        imp = dash["import"]

        imports.append(f"import {name} from '../../{imp}'")
        entries.append(f"  {name},")

    content = "\n".join(imports) + "\n\n"
    content += "export const DashboardRegistry = {\n"
    content += "\n".join(entries)
    content += "\n};"

    with open(path, "w") as f:
        f.write(content)

    print(f"Generated {path}")


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def run():

    print("")
    print("===================================")
    print("Circle Registry Auto Builder")
    print("===================================")

    circles = discover_circles()
    engines = discover_engines()
    cards = discover_cards()
    dashboards = discover_dashboards()

    print(f"Circles discovered: {len(circles)}")
    print(f"Engines discovered: {len(engines)}")
    print(f"Cards discovered: {len(cards)}")
    print(f"Dashboards discovered: {len(dashboards)}")

    write_circle_registry(circles)
    write_engine_registry(engines)
    write_card_registry(cards)
    write_dashboard_registry(dashboards)

    print("")
    print("Registry generation complete")


if __name__ == "__main__":
    run()