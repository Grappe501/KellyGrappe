
from __future__ import annotations

import json
import re
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List

ROOT = Path(".").resolve()
ANALYSIS = ROOT / "analysis"
SRC = ROOT / "app" / "src"
CARDS_DIR = SRC / "cards"

CAPABILITY_FILE = ANALYSIS / "platform_capability_map.json"
BLUEPRINTS_FILE = ANALYSIS / "dashboard_blueprints.json"

OUTPUT_LOG_JSON = ANALYSIS / "generated_cards_log.json"
OUTPUT_REPORT_MD = ANALYSIS / "generated_cards_report.md"
OUTPUT_QUEUE_JSON = ANALYSIS / "CARD_SCAFFOLD_AUTOBUILD_QUEUE.json"

CARD_REGISTRY_FILE = SRC / "cards" / "registry.ts"

CATEGORY_FOLDER_MAP = {
    "command": "command",
    "messaging": "messaging",
    "metrics": "metrics",
    "operations": "operations",
    "social": "social",
    "fundraising": "fundraising",
    "intake": "intake",
    "ai": "ai",
}

SERVICE_IMPORT_ROOT = "@/shared/utils/db/services"
COMPONENT_SANITIZE_RE = re.compile(r"[^A-Za-z0-9]+")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def kebab_to_pascal(value: str) -> str:
    parts = [p for p in COMPONENT_SANITIZE_RE.split(value) if p]
    return "".join(part[:1].upper() + part[1:] for part in parts)


def infer_card_path(capability: Dict[str, Any]) -> Path:
    category = capability.get("category") or "operations"
    folder = CATEGORY_FOLDER_MAP.get(category, category)
    component_name = capability.get("card_component") or f"{kebab_to_pascal(capability['key'])}Card"
    if not component_name.endswith("Card"):
        component_name += "Card"
    return CARDS_DIR / folder / f"{component_name}.tsx"


def build_service_imports(capability: Dict[str, Any]) -> List[Dict[str, str]]:
    imports: List[Dict[str, str]] = []
    for service_key in capability.get("service_dependencies", []):
        service_file = service_key.replace("-", ".") + ".service"
        service_var = service_key.replace("-", "_") + "_service"
        imports.append(
            {
                "import_path": f"{SERVICE_IMPORT_ROOT}/{service_file}",
                "var_name": service_var,
                "service_key": service_key,
            }
        )
    return imports


def build_card_source(capability: Dict[str, Any]) -> str:
    component_name = capability.get("card_component") or f"{kebab_to_pascal(capability['key'])}Card"
    if not component_name.endswith("Card"):
        component_name += "Card"

    title = capability.get("title") or capability["key"].replace("-", " ").title()
    category = capability.get("category") or "operations"
    ai_enabled = "true" if capability.get("ai_enabled", False) else "false"
    service_imports = build_service_imports(capability)

    import_lines = ['import React from "react";']
    for item in service_imports:
        import_lines.append(f'import * as {item["var_name"]} from "{item["import_path"]}";')

    service_notes = []
    if service_imports:
        for item in service_imports:
            service_notes.append(
                f'            <li><code>{item["service_key"]}</code> via <code>{item["import_path"]}</code></li>'
            )
    else:
        service_notes.append("            <li>No service dependency detected yet</li>")

    feature_flags_text = ", ".join(capability.get("feature_flags", [])) or "none-detected"
    roles_text = ", ".join(capability.get("supported_roles", [])) or "none-detected"
    dashboards_text = ", ".join(capability.get("compatible_dashboards", [])) or "none-detected"

    content = f"""
{chr(10).join(import_lines)}

type {component_name}Props = {{
  workspaceId?: string;
  organizationId?: string;
}};

export default function {component_name}({{ workspaceId, organizationId }}: {component_name}Props) {{
  const capabilityKey = "{capability["key"]}";
  const category = "{category}";
  const aiEnabled = {ai_enabled};

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <header className="mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-slate-600">
          Auto-generated capability card scaffold for <code>{{capabilityKey}}</code>.
        </p>
      </header>

      <div className="space-y-3 text-sm">
        <div>
          <strong>Category:</strong> <code>{{category}}</code>
        </div>

        <div>
          <strong>AI enabled:</strong> <code>{{String(aiEnabled)}}</code>
        </div>

        <div>
          <strong>Workspace:</strong> <code>{{workspaceId ?? "unbound"}}</code>
        </div>

        <div>
          <strong>Organization:</strong> <code>{{organizationId ?? "unbound"}}</code>
        </div>

        <div>
          <strong>Supported roles:</strong> <code>{roles_text}</code>
        </div>

        <div>
          <strong>Compatible dashboards:</strong> <code>{dashboards_text}</code>
        </div>

        <div>
          <strong>Feature flags:</strong> <code>{feature_flags_text}</code>
        </div>

        <div>
          <strong>Service dependencies</strong>
          <ul className="ml-5 list-disc">
{chr(10).join(service_notes)}
          </ul>
        </div>
      </div>
    </section>
  );
}}
"""
    return content.strip() + "\n"


def build_registry_source(card_files: List[Path]) -> str:
    entries = []
    imports = []

    normalized_cards = sorted(card_files, key=lambda p: str(p).lower())

    for path in normalized_cards:
        component_name = path.stem
        rel_path = path.relative_to(CARDS_DIR).with_suffix("")
        import_path = "./" + str(rel_path).replace("\\", "/")
        imports.append(f'import {component_name} from "{import_path}";')
        key = re.sub(r"Card$", "", component_name)
        key = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", key).lower()
        entries.append(f'  "{key}": {component_name},')

    return (
        "\n".join(imports)
        + "\n\nexport const cardRegistry = {\n"
        + "\n".join(entries)
        + "\n};\n\nexport default cardRegistry;\n"
    )


def discover_existing_card_paths() -> List[Path]:
    if not CARDS_DIR.exists():
        return []
    return sorted([p for p in CARDS_DIR.rglob("*Card.tsx") if p.is_file()])


def find_missing_capabilities(capability_map: Dict[str, Any], blueprints: Dict[str, Any]) -> List[Dict[str, Any]]:
    capabilities = capability_map.get("capabilities", {})
    referenced = set()

    for dashboard in blueprints.values():
        for card_key in dashboard.get("cards", []):
            referenced.add(card_key)

    missing: List[Dict[str, Any]] = []
    for key in sorted(referenced):
        capability = capabilities.get(key)
        if not capability:
            continue

        target_path = infer_card_path(capability)
        if not target_path.exists():
            missing.append(
                {
                    "key": key,
                    "capability": capability,
                    "target_path": str(target_path),
                }
            )
    return missing


def write_generated_cards(missing: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    generated: List[Dict[str, Any]] = []

    for item in missing:
        capability = item["capability"]
        target_path = Path(item["target_path"])
        source = build_card_source(capability)
        write_text(target_path, source)
        generated.append(
            {
                "key": item["key"],
                "path": str(target_path),
                "category": capability.get("category"),
                "service_dependencies": capability.get("service_dependencies", []),
            }
        )

    return generated


def update_registry() -> Dict[str, Any]:
    card_files = discover_existing_card_paths()
    registry_source = build_registry_source(card_files)
    write_text(CARD_REGISTRY_FILE, registry_source)

    return {
        "registry_path": str(CARD_REGISTRY_FILE),
        "registered_cards_total": len(card_files),
        "registered_card_files": [str(p) for p in card_files],
    }


def build_queue(missing: List[Dict[str, Any]], generated: List[Dict[str, Any]]) -> Dict[str, Any]:
    remaining_service_wiring = [
        g["path"] for g in generated if not g.get("service_dependencies")
    ]

    next_actions: List[Dict[str, Any]] = []

    if remaining_service_wiring:
        next_actions.append(
            {
                "priority": 1,
                "task": "Attach generated cards to concrete service methods",
                "targets": remaining_service_wiring[:20],
                "why": "Scaffolds were created, but some cards still need real service integration.",
            }
        )

    if missing:
        next_actions.append(
            {
                "priority": 2,
                "task": "Review generated card UI shells for workflow-specific layout needs",
                "targets": [m["target_path"] for m in missing][:20],
                "why": "Generated cards are clean shells and may need domain-specific rendering details.",
            }
        )

    return {
        "generated_at": now_iso(),
        "next_actions": next_actions,
    }


def write_report(missing: List[Dict[str, Any]], generated: List[Dict[str, Any]], registry_info: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append("# Generated Cards Report\n")
    lines.append(f"**Generated:** `{now_iso()}`\n")

    lines.append("## Summary\n")
    lines.append(f"- **Missing dashboard-required cards detected:** `{len(missing)}`")
    lines.append(f"- **Cards generated:** `{len(generated)}`")
    lines.append(f"- **Registry updated:** `{registry_info['registry_path']}`")
    lines.append(f"- **Registered cards total:** `{registry_info['registered_cards_total']}`")
    lines.append("")

    lines.append("## Generated Cards\n")
    if not generated:
        lines.append("- No cards were generated.\n")
    else:
        for item in generated:
            lines.append(f"### {item['key']}")
            lines.append(f"- **Path:** `{item['path']}`")
            lines.append(f"- **Category:** `{item['category']}`")
            lines.append(
                f"- **Service dependencies:** {', '.join(item['service_dependencies']) if item['service_dependencies'] else 'None detected'}"
            )
            lines.append("")

    write_text(OUTPUT_REPORT_MD, "\n".join(lines))


def main() -> None:
    print("\n" + "=" * 72)
    print(" CARD SCAFFOLD GENERATOR ")
    print("=" * 72)
    print("Purpose:")
    print("Generate missing dashboard-required cards from capability metadata and update the card registry.")
    print("=" * 72 + "\n")

    if not CAPABILITY_FILE.exists():
        raise RuntimeError("analysis/platform_capability_map.json not found. Run capability_registry_builder.py first.")

    if not BLUEPRINTS_FILE.exists():
        raise RuntimeError("analysis/dashboard_blueprints.json not found. Run dashboard_composer.py first.")

    capability_map = load_json(CAPABILITY_FILE)
    blueprints = load_json(BLUEPRINTS_FILE)

    missing = find_missing_capabilities(capability_map, blueprints)
    generated = write_generated_cards(missing)
    registry_info = update_registry()
    queue = build_queue(missing, generated)

    save_json(OUTPUT_LOG_JSON, {
        "generated_at": now_iso(),
        "missing_detected": len(missing),
        "generated": generated,
        "registry": registry_info,
    })
    save_json(OUTPUT_QUEUE_JSON, queue)
    write_report(missing, generated, registry_info)

    print("Reports written:")
    print(f" - {OUTPUT_LOG_JSON}")
    print(f" - {OUTPUT_REPORT_MD}")
    print(f" - {OUTPUT_QUEUE_JSON}")
    print(f" - {CARD_REGISTRY_FILE}")
    print("")


if __name__ == "__main__":
    main()
