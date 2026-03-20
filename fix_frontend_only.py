import os
import re

FRONTEND_DIR = "app/src"

VALID_EXTENSIONS = (".ts", ".tsx", ".js", ".jsx")

BAD_PATTERN = re.compile(r"SUPABASE_SERVICE_ROLE_KEY")

REPLACEMENT = "import.meta.env.VITE_SUPABASE_ANON_KEY"


def process_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if not BAD_PATTERN.search(content):
        return False

    new_content = BAD_PATTERN.sub(REPLACEMENT, content)

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

    return True


def run():
    print("🔍 Fixing frontend ONLY...\n")

    changed = []

    for root, _, files in os.walk(FRONTEND_DIR):
        for file in files:
            if not file.endswith(VALID_EXTENSIONS):
                continue

            path = os.path.join(root, file)

            if process_file(path):
                changed.append(path)

    if not changed:
        print("✅ Frontend already clean")
    else:
        print("🚨 Fixed files:\n")
        for f in changed:
            print(f" - {f}")


if __name__ == "__main__":
    run()