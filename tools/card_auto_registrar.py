from pathlib import Path
import re

ROOT = Path(".").resolve()

CARDS_DIR = ROOT / "app/src/cards"
REGISTRY_FILE = ROOT / "app/src/cards/registry.ts"


def find_card_files():
    cards = []

    if not CARDS_DIR.exists():
        return cards

    for file in CARDS_DIR.rglob("*Card.tsx"):
        cards.append(file)

    return sorted(cards)


def card_import_name(file_path: Path):
    return file_path.stem


def card_registry_key(file_path: Path):
    name = file_path.stem
    name = name.replace("Card", "")

    # camelCase
    return name[0].lower() + name[1:]


def relative_import_path(file_path: Path):
    rel = file_path.relative_to(CARDS_DIR)
    rel = str(rel).replace("\\", "/")
    rel = rel.replace(".tsx", "")
    return "./" + rel


def load_registry():
    if not REGISTRY_FILE.exists():
        return "", {}, []

    content = REGISTRY_FILE.read_text()

    imports = {}
    registry_entries = []

    for line in content.splitlines():

        if line.startswith("import"):
            match = re.search(r'import\s+(\w+)\s+from\s+"(.+)"', line)
            if match:
                imports[match.group(1)] = match.group(2)

        if ":" in line and "CardRegistry" not in line:
            parts = line.strip().replace(",", "").split(":")
            if len(parts) == 2:
                registry_entries.append(parts[0].strip())

    return content, imports, registry_entries


def build_registry(cards):

    existing_content, existing_imports, existing_keys = load_registry()

    new_imports = []
    new_entries = []

    for card in cards:

        import_name = card_import_name(card)
        registry_key = card_registry_key(card)
        import_path = relative_import_path(card)

        if import_name not in existing_imports:

            new_imports.append(
                f'import {import_name} from "{import_path}"'
            )

        if registry_key not in existing_keys:

            new_entries.append(
                f"  {registry_key}: {import_name}"
            )

    if REGISTRY_FILE.exists():

        content = existing_content

        if new_imports:
            content = "\n".join(new_imports) + "\n\n" + content

        if new_entries:

            content = content.replace(
                "export const CardRegistry = {",
                "export const CardRegistry = {\n" +
                ",\n".join(new_entries) + ","
            )

    else:

        imports = []
        entries = []

        for card in cards:

            import_name = card_import_name(card)
            registry_key = card_registry_key(card)
            import_path = relative_import_path(card)

            imports.append(
                f'import {import_name} from "{import_path}"'
            )

            entries.append(
                f"  {registry_key}: {import_name}"
            )

        content = "\n".join(imports)

        content += "\n\nexport const CardRegistry = {\n"

        content += ",\n".join(entries)

        content += "\n}\n"

    REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
    REGISTRY_FILE.write_text(content)

    print(f"Registry updated: {REGISTRY_FILE}")


def main():

    print("\nScanning for cards...\n")

    cards = find_card_files()

    if not cards:
        print("No cards found.")
        return

    for card in cards:
        print("Found:", card)

    print("\nUpdating registry...\n")

    build_registry(cards)

    print("\nCard registration complete.\n")


if __name__ == "__main__":
    main()