from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any

ROOT = Path(".").resolve()
ANALYSIS = ROOT / "analysis"

CAPABILITY_FILE = ANALYSIS / "platform_capability_map.json"

OUTPUT_BLUEPRINTS = ANALYSIS / "dashboard_blueprints.json"
OUTPUT_MARKDOWN = ANALYSIS / "dashboard_blueprints.md"
OUTPUT_QUEUE = ANALYSIS / "DASHBOARD_AUTOBUILD_QUEUE.json"


DASHBOARD_PATTERNS = {
    "war-room": ["command", "metrics", "messaging", "operations"],
    "field-operations": ["operations", "intake", "metrics"],
    "communications": ["messaging", "social", "metrics", "ai"],
    "fundraising": ["fundraising", "metrics"],
    "data-intelligence": ["metrics", "operations", "ai"],
}


def now():
    return datetime.now(timezone.utc).isoformat()


def load_capabilities() -> Dict[str, Any]:
    if not CAPABILITY_FILE.exists():
        raise RuntimeError("platform_capability_map.json not found. Run capability_registry_builder first.")

    return json.loads(CAPABILITY_FILE.read_text(encoding="utf-8"))


def build_dashboard_blueprints(capabilities: Dict[str, Any]) -> Dict[str, Any]:

    cards = capabilities["capabilities"]

    dashboards = {}

    for dashboard_key, categories in DASHBOARD_PATTERNS.items():

        compatible_cards = []

        for cap in cards.values():
            if cap["category"] in categories:
                compatible_cards.append(cap["key"])

        dashboards[dashboard_key] = {
            "key": dashboard_key,
            "title": dashboard_key.replace("-", " ").title(),
            "categories": categories,
            "cards": sorted(set(compatible_cards)),
        }

    return dashboards


def detect_missing_capabilities(dashboards, capabilities):

    existing_cards = set(capabilities["capabilities"].keys())

    missing = []

    for dashboard in dashboards.values():
        for card in dashboard["cards"]:
            if card not in existing_cards:
                missing.append(card)

    return sorted(set(missing))


def write_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def write_markdown(dashboards):

    lines = []

    lines.append("# Dashboard Blueprints\n")
    lines.append(f"Generated: {now()}\n")

    for dash in dashboards.values():

        lines.append(f"## {dash['title']} (`{dash['key']}`)\n")

        lines.append("Categories:")
        for c in dash["categories"]:
            lines.append(f"- {c}")

        lines.append("\nCards:")

        if not dash["cards"]:
            lines.append("- None")
        else:
            for card in dash["cards"]:
                lines.append(f"- {card}")

        lines.append("\n")

    OUTPUT_MARKDOWN.write_text("\n".join(lines), encoding="utf-8")


def build_autobuild_queue(missing_cards):

    queue = []

    if missing_cards:
        queue.append(
            {
                "priority": 1,
                "task": "Generate missing cards required by dashboards",
                "targets": missing_cards[:20],
                "why": "Dashboards reference capabilities that do not yet have card implementations",
            }
        )

    return {
        "generated_at": now(),
        "next_actions": queue,
    }


def main():

    print("\nDASHBOARD COMPOSER\n")

    capabilities = load_capabilities()

    dashboards = build_dashboard_blueprints(capabilities)

    missing_cards = detect_missing_capabilities(dashboards, capabilities)

    queue = build_autobuild_queue(missing_cards)

    write_json(OUTPUT_BLUEPRINTS, dashboards)
    write_markdown(dashboards)
    write_json(OUTPUT_QUEUE, queue)

    print("Reports written:\n")
    print("analysis/dashboard_blueprints.json")
    print("analysis/dashboard_blueprints.md")
    print("analysis/DASHBOARD_AUTOBUILD_QUEUE.json\n")


if __name__ == "__main__":
    main()