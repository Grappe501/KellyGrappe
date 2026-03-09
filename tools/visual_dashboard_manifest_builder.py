from pathlib import Path
import json

ROOT = Path(".").resolve()

CARDS_DIR = ROOT / "app/src/cards"
TEMPLATES_DIR = ROOT / "app/src/dashboards/templates"
MANIFEST_DIR = ROOT / "app/src/dashboards/manifests"


DASHBOARD_TYPES = [
    "warRoom",
    "messaging",
    "metrics",
    "operations",
    "fundraising",
    "social"
]


def find_cards():

    cards = []

    if not CARDS_DIR.exists():
        return cards

    for file in CARDS_DIR.rglob("*Card.tsx"):

        rel = file.relative_to(CARDS_DIR)
        folder = rel.parts[0]

        name = file.stem.replace("Card", "")
        key = name[0].lower() + name[1:]

        cards.append({
            "key": key,
            "name": name,
            "folder": folder,
            "component": file.stem,
            "path": str(rel).replace("\\", "/")
        })

    return cards


def cards_for_dashboard(cards, dashboard):

    rules = {
        "warRoom": ["command", "metrics", "messaging"],
        "messaging": ["messaging", "command"],
        "metrics": ["metrics"],
        "operations": ["operations", "command", "metrics"],
        "fundraising": ["fundraising", "metrics", "messaging"],
        "social": ["social", "messaging"]
    }

    folders = rules.get(dashboard, [])

    return [c for c in cards if c["folder"] in folders]


def default_layout(folder):

    if folder == "metrics":
        return {"w": 3, "h": 2}

    if folder == "messaging":
        return {"w": 12, "h": 4}

    if folder == "command":
        return {"w": 6, "h": 3}

    if folder == "operations":
        return {"w": 6, "h": 3}

    return {"w": 6, "h": 3}


def build_manifest(cards, dashboard):

    selected = cards_for_dashboard(cards, dashboard)

    layout = []
    palette = []

    for i, card in enumerate(selected):

        size = default_layout(card["folder"])

        layout.append({
            "id": f"{card['key']}_{i}",
            "cardKey": card["key"],
            "x": (i % 4) * 3,
            "y": (i // 4) * 2,
            "w": size["w"],
            "h": size["h"]
        })

        palette.append({
            "cardKey": card["key"],
            "title": card["name"],
            "category": card["folder"]
        })

    manifest = {

        "dashboardKey": dashboard,

        "version": 1,

        "layout": layout,

        "palette": palette,

        "permissions": {
            "customCards": True,
            "dragResize": True,
            "addRemoveCards": True
        }

    }

    return manifest


def write_manifest(dashboard, manifest):

    MANIFEST_DIR.mkdir(parents=True, exist_ok=True)

    file = MANIFEST_DIR / f"{dashboard}.manifest.json"

    file.write_text(
        json.dumps(manifest, indent=2),
        encoding="utf-8"
    )

    print("Generated:", file)


def main():

    print("\nBuilding visual dashboard manifests...\n")

    cards = find_cards()

    if not cards:
        print("No cards found.")
        return

    for dashboard in DASHBOARD_TYPES:

        manifest = build_manifest(cards, dashboard)

        write_manifest(dashboard, manifest)

    print("\nVisual dashboard manifests complete.\n")


if __name__ == "__main__":
    main()