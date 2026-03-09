from __future__ import annotations

import json
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

ROOT = Path(".").resolve()
SRC = ROOT / "app" / "src"
ANALYSIS = ROOT / "analysis"
ANALYSIS.mkdir(exist_ok=True)

CARDS_DIR = SRC / "cards"
DASHBOARDS_DIR = SRC / "dashboards"
SERVICES_ROOT = SRC / "shared" / "utils" / "db" / "services"

TS_EXT = (".ts", ".tsx", ".js", ".jsx")

CARD_IMPORT_RE = re.compile(
    r'import\s+(?:type\s+)?(?:[\w*\s{},]+)\s+from\s+[\"\']([^\"\']+)[\"\']',
    re.MULTILINE,
)

FEATURE_FLAG_TOKENS = [
    "featureFlag",
    "feature_flag",
    "flags.",
    "isEnabled(",
    "enabledFeatures",
]

AI_HINT_TOKENS = [
    "openai",
    "ai",
    "prompt",
    "completion",
    "assistant",
]

ROLE_HINTS = [
    "admin",
    "manager",
    "volunteer",
    "organizer",
    "field",
    "communications",
    "fundraising",
    "data",
    "operations",
]

CATEGORY_ALIASES = {
    "messaging": "messaging",
    "message": "messaging",
    "sms": "messaging",
    "email": "messaging",
    "command": "command",
    "search": "command",
    "metrics": "metrics",
    "analytics": "metrics",
    "operations": "operations",
    "ops": "operations",
    "intake": "intake",
    "contact": "intake",
    "contacts": "operations",
    "follow": "operations",
    "social": "social",
    "fundraising": "fundraising",
    "donation": "fundraising",
    "ai": "ai",
    "event": "operations",
    "calendar": "operations",
}

DASHBOARD_CATEGORY_RULES = {
    "warroom": ["command", "metrics", "messaging", "operations"],
    "fieldops": ["operations", "intake", "metrics", "messaging"],
    "communications": ["messaging", "social", "metrics", "ai"],
    "fundraising": ["fundraising", "metrics", "operations"],
    "intake": ["intake", "operations", "metrics"],
}

OUTPUT_JSON = ANALYSIS / "platform_capability_map.json"
OUTPUT_MD = ANALYSIS / "platform_capability_map.md"
OUTPUT_REGISTRY_JSON = ANALYSIS / "capability_registry_blueprint.json"
OUTPUT_QUEUE_JSON = ANALYSIS / "CAPABILITY_AUTOBUILD_QUEUE.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except Exception:
        return str(path).replace("\\", "/")


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def save_json(path: Path, data: Any) -> None:
    write_text(path, json.dumps(data, indent=2))


def list_files(base: Path, suffixes=TS_EXT) -> List[Path]:
    if not base.exists():
        return []
    out: List[Path] = []
    for suffix in suffixes:
        out.extend(base.rglob(f"*{suffix}"))
    return sorted([p for p in out if p.is_file()])


def title_from_stem(stem: str) -> str:
    raw = stem.replace("Card", "").replace("Page", "")
    raw = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", raw)
    raw = raw.replace("_", " ").replace("-", " ")
    return " ".join(part.capitalize() for part in raw.split())


def kebab_case(name: str) -> str:
    name = name.replace("Card", "").replace("Page", "")
    name = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", name).lower()
    name = name.replace("_", "-").replace(" ", "-")
    name = re.sub(r"-+", "-", name).strip("-")
    return name


def normalize_dashboard_key(path: Path) -> str:
    stem = path.stem.replace(".template", "")
    stem = stem.replace("dashboard", "").replace("Dashboard", "")
    return kebab_case(stem)


def infer_category(path: Path, text: str) -> str:
    pieces = f"{path.name} {rel(path)}".lower()
    for key, value in CATEGORY_ALIASES.items():
        if key in pieces:
            return value

    text_lower = text.lower()
    for key, value in CATEGORY_ALIASES.items():
        if key in text_lower[:4000]:
            return value

    parent = path.parent.name.lower()
    return CATEGORY_ALIASES.get(parent, parent or "general")


def extract_relative_imports(path: Path, text: str) -> List[str]:
    imports: List[str] = []
    for match in CARD_IMPORT_RE.findall(text):
        if match.startswith("."):
            imports.append(match)
    return imports


def resolve_relative_import(source_file: Path, import_path: str) -> Optional[Path]:
    candidate = (source_file.parent / import_path).resolve()
    options = [
        candidate,
        candidate.with_suffix(".ts"),
        candidate.with_suffix(".tsx"),
        candidate.with_suffix(".js"),
        candidate.with_suffix(".jsx"),
        candidate / "index.ts",
        candidate / "index.tsx",
        candidate / "index.js",
        candidate / "index.jsx",
    ]
    for option in options:
        if option.exists() and option.is_file():
            return option
    return None


def detect_feature_flags(text: str) -> List[str]:
    found = []
    lower = text.lower()
    for token in FEATURE_FLAG_TOKENS:
        if token.lower() in lower:
            found.append(token)
    return sorted(set(found))


def detect_ai_enabled(path: Path, text: str) -> bool:
    blob = f"{path.name.lower()} {text.lower()[:4000]}"
    return any(token in blob for token in AI_HINT_TOKENS)


def infer_roles(path: Path, text: str) -> List[str]:
    blob = f"{rel(path).lower()} {text.lower()[:5000]}"
    found = []
    for role in ROLE_HINTS:
        if role in blob:
            found.append(role)
    return sorted(set(found))


def scan_services() -> Dict[str, Dict[str, Any]]:
    services: Dict[str, Dict[str, Any]] = {}
    for path in list_files(SERVICES_ROOT):
        stem = path.stem.replace(".service", "")
        key = kebab_case(stem)
        services[key] = {
            "key": key,
            "title": title_from_stem(path.stem.replace(".service", "")),
            "path": rel(path),
            "consumers": [],
        }
    return services


def detect_service_dependencies(card_path: Path, text: str, services: Dict[str, Dict[str, Any]]) -> List[str]:
    deps: List[str] = []
    lower = text.lower()

    # direct service import detection
    for service in services.values():
        if service["path"] in text:
            deps.append(service["key"])

    # fallback fuzzy name match
    for key, service in services.items():
        raw_name = Path(service["path"]).stem.replace(".service", "").lower()
        if raw_name in lower or f"{key}.service" in lower:
            deps.append(key)

    return sorted(set(deps))


def scan_cards(services: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    cards: Dict[str, Dict[str, Any]] = {}
    for path in list_files(CARDS_DIR):
        if not path.name.endswith("Card.tsx"):
            continue

        text = read_text(path)
        stem = path.stem
        key = kebab_case(stem)
        category = infer_category(path, text)
        feature_flags = detect_feature_flags(text)
        ai_enabled = detect_ai_enabled(path, text)
        roles = infer_roles(path, text)
        service_dependencies = detect_service_dependencies(path, text, services)

        imports = extract_relative_imports(path, text)
        local_dependencies: List[str] = []
        for imp in imports:
            resolved = resolve_relative_import(path, imp)
            if resolved:
                local_dependencies.append(rel(resolved))

        cards[key] = {
            "key": key,
            "title": title_from_stem(stem),
            "component_name": stem,
            "path": rel(path),
            "category": category,
            "service_dependencies": service_dependencies,
            "local_dependencies": sorted(set(local_dependencies)),
            "feature_flags": feature_flags,
            "ai_enabled": ai_enabled,
            "roles": roles,
            "layout_hints": {
                "default_size": "md",
                "default_priority": 50,
            },
            "maturity": "detected",
        }

        for service_key in service_dependencies:
            if service_key in services:
                services[service_key]["consumers"].append(rel(path))

    return cards


def scan_dashboards(cards: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    dashboards: Dict[str, Dict[str, Any]] = {}
    for path in list_files(DASHBOARDS_DIR):
        if "template" not in path.name.lower() and "dashboard" not in path.name.lower():
            continue

        text = read_text(path)
        key = normalize_dashboard_key(path)

        compatible_categories: List[str] = []
        if key in DASHBOARD_CATEGORY_RULES:
            compatible_categories = DASHBOARD_CATEGORY_RULES[key]
        else:
            path_blob = f"{path.name} {rel(path)}".lower()
            for alias, category in CATEGORY_ALIASES.items():
                if alias in path_blob and category not in compatible_categories:
                    compatible_categories.append(category)

        compatible_cards = [
            card["key"]
            for card in cards.values()
            if card["category"] in compatible_categories
        ]

        dashboards[key] = {
            "key": key,
            "title": title_from_stem(path.stem.replace(".template", "")),
            "path": rel(path),
            "compatible_categories": compatible_categories,
            "compatible_cards": sorted(set(compatible_cards)),
        }
    return dashboards


def build_capabilities(cards: Dict[str, Dict[str, Any]], dashboards: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    capabilities: Dict[str, Dict[str, Any]] = {}

    for card in cards.values():
        cap_key = card["key"]
        compatible_dashboards = [
            dash["key"]
            for dash in dashboards.values()
            if cap_key in dash["compatible_cards"]
        ]

        capabilities[cap_key] = {
            "key": cap_key,
            "title": card["title"],
            "category": card["category"],
            "card_component": card["component_name"],
            "card_path": card["path"],
            "service_dependencies": card["service_dependencies"],
            "supported_roles": card["roles"],
            "compatible_dashboards": compatible_dashboards,
            "ai_enabled": card["ai_enabled"],
            "feature_flags": card["feature_flags"],
            "layout_hints": card["layout_hints"],
            "maturity": card["maturity"],
        }

    return capabilities


def build_registry_blueprint(
    cards: Dict[str, Dict[str, Any]],
    dashboards: Dict[str, Dict[str, Any]],
    capabilities: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    return {
        "generated_at": now_iso(),
        "card_registry_blueprint": [
            {
                "key": card["key"],
                "component_name": card["component_name"],
                "import_path": card["path"],
                "category": card["category"],
            }
            for card in sorted(cards.values(), key=lambda x: x["key"])
        ],
        "dashboard_registry_blueprint": [
            {
                "key": dash["key"],
                "title": dash["title"],
                "template_path": dash["path"],
                "compatible_cards": dash["compatible_cards"],
            }
            for dash in sorted(dashboards.values(), key=lambda x: x["key"])
        ],
        "feature_registry_blueprint": [
            {
                "key": capability["key"],
                "category": capability["category"],
                "feature_flags": capability["feature_flags"],
                "ai_enabled": capability["ai_enabled"],
            }
            for capability in sorted(capabilities.values(), key=lambda x: x["key"])
        ],
    }


def build_autobuild_queue(
    cards: Dict[str, Dict[str, Any]],
    dashboards: Dict[str, Dict[str, Any]],
    services: Dict[str, Dict[str, Any]],
    capabilities: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    missing_service_cards = [
        card["path"] for card in cards.values() if not card["service_dependencies"]
    ]
    orphan_services = [
        service["path"] for service in services.values() if not service["consumers"]
    ]
    cards_without_dashboards = [
        capability["card_path"]
        for capability in capabilities.values()
        if not capability["compatible_dashboards"]
    ]

    next_actions = []
    if missing_service_cards:
        next_actions.append({
            "priority": 1,
            "task": "Attach cards to service layer",
            "targets": missing_service_cards[:10],
            "why": "Self-building cards should depend on services, not direct infra calls.",
        })
    if cards_without_dashboards:
        next_actions.append({
            "priority": 2,
            "task": "Map uncategorized cards into dashboard compositions",
            "targets": cards_without_dashboards[:10],
            "why": "Capabilities need dashboard destinations to be automatically assembled.",
        })
    if orphan_services:
        next_actions.append({
            "priority": 3,
            "task": "Review orphan services for attachment or removal",
            "targets": orphan_services[:10],
            "why": "Unused services create noise in the capability system.",
        })

    return {
        "generated_at": now_iso(),
        "summary": {
            "cards_total": len(cards),
            "dashboards_total": len(dashboards),
            "services_total": len(services),
            "capabilities_total": len(capabilities),
        },
        "next_actions": next_actions,
    }


def write_markdown(
    cards: Dict[str, Dict[str, Any]],
    dashboards: Dict[str, Dict[str, Any]],
    services: Dict[str, Dict[str, Any]],
    capabilities: Dict[str, Dict[str, Any]],
) -> None:
    lines: List[str] = []
    lines.append("# Platform Capability Map\n")
    lines.append(f"**Generated:** `{now_iso()}`\n")

    lines.append("## Summary\n")
    lines.append(f"- **Cards detected:** `{len(cards)}`")
    lines.append(f"- **Dashboards detected:** `{len(dashboards)}`")
    lines.append(f"- **Services detected:** `{len(services)}`")
    lines.append(f"- **Capabilities generated:** `{len(capabilities)}`")
    lines.append("")

    lines.append("## Capabilities\n")
    if not capabilities:
        lines.append("- No capabilities detected.\n")
    else:
        for cap in sorted(capabilities.values(), key=lambda x: x["key"]):
            lines.append(f"### {cap['title']} (`{cap['key']}`)")
            lines.append(f"- **Category:** `{cap['category']}`")
            lines.append(f"- **Card component:** `{cap['card_component']}`")
            lines.append(f"- **Card path:** `{cap['card_path']}`")
            lines.append(f"- **AI enabled:** `{cap['ai_enabled']}`")
            lines.append(f"- **Service dependencies:** {', '.join(cap['service_dependencies']) if cap['service_dependencies'] else 'None detected'}")
            lines.append(f"- **Supported roles:** {', '.join(cap['supported_roles']) if cap['supported_roles'] else 'None detected'}")
            lines.append(f"- **Compatible dashboards:** {', '.join(cap['compatible_dashboards']) if cap['compatible_dashboards'] else 'None detected'}")
            lines.append(f"- **Feature flags:** {', '.join(cap['feature_flags']) if cap['feature_flags'] else 'None detected'}")
            lines.append("")

    lines.append("## Dashboards\n")
    if not dashboards:
        lines.append("- No dashboards detected.\n")
    else:
        for dash in sorted(dashboards.values(), key=lambda x: x["key"]):
            lines.append(f"### {dash['title']} (`{dash['key']}`)")
            lines.append(f"- **Path:** `{dash['path']}`")
            lines.append(f"- **Compatible categories:** {', '.join(dash['compatible_categories']) if dash['compatible_categories'] else 'None detected'}")
            lines.append(f"- **Compatible cards:** {', '.join(dash['compatible_cards']) if dash['compatible_cards'] else 'None detected'}")
            lines.append("")

    lines.append("## Services\n")
    if not services:
        lines.append("- No services detected.\n")
    else:
        for service in sorted(services.values(), key=lambda x: x["key"]):
            lines.append(f"### {service['title']} (`{service['key']}`)")
            lines.append(f"- **Path:** `{service['path']}`")
            lines.append(f"- **Consumers:** {', '.join(sorted(set(service['consumers']))) if service['consumers'] else 'None detected'}")
            lines.append("")

    write_text(OUTPUT_MD, "\n".join(lines))


def main() -> None:
    print("\n" + "=" * 72)
    print(" CAPABILITY REGISTRY BUILDER ")
    print("=" * 72)
    print("Purpose:")
    print("Build a structured capability map from cards, dashboards, and services.")
    print("=" * 72 + "\n")

    services = scan_services()
    cards = scan_cards(services)
    dashboards = scan_dashboards(cards)
    capabilities = build_capabilities(cards, dashboards)

    registry_blueprint = build_registry_blueprint(cards, dashboards, capabilities)
    autobuild_queue = build_autobuild_queue(cards, dashboards, services, capabilities)

    payload = {
        "generated_at": now_iso(),
        "cards": cards,
        "dashboards": dashboards,
        "services": services,
        "capabilities": capabilities,
    }

    save_json(OUTPUT_JSON, payload)
    save_json(OUTPUT_REGISTRY_JSON, registry_blueprint)
    save_json(OUTPUT_QUEUE_JSON, autobuild_queue)
    write_markdown(cards, dashboards, services, capabilities)

    print("Reports written:")
    print(f" - {rel(OUTPUT_JSON)}")
    print(f" - {rel(OUTPUT_MD)}")
    print(f" - {rel(OUTPUT_REGISTRY_JSON)}")
    print(f" - {rel(OUTPUT_QUEUE_JSON)}")
    print("")


if __name__ == "__main__":
    main()
