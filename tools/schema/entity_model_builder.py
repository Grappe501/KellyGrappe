import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

REGISTRY = ROOT / "platform" / "schema_registry.json"
OUTPUT = ROOT / "src" / "platform" / "models"

def build_models():

    with open(REGISTRY) as f:
        registry = json.load(f)

    OUTPUT.mkdir(parents=True,exist_ok=True)

    for entity,data in registry["entities"].items():

        lines = ["export interface "+entity.capitalize()+" {" ]

        for col in data["columns"]:
            lines.append(f"  {col['name']}: any")

        lines.append("}")

        with open(OUTPUT / f"{entity}.ts","w") as f:
            f.write("\n".join(lines))

    print("Entity models generated")


if __name__ == "__main__":
    build_models()