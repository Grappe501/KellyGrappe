import argparse
import json
from pathlib import Path

CIRCLE_GENERATOR_TEMPLATE = '''"""Generator for the {circle_title} Circle."""
from pathlib import Path

def build(repo_root: str) -> None:
    root = Path(repo_root)
    print("Generator placeholder for {circle_title} Circle:", root)

if __name__ == "__main__":
    build(".")
'''

CARD_GENERATOR_TEMPLATE = '''"""Generator for a card inside the {circle_title} Circle."""
from pathlib import Path

def build(card_name: str, repo_root: str = ".") -> None:
    root = Path(repo_root)
    print("Generate card", card_name, "in {circle_title} Circle at", root)

if __name__ == "__main__":
    build("ExampleCard")
'''

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--build-map", required=True)
    args = parser.parse_args()

    output = Path(args.output).resolve()
    build_map = json.loads(Path(args.build_map).read_text(encoding="utf-8"))
    output.mkdir(parents=True, exist_ok=True)

    circles = build_map.get("circles", {})
    for circle_name in circles.keys():
        circle_dir = output / circle_name
        circle_dir.mkdir(parents=True, exist_ok=True)
        title = circle_name.replace("_", " ").title()
        (circle_dir / f"generate_{circle_name}_circle.py").write_text(
            CIRCLE_GENERATOR_TEMPLATE.format(circle_title=title),
            encoding="utf-8",
        )
        (circle_dir / f"generate_{circle_name}_card.py").write_text(
            CARD_GENERATOR_TEMPLATE.format(circle_title=title),
            encoding="utf-8",
        )
        (circle_dir / "__init__.py").write_text("", encoding="utf-8")

if __name__ == "__main__":
    main()
