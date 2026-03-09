from pathlib import Path
import json

ROOT = Path(".").resolve()

CARDS_DIR = ROOT / "app/src/cards"
TEMPLATES_DIR = ROOT / "app/src/dashboards/templates"
MANIFESTS_DIR = ROOT / "app/src/dashboards/manifests"
ANALYSIS_DIR = ROOT / "analysis"

OUTPUT_JSON = ANALYSIS_DIR / "AI_DASHBOARD_CONTEXT.json"
OUTPUT_MD = ANALYSIS_DIR / "AI_DASHBOARD_PROMPT.md"


DASHBOARD_CATEGORY_RULES = {
    "warRoom": ["command", "metrics", "messaging"],
    "messaging": ["messaging", "command"],
    "metrics": ["metrics"],
    "operations": ["operations", "command", "metrics"],
    "fundraising": ["fundraising", "metrics", "messaging"],
    "social": ["social", "messaging", "command"],
}


CARD_CATEGORY_DESCRIPTIONS = {
    "command": "High-level command and control interfaces used to direct activity across the platform.",
    "metrics": "Operational intelligence cards showing totals, progress, health, and performance.",
    "messaging": "Communication tools for SMS, email, templates, activity, and outreach execution.",
    "operations": "Execution-oriented workflow cards such as staffing, queues, assignments, and follow-ups.",
    "fundraising": "Grassroots fundraising and donor management cards.",
    "social": "Social media publishing, response, scheduling, and engagement cards.",
    "intake": "Contact intake, form capture, imports, and scanner cards.",
    "ai": "AI assistants, prompt-driven cards, strategy tools, and automation helpers.",
}


def ensure_analysis_dir():
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)


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
        name = file.stem.replace("Card", "")
        if not name:
            continue

        key = name[0].lower() + name[1:]

        cards.append({
            "key": key,
            "title": name,
            "component": file.stem,
            "category": folder,
            "path": str(rel).replace("\\", "/"),
            "recommendedDashboards": recommended_dashboards_for_category(folder),
        })

    return cards


def recommended_dashboards_for_category(category: str):
    matches = []
    for dashboard_key, categories in DASHBOARD_CATEGORY_RULES.items():
        if category in categories:
            matches.append(dashboard_key)
    return matches


def find_templates():
    templates = []

    if not TEMPLATES_DIR.exists():
        return templates

    for file in sorted(TEMPLATES_DIR.glob("*.template.ts")):
        templates.append({
            "key": file.stem.replace(".template", ""),
            "file": str(file.relative_to(ROOT)).replace("\\", "/"),
        })

    return templates


def find_manifests():
    manifests = []

    if not MANIFESTS_DIR.exists():
        return manifests

    for file in sorted(MANIFESTS_DIR.glob("*.manifest.json")):
        manifests.append({
            "key": file.stem.replace(".manifest", ""),
            "file": str(file.relative_to(ROOT)).replace("\\", "/"),
        })

    return manifests


def build_dashboard_catalog(cards):
    catalog = {}

    for dashboard_key, categories in DASHBOARD_CATEGORY_RULES.items():
        catalog[dashboard_key] = {
            "categories": categories,
            "suggestedCards": [c["key"] for c in cards if c["category"] in categories],
        }

    return catalog


def build_prompt_examples(cards, dashboard_catalog):
    examples = []

    examples.append({
        "userGoal": "Build a War Room dashboard for a statewide campaign.",
        "recommendedDashboard": "warRoom",
        "recommendedCards": dashboard_catalog.get("warRoom", {}).get("suggestedCards", []),
    })

    examples.append({
        "userGoal": "Build a communications dashboard focused on SMS, email, and rapid outreach.",
        "recommendedDashboard": "messaging",
        "recommendedCards": dashboard_catalog.get("messaging", {}).get("suggestedCards", []),
    })

    examples.append({
        "userGoal": "Build a fundraising dashboard for grassroots donor growth and follow-up.",
        "recommendedDashboard": "fundraising",
        "recommendedCards": dashboard_catalog.get("fundraising", {}).get("suggestedCards", []),
    })

    examples.append({
        "userGoal": "Build a social media command center with fast-response content tools.",
        "recommendedDashboard": "social",
        "recommendedCards": dashboard_catalog.get("social", {}).get("suggestedCards", []),
    })

    examples.append({
        "userGoal": "Build a field operations dashboard for captains, organizers, and volunteer execution.",
        "recommendedDashboard": "operations",
        "recommendedCards": dashboard_catalog.get("operations", {}).get("suggestedCards", []),
    })

    return examples


def build_ai_context(cards, templates, manifests):
    dashboard_catalog = build_dashboard_catalog(cards)

    context = {
        "platformIntent": {
            "name": "Civic Operations Platform",
            "mission": "A card-driven campaign and civic command system supporting dashboards, roles, organizations, and future AI-generated operational environments.",
            "architectureMode": "migration_state_platform_build",
        },
        "cardCategories": [
            {
                "key": key,
                "description": desc
            }
            for key, desc in CARD_CATEGORY_DESCRIPTIONS.items()
        ],
        "cards": cards,
        "templates": templates,
        "manifests": manifests,
        "dashboardCatalog": dashboard_catalog,
        "builderRules": {
            "preferRegistryDrivenArchitecture": True,
            "preferCardReuse": True,
            "avoidPageSpecificOneOffs": True,
            "supportLazyLoadedCards": True,
            "supportDashboardTemplates": True,
            "supportVisualDashboardBuilder": True,
            "supportAIGeneratedDashboards": True,
        },
        "promptExamples": build_prompt_examples(cards, dashboard_catalog),
    }

    return context


def write_json(context):
    OUTPUT_JSON.write_text(
        json.dumps(context, indent=2),
        encoding="utf-8"
    )


def write_markdown(context):
    lines = []

    lines.append("# AI Dashboard Prompt Context\n")
    lines.append("This file is generated automatically for AI-assisted dashboard construction.\n")

    lines.append("## Platform Intent\n")
    for k, v in context["platformIntent"].items():
        lines.append(f"- **{k}**: `{v}`")
    lines.append("")

    lines.append("## Card Categories\n")
    for item in context["cardCategories"]:
        lines.append(f"- **{item['key']}**: {item['description']}")
    lines.append("")

    lines.append("## Cards\n")
    if context["cards"]:
        for card in context["cards"]:
            lines.append(
                f"- **{card['key']}** "
                f"(`{card['category']}`) → `{card['path']}` "
                f"| dashboards: {', '.join(card['recommendedDashboards']) if card['recommendedDashboards'] else 'none'}"
            )
    else:
        lines.append("- No cards detected.")
    lines.append("")

    lines.append("## Templates\n")
    if context["templates"]:
        for template in context["templates"]:
            lines.append(f"- **{template['key']}** → `{template['file']}`")
    else:
        lines.append("- No templates detected.")
    lines.append("")

    lines.append("## Manifests\n")
    if context["manifests"]:
        for manifest in context["manifests"]:
            lines.append(f"- **{manifest['key']}** → `{manifest['file']}`")
    else:
        lines.append("- No manifests detected.")
    lines.append("")

    lines.append("## Dashboard Catalog\n")
    for dashboard_key, entry in context["dashboardCatalog"].items():
        lines.append(f"### {dashboard_key}")
        lines.append(f"- categories: {', '.join(entry['categories'])}")
        if entry["suggestedCards"]:
            lines.append(f"- suggestedCards: {', '.join(entry['suggestedCards'])}")
        else:
            lines.append("- suggestedCards: none")
        lines.append("")

    lines.append("## Builder Rules\n")
    for k, v in context["builderRules"].items():
        lines.append(f"- **{k}**: `{v}`")
    lines.append("")

    lines.append("## Prompt Examples\n")
    for example in context["promptExamples"]:
        lines.append(f"### Goal: {example['userGoal']}")
        lines.append(f"- recommendedDashboard: `{example['recommendedDashboard']}`")
        lines.append(
            f"- recommendedCards: {', '.join(example['recommendedCards']) if example['recommendedCards'] else 'none'}"
        )
        lines.append("")

    lines.append("## Suggested AI Usage\n")
    lines.append("- Use this file to recommend dashboards based on user goals.")
    lines.append("- Use card categories and templates to generate layout recommendations.")
    lines.append("- Prefer existing cards before proposing new ones.")
    lines.append("- Keep the system registry-driven and template-based.")
    lines.append("")

    OUTPUT_MD.write_text("\n".join(lines), encoding="utf-8")


def main():
    ensure_analysis_dir()

    print("\nBuilding AI dashboard prompt context...\n")

    cards = find_cards()
    templates = find_templates()
    manifests = find_manifests()

    context = build_ai_context(cards, templates, manifests)

    write_json(context)
    write_markdown(context)

    print(f"Cards detected: {len(cards)}")
    print(f"Templates detected: {len(templates)}")
    print(f"Manifests detected: {len(manifests)}")
    print("\nGenerated:")
    print(f"  - {OUTPUT_JSON}")
    print(f"  - {OUTPUT_MD}")
    print("\nAI dashboard prompt context complete.\n")


if __name__ == "__main__":
    main()