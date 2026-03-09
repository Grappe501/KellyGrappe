from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List

ROOT = Path(".").resolve()
ANALYSIS = ROOT / "analysis"
SRC = ROOT / "app" / "src"

CAPABILITY_FILE = ANALYSIS / "platform_capability_map.json"
BLUEPRINTS_FILE = ANALYSIS / "dashboard_blueprints.json"

PLATFORM_REGISTRY_DIR = SRC / "platform" / "registry"
PLATFORM_TYPES_DIR = SRC / "platform" / "types"

OUTPUT_REPORT_MD = ANALYSIS / "registry_builder_report.md"
OUTPUT_PLAN_JSON = ANALYSIS / "REGISTRY_AUTOBUILD_QUEUE.json"

CARD_REGISTRY = PLATFORM_REGISTRY_DIR / "card.registry.ts"
DASHBOARD_REGISTRY = PLATFORM_REGISTRY_DIR / "dashboard.registry.ts"
FEATURE_REGISTRY = PLATFORM_REGISTRY_DIR / "feature.registry.ts"
ROLE_REGISTRY = PLATFORM_REGISTRY_DIR / "role.registry.ts"
MICROROOM_REGISTRY = PLATFORM_REGISTRY_DIR / "microroom.registry.ts"
ORGANIZATION_REGISTRY = PLATFORM_REGISTRY_DIR / "organization.registry.ts"
REGISTRY_INDEX = PLATFORM_REGISTRY_DIR / "index.ts"
ORG_TYPES = PLATFORM_TYPES_DIR / "organization.types.ts"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def save_json(path: Path, data: Any) -> None:
    write_text(path, json.dumps(data, indent=2))


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except Exception:
        return str(path).replace("\\", "/")


def load_inputs() -> Dict[str, Any]:
    if not CAPABILITY_FILE.exists():
        raise RuntimeError("analysis/platform_capability_map.json not found. Run capability_registry_builder.py first.")
    if not BLUEPRINTS_FILE.exists():
        raise RuntimeError("analysis/dashboard_blueprints.json not found. Run dashboard_composer.py first.")

    capability_map = read_json(CAPABILITY_FILE)
    blueprints = read_json(BLUEPRINTS_FILE)

    return {
        "capabilities": capability_map.get("capabilities", {}),
        "cards": capability_map.get("cards", {}),
        "dashboards": blueprints,
    }


def component_import_path(path_str: str) -> str:
    return path_str.replace("app/src/", "@/").replace(".tsx", "").replace(".ts", "")


def build_card_registry(cards: Dict[str, Dict[str, Any]]) -> str:
    imports: List[str] = []
    entries: List[str] = []

    for card in sorted(cards.values(), key=lambda x: x["key"]):
        imports.append('import {component} from "{import_path}";'.format(
            component=card["component_name"],
            import_path=component_import_path(card["path"]),
        ))
        entries.append(
            '  "{key}": {{\n'
            '    key: "{key}",\n'
            '    title: "{title}",\n'
            '    category: "{category}",\n'
            '    component: {component},\n'
            '    aiEnabled: {ai_enabled},\n'
            '    featureFlags: {feature_flags},\n'
            '    serviceDependencies: {service_dependencies},\n'
            '  }},'.format(
                key=card["key"],
                title=card["title"],
                category=card["category"],
                component=card["component_name"],
                ai_enabled=str(card.get("ai_enabled", False)).lower(),
                feature_flags=json.dumps(card.get("feature_flags", [])),
                service_dependencies=json.dumps(card.get("service_dependencies", [])),
            )
        )

    return "\n".join(imports) + "\n\nexport const cardRegistry = {\n" + "\n".join(entries) + "\n} as const;\n\nexport default cardRegistry;\n"


def build_dashboard_registry(dashboards: Dict[str, Dict[str, Any]]) -> str:
    entries: List[str] = []

    for key in sorted(dashboards.keys()):
        dash = dashboards[key]
        entries.append(
            '  "{key}": {{\n'
            '    key: "{key}",\n'
            '    title: "{title}",\n'
            '    categories: {categories},\n'
            '    cards: {cards},\n'
            '  }},'.format(
                key=key,
                title=dash["title"],
                categories=json.dumps(dash.get("categories", [])),
                cards=json.dumps(dash.get("cards", [])),
            )
        )

    return "export const dashboardRegistry = {\n" + "\n".join(entries) + "\n} as const;\n\nexport default dashboardRegistry;\n"


def build_feature_registry(capabilities: Dict[str, Dict[str, Any]]) -> str:
    entries: List[str] = []

    for key in sorted(capabilities.keys()):
        cap = capabilities[key]
        entries.append(
            '  "{key}": {{\n'
            '    key: "{key}",\n'
            '    category: "{category}",\n'
            '    enabledByDefault: true,\n'
            '    aiEnabled: {ai_enabled},\n'
            '    flags: {flags},\n'
            '  }},'.format(
                key=key,
                category=cap["category"],
                ai_enabled=str(cap.get("ai_enabled", False)).lower(),
                flags=json.dumps(cap.get("feature_flags", [])),
            )
        )

    return "export const featureRegistry = {\n" + "\n".join(entries) + "\n} as const;\n\nexport default featureRegistry;\n"


def collect_roles(capabilities: Dict[str, Dict[str, Any]]) -> Dict[str, List[str]]:
    roles_to_caps: Dict[str, List[str]] = {}
    for key, cap in capabilities.items():
        roles = cap.get("supported_roles") or ["admin", "operations"]
        for role in roles:
            roles_to_caps.setdefault(role, []).append(key)

    return {role: sorted(set(keys)) for role, keys in sorted(roles_to_caps.items(), key=lambda x: x[0])}


def build_role_registry(capabilities: Dict[str, Dict[str, Any]], dashboards: Dict[str, Dict[str, Any]]) -> str:
    roles_to_caps = collect_roles(capabilities)
    entries: List[str] = []

    for role in sorted(roles_to_caps.keys()):
        matching_dashboards = []
        for dash_key, dash in dashboards.items():
            if set(roles_to_caps[role]).intersection(set(dash.get("cards", []))):
                matching_dashboards.append(dash_key)

        entries.append(
            '  "{role}": {{\n'
            '    key: "{role}",\n'
            '    capabilities: {capabilities},\n'
            '    dashboards: {dashboards},\n'
            '  }},'.format(
                role=role,
                capabilities=json.dumps(roles_to_caps[role]),
                dashboards=json.dumps(sorted(set(matching_dashboards))),
            )
        )

    return "export const roleRegistry = {\n" + "\n".join(entries) + "\n} as const;\n\nexport default roleRegistry;\n"


def build_microroom_registry(dashboards: Dict[str, Dict[str, Any]]) -> str:
    presets = {
        "campaign-hq": ["war-room", "communications", "data-intelligence"],
        "field-ops": ["field-operations", "war-room"],
        "engagement-hub": ["communications", "field-operations"],
        "fundraising-hub": ["fundraising", "data-intelligence"],
    }

    entries: List[str] = []
    for key, dash_list in presets.items():
        valid_dashboards = [dash for dash in dash_list if dash in dashboards]
        entries.append(
            '  "{key}": {{\n'
            '    key: "{key}",\n'
            '    dashboards: {dashboards},\n'
            '  }},'.format(
                key=key,
                dashboards=json.dumps(valid_dashboards),
            )
        )

    return "export const microroomRegistry = {\n" + "\n".join(entries) + "\n} as const;\n\nexport default microroomRegistry;\n"


def build_org_types() -> str:
    return '''export type DataBoundaryMode = "tenant_row_isolation" | "shared_reference" | "shared_intelligence";

export type SharedLearningPolicy =
  | "isolated_org_records_shared_scores"
  | "isolated_org_records_no_shared_scores";

export interface OrganizationDataBoundary {
  tenantKey: "organization_id";
  crmMode: "isolated_per_organization";
  volunteerMode: "isolated_per_organization";
  notesMode: "isolated_per_organization";
  donorMode: "isolated_per_organization";
  voterReferenceMode: "shared_reference";
  voterIntelligenceMode: "shared_intelligence";
  sharedLearningPolicy: SharedLearningPolicy;
}

export interface OrganizationDefinition {
  key: string;
  title: string;
  orgType: "campaign" | "nonprofit" | "advocacy" | "media" | "movement";
  defaultRoles: string[];
  defaultDashboards: string[];
  enabledMicrorooms: string[];
  dataBoundary: OrganizationDataBoundary;
}
'''


def build_organization_registry() -> str:
    boundary = '''{
    tenantKey: "organization_id",
    crmMode: "isolated_per_organization",
    volunteerMode: "isolated_per_organization",
    notesMode: "isolated_per_organization",
    donorMode: "isolated_per_organization",
    voterReferenceMode: "shared_reference",
    voterIntelligenceMode: "shared_intelligence",
    sharedLearningPolicy: "isolated_org_records_shared_scores",
  }'''

    return '''import type { OrganizationDefinition } from "@/platform/types/organization.types";

export const organizationRegistry: Record<string, OrganizationDefinition> = {
  campaign: {
    key: "campaign",
    title: "Campaign Organization",
    orgType: "campaign",
    defaultRoles: ["admin", "operations", "field", "communications", "fundraising"],
    defaultDashboards: ["war-room", "field-operations", "communications", "fundraising"],
    enabledMicrorooms: ["campaign-hq", "field-ops", "fundraising-hub"],
    dataBoundary: %s,
  },
  nonprofit: {
    key: "nonprofit",
    title: "Nonprofit Organization",
    orgType: "nonprofit",
    defaultRoles: ["admin", "operations", "organizer", "communications"],
    defaultDashboards: ["communications", "field-operations", "data-intelligence"],
    enabledMicrorooms: ["engagement-hub", "field-ops"],
    dataBoundary: %s,
  },
  advocacy: {
    key: "advocacy",
    title: "Advocacy Organization",
    orgType: "advocacy",
    defaultRoles: ["admin", "organizer", "communications", "data"],
    defaultDashboards: ["communications", "field-operations", "data-intelligence"],
    enabledMicrorooms: ["engagement-hub", "campaign-hq"],
    dataBoundary: %s,
  },
  media: {
    key: "media",
    title: "Media Organization",
    orgType: "media",
    defaultRoles: ["admin", "communications", "operations"],
    defaultDashboards: ["communications", "data-intelligence"],
    enabledMicrorooms: ["engagement-hub"],
    dataBoundary: %s,
  },
  movement: {
    key: "movement",
    title: "Movement Organization",
    orgType: "movement",
    defaultRoles: ["admin", "organizer", "field", "communications"],
    defaultDashboards: ["war-room", "communications", "field-operations"],
    enabledMicrorooms: ["campaign-hq", "engagement-hub", "field-ops"],
    dataBoundary: %s,
  },
};

export default organizationRegistry;
''' % (boundary, boundary, boundary, boundary, boundary)


def build_registry_index() -> str:
    return '''export * from "./card.registry";
export * from "./dashboard.registry";
export * from "./feature.registry";
export * from "./role.registry";
export * from "./microroom.registry";
export * from "./organization.registry";
'''


def build_queue(cards: Dict[str, Dict[str, Any]], capabilities: Dict[str, Dict[str, Any]], dashboards: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    cards_without_services = [card["path"] for card in cards.values() if not card.get("service_dependencies")]
    capabilities_without_roles = [key for key, cap in capabilities.items() if not cap.get("supported_roles")]
    dashboards_without_cards = [key for key, dash in dashboards.items() if not dash.get("cards")]

    actions: List[Dict[str, Any]] = []

    if cards_without_services:
        actions.append({
            "priority": 1,
            "task": "Attach cards to service layer",
            "targets": cards_without_services[:20],
            "why": "Generated registries are strongest when every card is service-backed.",
        })

    if capabilities_without_roles:
        actions.append({
            "priority": 2,
            "task": "Refine capability-to-role mapping",
            "targets": capabilities_without_roles[:20],
            "why": "Missing role metadata weakens organization-aware dashboard assignment.",
        })

    if dashboards_without_cards:
        actions.append({
            "priority": 3,
            "task": "Populate empty dashboards with capability-backed cards",
            "targets": dashboards_without_cards[:20],
            "why": "Dashboard registries should describe real operational workspaces.",
        })

    actions.append({
        "priority": 4,
        "task": "Implement tenant-enforced services using organization_id",
        "targets": [
            "app/src/shared/utils/db/services",
            "app/src/platform/registry/organization.registry.ts",
            "app/src/platform/types/organization.types.ts",
        ],
        "why": "Move forward with row-level tenant isolation and shared voter intelligence boundaries.",
    })

    return {
        "generated_at": now_iso(),
        "next_actions": actions,
    }


def write_report(cards: Dict[str, Dict[str, Any]], capabilities: Dict[str, Dict[str, Any]], dashboards: Dict[str, Dict[str, Any]]) -> None:
    lines: List[str] = []
    lines.append("# Registry Builder Report\n")
    lines.append(f"**Generated:** `{now_iso()}`\n")

    lines.append("## Registries Written\n")
    for path in [
        CARD_REGISTRY,
        DASHBOARD_REGISTRY,
        FEATURE_REGISTRY,
        ROLE_REGISTRY,
        MICROROOM_REGISTRY,
        ORGANIZATION_REGISTRY,
        REGISTRY_INDEX,
        ORG_TYPES,
    ]:
        lines.append(f"- `{rel(path)}`")
    lines.append("")

    lines.append("## Summary\n")
    lines.append(f"- **Cards:** `{len(cards)}`")
    lines.append(f"- **Capabilities:** `{len(capabilities)}`")
    lines.append(f"- **Dashboards:** `{len(dashboards)}`")
    lines.append("- **Organization data model:** `tenant_row_isolation + shared_reference + shared_intelligence`")
    lines.append("- **Tenant boundary key:** `organization_id`")
    lines.append("")

    lines.append("## Architectural Decision Applied\n")
    lines.append("- Operational CRM, notes, volunteers, donors, followups, and messages are modeled as organization-isolated data.")
    lines.append("- Voter reference data is modeled as shared reference data.")
    lines.append("- Voter intelligence is modeled as shared intelligence with isolated raw org records and shared scores.")
    lines.append("")

    write_text(OUTPUT_REPORT_MD, "\n".join(lines))


def main() -> None:
    print("\n" + "=" * 72)
    print(" REGISTRY BUILDER ")
    print("=" * 72)
    print("Purpose:")
    print("Generate platform registries and apply the organization-aware data boundary model.")
    print("=" * 72 + "\n")

    payload = load_inputs()
    capabilities = payload["capabilities"]
    cards = payload["cards"]
    dashboards = payload["dashboards"]

    write_text(CARD_REGISTRY, build_card_registry(cards))
    write_text(DASHBOARD_REGISTRY, build_dashboard_registry(dashboards))
    write_text(FEATURE_REGISTRY, build_feature_registry(capabilities))
    write_text(ROLE_REGISTRY, build_role_registry(capabilities, dashboards))
    write_text(MICROROOM_REGISTRY, build_microroom_registry(dashboards))
    write_text(ORG_TYPES, build_org_types())
    write_text(ORGANIZATION_REGISTRY, build_organization_registry())
    write_text(REGISTRY_INDEX, build_registry_index())

    queue = build_queue(cards, capabilities, dashboards)
    save_json(OUTPUT_PLAN_JSON, queue)
    write_report(cards, capabilities, dashboards)

    print("Files written:")
    print(f" - {rel(CARD_REGISTRY)}")
    print(f" - {rel(DASHBOARD_REGISTRY)}")
    print(f" - {rel(FEATURE_REGISTRY)}")
    print(f" - {rel(ROLE_REGISTRY)}")
    print(f" - {rel(MICROROOM_REGISTRY)}")
    print(f" - {rel(ORGANIZATION_REGISTRY)}")
    print(f" - {rel(REGISTRY_INDEX)}")
    print(f" - {rel(ORG_TYPES)}")
    print(f" - {rel(OUTPUT_REPORT_MD)}")
    print(f" - {rel(OUTPUT_PLAN_JSON)}")
    print("")


if __name__ == "__main__":
    main()
