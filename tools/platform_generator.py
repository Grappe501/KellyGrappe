import sys
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SRC = ROOT / "app" / "src"
MODULES_DIR = SRC / "modules"
CARDS_DIR = SRC / "cards"
SERVICES_DIR = SRC / "shared" / "utils" / "db" / "services"
PLATFORM_AI_DIR = SRC / "platform" / "ai"
PLATFORM_DASHBOARD_DIR = SRC / "platform" / "dashboard" / "templates"


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def to_kebab_case(value: str) -> str:
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", value)
    value = re.sub(r"[_\s]+", "-", value)
    return value.lower().strip("-")


def to_pascal_case(value: str) -> str:
    parts = re.split(r"[_\-\s]+", value)
    return "".join(p.capitalize() for p in parts if p)


def write_file(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def abort_if_exists(path: Path, label: str):
    if path.exists():
        print(f"{label} already exists: {path}")
        sys.exit(1)


# --------------------------------------------------
# Templates
# NOTE: double braces {{ }} required for TS imports
# --------------------------------------------------

MODULE_INDEX_TEMPLATE = """import {{ FeatureRegistry }} from "@platform/registry/feature.registry"

export function registerModule() {{
  if (!FeatureRegistry.has("{feature_key}")) {{
    FeatureRegistry.register({{
      key: "{feature_key}",
      title: "{title}",
      route: "/{route}",
      category: "module",
      enabledByDefault: true,
      aiEnabled: true,
      flags: []
    }})
  }}
}}

registerModule()

export default registerModule
"""


MODULE_PAGE_TEMPLATE = """import React from "react"
import Container from "@components/Container"
import {{ Card, CardContent, CardHeader }} from "@components/Card"

export default function {component_name}() {{
  return (
    <Container>
      <Card>
        <CardHeader title="{title}" subtitle="Generated module page" />
        <CardContent>
          <p>{description}</p>
        </CardContent>
      </Card>
    </Container>
  )
}}
"""


MODULE_AI_TEMPLATE = """import {{ AIRegistry }} from "@platform/ai/ai.registry"

export function register{component_name}AI() {{

  if (!AIRegistry.hasTool("{feature_key}.summarize")) {{
    AIRegistry.registerTool({{
      key: "{feature_key}.summarize",
      moduleKey: "{feature_key}",
      title: "Summarize {title}",
      description: "Summarize data and status for the {title} module.",
      actionType: "read",
      keywords: ["{feature_key}", "summarize", "{route}"]
    }})
  }}

  if (!AIRegistry.hasAction("{feature_key}.draft")) {{
    AIRegistry.registerAction({{
      key: "{feature_key}.draft",
      moduleKey: "{feature_key}",
      title: "Draft {title} content",
      description: "Draft module-specific content or outreach for {title}.",
      actionType: "write",
      keywords: ["{feature_key}", "draft", "{route}"]
    }})
  }}

}}

register{component_name}AI()
"""


CARD_TEMPLATE = """import React from "react"
import {{ Card, CardContent, CardHeader }} from "@components/Card"

export default function {component_name}() {{
  return (
    <Card>
      <CardHeader title="{title}" subtitle="Generated card" />
      <CardContent>
        <p>This card was generated automatically.</p>
      </CardContent>
    </Card>
  )
}}
"""


SERVICE_TEMPLATE = """export async function {function_name}(payload?: unknown) {{
  return {{
    ok: true,
    message: "{title} service executed",
    payload
  }}
}}
"""


AI_TEMPLATE = """import {{ AIRegistry }} from "@platform/ai/ai.registry"

export function register{component_name}AI() {{

  if (!AIRegistry.hasTool("{key}.tool")) {{
    AIRegistry.registerTool({{
      key: "{key}.tool",
      moduleKey: "{module_key}",
      title: "{title} Tool",
      description: "Generated AI tool for {title}.",
      actionType: "read",
      keywords: ["{module_key}", "{key}", "tool"]
    }})
  }}

  if (!AIRegistry.hasAction("{key}.action")) {{
    AIRegistry.registerAction({{
      key: "{key}.action",
      moduleKey: "{module_key}",
      title: "{title} Action",
      description: "Generated AI action for {title}.",
      actionType: "write",
      keywords: ["{module_key}", "{key}", "action"]
    }})
  }}

}}

register{component_name}AI()
"""


DASHBOARD_TEMPLATE = """import type {{ DashboardTemplate }} from "@cards/types"
import {{ DashboardRegistry }} from "@platform/registry/dashboard.registry"

export const {const_name}: DashboardTemplate = {{
  key: "{dashboard_key}",
  title: "{title}",
  category: "generated" as any,
  version: 1,
  cards: []
}}

export function register{component_name}() {{
  DashboardRegistry.register({const_name})
}}
"""


# --------------------------------------------------
# Generators
# --------------------------------------------------

def generate_module(raw_name: str):
    module_name = to_kebab_case(raw_name)
    feature_key = module_name.replace("-", "")
    title = to_pascal_case(raw_name)
    route = module_name
    component_name = f"{title}Page"

    module_dir = MODULES_DIR / module_name
    abort_if_exists(module_dir, "Module")

    module_dir.mkdir(parents=True)

    (module_dir / "cards").mkdir()
    (module_dir / "services").mkdir()
    (module_dir / "hooks").mkdir()

    manifest = {
        "name": module_name,
        "version": "1.0.0",
        "title": title,
        "description": f"{title} module",
        "routes": [
            {
                "path": f"/{route}",
                "page": component_name,
                "title": title,
                "requiresAuth": False
            }
        ],
        "features": [
            {
                "key": feature_key,
                "title": title,
                "route": f"/{route}",
                "enabledByDefault": True,
                "aiEnabled": True,
                "flags": []
            }
        ],
        "dashboards": [
            {
                "dashboardKey": "warRoom",
                "cards": []
            }
        ],
        "ai": {
            "tools": [f"{feature_key}.summarize"],
            "actions": [f"{feature_key}.draft"]
        }
    }

    write_file(module_dir / "module.json", json.dumps(manifest, indent=2))
    write_file(module_dir / "index.ts",
               MODULE_INDEX_TEMPLATE.format(feature_key=feature_key, title=title, route=route))

    write_file(module_dir / f"{component_name}.tsx",
               MODULE_PAGE_TEMPLATE.format(
                   component_name=component_name,
                   title=title,
                   description=f"{title} module scaffold created automatically."
               ))

    write_file(module_dir / "ai.ts",
               MODULE_AI_TEMPLATE.format(
                   component_name=title,
                   feature_key=feature_key,
                   title=title,
                   route=route
               ))

    print(f"Created module scaffold: {module_dir}")


def generate_card(raw_name: str, category: str = "command"):
    title = to_pascal_case(raw_name)
    component_name = f"{title}Card"

    category_dir = CARDS_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)

    file_path = category_dir / f"{component_name}.tsx"
    abort_if_exists(file_path, "Card")

    write_file(file_path, CARD_TEMPLATE.format(component_name=component_name, title=title))

    print(f"Created card: {file_path}")


def generate_service(raw_name: str):
    service_name = to_kebab_case(raw_name)
    function_name = service_name.replace("-", "_")
    title = to_pascal_case(raw_name)

    file_path = SERVICES_DIR / f"{service_name}.service.ts"
    abort_if_exists(file_path, "Service")

    write_file(file_path, SERVICE_TEMPLATE.format(function_name=function_name, title=title))

    print(f"Created service: {file_path}")


def generate_ai(raw_name: str, module_key: str | None = None):
    key = to_kebab_case(raw_name)
    title = to_pascal_case(raw_name)
    component_name = title

    module_key = module_key or key
    file_path = PLATFORM_AI_DIR / f"{key}.generated.ts"

    abort_if_exists(file_path, "AI scaffold")

    write_file(
        file_path,
        AI_TEMPLATE.format(
            key=key.replace("-", ""),
            title=title,
            component_name=component_name,
            module_key=module_key
        )
    )

    print(f"Created AI scaffold: {file_path}")


def generate_dashboard(raw_name: str):
    dashboard_key = to_kebab_case(raw_name)
    title = to_pascal_case(raw_name)

    component_name = f"{title}Dashboard"
    const_name = f"{title}Template"

    file_path = PLATFORM_DASHBOARD_DIR / f"{dashboard_key}.template.ts"
    abort_if_exists(file_path, "Dashboard template")

    write_file(
        file_path,
        DASHBOARD_TEMPLATE.format(
            dashboard_key=dashboard_key,
            title=title,
            component_name=component_name,
            const_name=const_name
        )
    )

    print(f"Created dashboard template: {file_path}")


# --------------------------------------------------
# CLI
# --------------------------------------------------

def print_usage():
    print("Usage:")
    print("  python tools/platform_generator.py module <name>")
    print("  python tools/platform_generator.py card <name> [category]")
    print("  python tools/platform_generator.py service <name>")
    print("  python tools/platform_generator.py ai <name> [module_key]")
    print("  python tools/platform_generator.py dashboard <name>")


def main():

    if len(sys.argv) < 3:
        print_usage()
        sys.exit(1)

    generator_type = sys.argv[1].strip().lower()
    name = sys.argv[2].strip()

    if generator_type == "module":
        generate_module(name)

    elif generator_type == "card":
        category = sys.argv[3].strip() if len(sys.argv) > 3 else "command"
        generate_card(name, category)

    elif generator_type == "service":
        generate_service(name)

    elif generator_type == "ai":
        module_key = sys.argv[3].strip() if len(sys.argv) > 3 else None
        generate_ai(name, module_key)

    elif generator_type == "dashboard":
        generate_dashboard(name)

    else:
        print(f"Unknown generator type: {generator_type}")
        print_usage()
        sys.exit(1)


if __name__ == "__main__":
    main()
