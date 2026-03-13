import json
import os
from pathlib import Path

DATA_DIR = Path("data/elections/raw")

def normalize_keys(data):
    """
    Normalize JSON keys to match the ingest script expectations.
    """

    # normalize contests
    if "Contests" in data and "contests" not in data:
        data["contests"] = data.pop("Contests")

    if "Contest" in data and "contests" not in data:
        data["contests"] = data.pop("Contest")

    # normalize turnout
    if "CountyTurnout" in data and "county_turnout" not in data:
        data["county_turnout"] = data.pop("CountyTurnout")

    if "Turnout" in data and "county_turnout" not in data:
        data["county_turnout"] = data.pop("Turnout")

    # normalize election metadata
    if "Election" in data and "election" not in data:
        data["election"] = data.pop("Election")

    return data


def scan_and_fix():
    files = list(DATA_DIR.glob("*.json"))

    print(f"\nFound {len(files)} JSON files\n")

    for file in files:
        print(f"Scanning: {file}")

        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)

        original_keys = list(data.keys())

        data = normalize_keys(data)

        new_keys = list(data.keys())

        if original_keys != new_keys:
            print(f"  Keys changed:")
            print(f"    before: {original_keys}")
            print(f"    after : {new_keys}")

            with open(file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            print("  File updated\n")
        else:
            print("  No changes needed\n")


if __name__ == "__main__":
    scan_and_fix()