import os
import re

ROOT = "app/src"

replacements = {
    "../../../shared/components": "@components",
    "../../shared/components": "@components",
    "../shared/components": "@components",

    "../../../shared/utils/db/services": "@services",
    "../../shared/utils/db/services": "@services",
    "../shared/utils/db/services": "@services",

    "../../../shared/utils/db": "@db",
    "../../shared/utils/db": "@db",
    "../shared/utils/db": "@db",

    "../../../modules": "@modules",
    "../../modules": "@modules",
    "../modules": "@modules",

    "../../../cards": "@cards",
    "../../cards": "@cards",
    "../cards": "@cards",

    "../../../platform": "@platform",
    "../../platform": "@platform",
    "../platform": "@platform",
}


def rewrite_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = content

    for old, new in replacements.items():
        new_content = new_content.replace(old, new)

    if new_content != content:
        print(f"Updated: {path}")
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)


def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".ts") or file.endswith(".tsx"):
                rewrite_file(os.path.join(root, file))


if __name__ == "__main__":
    process_directory(ROOT)
    print("Alias migration complete.")