import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

DISCOVERY = ROOT / "platform" / "schema_discovery.json"
REGISTRY = ROOT / "platform" / "schema_registry.json"

def diff():

    with open(DISCOVERY) as f:
        live = json.load(f)

    with open(REGISTRY) as f:
        registry = json.load(f)

    for table in registry["entities"]:

        if table not in live:

            print("Table missing in DB:",table)

    print("Migration diff complete")

if __name__ == "__main__":
    diff()