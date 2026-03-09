import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

DISCOVERY = ROOT / "platform" / "schema_discovery.json"
REGISTRY = ROOT / "platform" / "schema_registry.json"

def build_registry():

    with open(DISCOVERY) as f:
        discovery = json.load(f)

    registry = {
        "schema_version":1,
        "entities":{}
    }

    for table,data in discovery.items():

        registry["entities"][table] = {
            "columns":data["columns"],
            "tenant_scoped":False,
            "reference_table":False
        }

    with open(REGISTRY,"w") as f:
        json.dump(registry,f,indent=2)

    print("Schema registry built")


if __name__ == "__main__":
    build_registry()