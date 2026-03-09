import os
from pathlib import Path

ROOT = Path(".")
SRC = ROOT / "app" / "src"

CATEGORIES = {
    "cards": [],
    "dashboards": [],
    "modules": [],
    "services": [],
    "database": [],
    "integrations": [],
    "netlify_functions": []
}

def categorize(path: Path):

    p = str(path).lower()

    if "card" in path.name.lower():
        CATEGORIES["cards"].append(path)

    if "dashboard" in path.name.lower() or "page.tsx" in path.name.lower():
        CATEGORIES["dashboards"].append(path)

    if "modules" in p:
        CATEGORIES["modules"].append(path)

    if "service" in path.name.lower():
        CATEGORIES["services"].append(path)

    if "db" in p or "contactsdb" in p:
        CATEGORIES["database"].append(path)

    if "integration" in p:
        CATEGORIES["integrations"].append(path)

    if "netlify" in p and "functions" in p:
        CATEGORIES["netlify_functions"].append(path)


def scan():

    for root, dirs, files in os.walk(SRC):

        for f in files:

            if f.endswith(".ts") or f.endswith(".tsx"):

                path = Path(root) / f
                categorize(path)


def print_results():

    print("\n============================")
    print(" CODEBASE ARCHITECTURE MAP")
    print("============================\n")

    for category, items in CATEGORIES.items():

        print(f"\n--- {category.upper()} ---")

        for item in items:
            print(item)


if __name__ == "__main__":

    scan()
    print_results()