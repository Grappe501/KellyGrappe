import sys
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULES_DIR = ROOT / "app" / "src" / "modules"

INDEX_TEMPLATE = """import {{ FeatureRegistry }} from "@platform/registry/feature.registry"

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

PAGE_TEMPLATE = """import React from "react"
import Container from "@components/Container"
import {{ Card, CardContent, CardHeader }} from "@components/Card"

export default function {component_name}() {{
  return (
    <Container>
      <Card>
        <CardHeader title="{title}" />
        <CardContent>
          <p>{description}</p>
        </CardContent>
      </Card>
    </Container>
  )
}}
"""

AI_TEMPLATE = """import {{ AIRegistry }} from "@platform/ai/ai.registry"

export function register{component_name}AI() {{

  AIRegistry.registerTool({{
    key: "{feature_key}.summarize",
    moduleKey: "{feature_key}",
    title: "Summarize {title}",
    description: "Summarize data and status for the {title} module.",
    actionType: "read"
  }})

  AIRegistry.registerAction({{
    key: "{feature_key}.draft",
    moduleKey: "{feature_key}",
    title: "Draft {title} content",
    description: "Draft module-specific content or outreach for {title}.",
    actionType: "write"
  }})

}}

register{component_name}AI()
"""


def to_pascal_case(value: str) -> str:
    parts = re.split(r"[_\\-\\s]+", value)
    return "".join(p.capitalize() for p in parts if p)


def to_kebab_case(value: str) -> str:
    value = re.sub(r"([a-z0-9])([A-Z])", r"\\1-\\2", value)
    value = re.sub(r"[_\\s]+", "-", value)
    return value.lower()


def build_manifest(name, title, route, component_name, feature_key):

    return {
        "name": name,
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
            "tools": [
                f"{feature_key}.summarize"
            ],
            "actions": [
                f"{feature_key}.draft"
            ]
        }
    }


def create_file(path: Path, content: str):
    path.write_text(content.strip() + "\n", encoding="utf-8")


def main():

    if len(sys.argv) < 2:
        print("Usage: python tools/module_builder.py moduleName")
        sys.exit(1)

    raw_name = sys.argv[1].strip()

    if not raw_name:
        print("Module name cannot be empty.")
        sys.exit(1)

    module_name = to_kebab_case(raw_name)
    route = module_name

    title = to_pascal_case(raw_name)
    component_name = f"{title}Page"
    feature_key = module_name.replace("-", "")

    module_dir = MODULES_DIR / module_name

    if module_dir.exists():
        print(f"Module already exists: {module_dir}")
        sys.exit(1)

    print(f"Creating module: {module_name}")

    module_dir.mkdir(parents=True)

    (module_dir / "cards").mkdir()
    (module_dir / "services").mkdir()
    (module_dir / "hooks").mkdir()

    manifest = build_manifest(
        module_name,
        title,
        route,
        component_name,
        feature_key
    )

    create_file(
        module_dir / "module.json",
        json.dumps(manifest, indent=2)
    )

    create_file(
        module_dir / "index.ts",
        INDEX_TEMPLATE.format(
            feature_key=feature_key,
            title=title,
            route=route
        )
    )

    create_file(
        module_dir / f"{component_name}.tsx",
        PAGE_TEMPLATE.format(
            component_name=component_name,
            title=title,
            description=f"{title} module scaffold created automatically."
        )
    )

    create_file(
        module_dir / "ai.ts",
        AI_TEMPLATE.format(
            component_name=title,
            feature_key=feature_key,
            title=title
        )
    )

    print("Module scaffold created successfully.")
    print(module_dir)


if __name__ == "__main__":
    main()
