import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "platform" / "schema_registry.json"

def audit():

    with open(REGISTRY) as f:
        registry = json.load(f)

    for entity,data in registry["entities"].items():

        cols = [c["name"] for c in data["columns"]]

        if "organization_id" not in cols and entity not in ["voters","organizations"]:

            print("WARNING:",entity,"missing organization_id")

    print("Tenant boundary audit complete")


if __name__ == "__main__":
    audit()