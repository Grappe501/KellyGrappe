import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

SCHEMA_REGISTRY = ROOT / "platform" / "schema_registry.json"
ENTITY_REGISTRY = ROOT / "platform" / "entity_registry.json"

def build():

    with open(SCHEMA_REGISTRY) as f:
        schema = json.load(f)

    entities = {}

    for table,data in schema["entities"].items():

        entities[table] = {

            "table": table,

            "primary_key": next(
                (c["name"] for c in data["columns"] if c["name"].endswith("_id")),
                "id"
            ),

            "tenant_scoped": "organization_id" in [
                c["name"] for c in data["columns"]
            ],

            "cards": [],

            "services": [],

            "permissions": {
                "view":["organizer","admin"],
                "edit":["admin"]
            }

        }

    registry = {
        "version":1,
        "entities":entities
    }

    ENTITY_REGISTRY.parent.mkdir(parents=True,exist_ok=True)

    with open(ENTITY_REGISTRY,"w") as f:
        json.dump(registry,f,indent=2)

    print("Entity registry built")
    print("Entities:",len(entities))


if __name__ == "__main__":
    build()