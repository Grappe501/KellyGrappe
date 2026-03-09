from pathlib import Path
from collections import defaultdict

ROOT = Path(".").resolve()
CARDS_DIR = ROOT / "app/src/cards"
TEMPLATES_DIR = ROOT / "app/src/dashboards/templates"


DASHBOARD_CATEGORY_MAP = {
    "warRoom": ["command", "metrics", "messaging"],
    "messaging": ["messaging", "command"],
    "metrics": ["metrics"],
    "operations": ["operations", "command", "metrics"],
    "fundraising": ["fundraising", "metrics", "messaging"],
    "social": ["social", "messaging", "command"],
}


CATEGORY_TO_DASHBOARD_CATEGORY = {
    "warRoom": "war_room",
    "messaging": "messaging",
    "metrics": "custom",
    "operations": "custom",
    "fundraising": "fundraising",
    "social": "social",
}


def write_file(path: Path, content: str):
    if path.exists():
        print(f"SKIP (exists): {path}")
        return False

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")
    print(f"CREATED: {path}")
    return True


def find_cards():
    cards = []

    if not CARDS_DIR.exists():
        return cards

    for file in sorted(CARDS_DIR.rglob("*Card.tsx")):
        rel = file.relative_to(CARDS_DIR)
        parts = rel.parts

        if len(parts) < 2:
            continue

        folder = parts[0]
        file_name = file.stem
        card_key = file_name.replace("Card", "")
        card_key = card_key[0].lower() + card_key[1:]

        cards.append({
            "path": file,
            "folder": folder,
            "file_name": file_name,
            "card_key": card_key,
        })

    return cards


def pick_cards_for_dashboard(cards, dashboard_name):
    allowed_folders = DASHBOARD_CATEGORY_MAP.get(dashboard_name, [])
    return [c for c in cards if c["folder"] in allowed_folders]


def width_for_folder(folder: str) -> int:
    if folder == "command":
        return 6
    if folder == "messaging":
        return 12
    if folder == "metrics":
        return 3
    if folder == "operations":
        return 6
    if folder == "fundraising":
        return 6
    if folder == "social":
        return 6
    return 6


def height_for_folder(folder: str) -> str:
    if folder == "messaging":
        return "lg"
    if folder == "metrics":
        return "md"
    return "md"


def template_title(name: str) -> str:
    if name == "warRoom":
        return "War Room"
    if name == "messaging":
        return "Messaging Dashboard"
    if name == "metrics":
        return "Metrics Dashboard"
    if name == "operations":
        return "Operations Dashboard"
    if name == "fundraising":
        return "Fundraising Dashboard"
    if name == "social":
        return "Social Dashboard"
    return f"{name} Dashboard"


def template_file_name(name: str) -> str:
    return f"{name}.template.ts"


def build_template_content(name: str, cards: list[dict]) -> str:
    dashboard_category = CATEGORY_TO_DASHBOARD_CATEGORY.get(name, "custom")
    title = template_title(name)

    card_blocks = []

    for i, card in enumerate(cards, start=1):
        w = width_for_folder(card["folder"])
        h = height_for_folder(card["folder"])

        block = f"""    {{
      id: "{card['card_key']}-{i}",
      cardKey: "{card['card_key']}",
      placement: {{ w: {w}, h: "{h}" }}
    }}"""
        card_blocks.append(block)

    cards_text = ",\n".join(card_blocks) if card_blocks else ""

    return f'''
import {{ DashboardRegistry }} from "../../platform/registry"
import type {{ DashboardTemplate }} from "../../cards/types"

const {name}Template: DashboardTemplate = {{
  key: "{name}",
  title: "{title}",
  description: "Auto-generated {title.lower()} template",
  category: "{dashboard_category}",
  version: 1,
  aiEnabled: true,
  defaultLayoutMode: "grid",
  cards: [
{cards_text}
  ]
}}

export function register{name[0].upper() + name[1:]}Template() {{
  DashboardRegistry.register({name}Template)
}}
'''.strip()


def build_template_index(existing_templates: list[str]):
    index_path = TEMPLATES_DIR / "index.ts"

    lines = []
    for template_name in sorted(existing_templates):
        lines.append(
            f'export * from "./{template_name}.template"'
        )

    content = "\n".join(lines) + "\n"

    if index_path.exists():
        print(f"SKIP (exists): {index_path}")
        return

    write_file(index_path, content)


def main():
    print("\nScanning cards for dashboard generation...\n")

    cards = find_cards()

    if not cards:
        print("No cards found in app/src/cards")
        return

    grouped = defaultdict(list)
    for card in cards:
        grouped[card["folder"]].append(card)

    print("Card folders discovered:")
    for folder, items in grouped.items():
        print(f"  - {folder}: {len(items)}")

    created_templates = []

    for dashboard_name in DASHBOARD_CATEGORY_MAP.keys():
        selected_cards = pick_cards_for_dashboard(cards, dashboard_name)

        template_path = TEMPLATES_DIR / template_file_name(dashboard_name)
        template_content = build_template_content(dashboard_name, selected_cards)

        created = write_file(template_path, template_content)
        if created:
            created_templates.append(dashboard_name)

    all_template_names = list(DASHBOARD_CATEGORY_MAP.keys())
    build_template_index(all_template_names)

    print("\nDashboard template generation complete.\n")


if __name__ == "__main__":
    main()