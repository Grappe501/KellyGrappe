from pathlib import Path

ROOT = Path("app/src")

def repair(text: str) -> str:
    replacements = [
        # array / object newline corruption
        ("[\\n", "[\n"),
        ("(\\n", "(\n"),
        ("{\\n", "{\n"),
        (",\\n", ",\n"),

        # regex corruption fixes
        ("/[\n,]/g", "/[\\n,]/g"),
        ("/[\r\n]/g", "/[\\r\\n]/g"),

        # broken join fixes
        ('.join("\n\n")', '.join("\\n\\n")'),
        ('.join("\n")', '.join("\\n")'),

        # split corruption
        (".split(/[\n,]/g)", ".split(/[\\n,]/g)"),
    ]

    for bad, good in replacements:
        text = text.replace(bad, good)

    return text


def process_file(path: Path):
    original = path.read_text(encoding="utf-8")
    fixed = repair(original)

    if fixed != original:
        path.write_text(fixed, encoding="utf-8")
        print("Repaired:", path)


def main():
    scanned = 0

    for ext in ("*.ts", "*.tsx"):
        for path in ROOT.rglob(ext):
            process_file(path)
            scanned += 1

    print("Files scanned:", scanned)


if __name__ == "__main__":
    main()