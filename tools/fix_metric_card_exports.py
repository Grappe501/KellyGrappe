import os
import re

ROOT = "app/src/cards/metrics"

pattern = re.compile(r"export\s+function\s+(\w+)")

def process_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    match = pattern.search(content)

    if not match:
        return

    fn_name = match.group(1)

    updated = pattern.sub(f"export default function {fn_name}", content)

    with open(path, "w", encoding="utf-8") as f:
        f.write(updated)

    print("Updated:", path)


def run():
    for root, dirs, files in os.walk(ROOT):
        for file in files:
            if file.endswith(".tsx"):
                process_file(os.path.join(root, file))


if __name__ == "__main__":
    run()