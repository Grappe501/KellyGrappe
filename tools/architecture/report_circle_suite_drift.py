import argparse
import json
from pathlib import Path

def expected_paths(repo_root: Path, build_map: dict) -> set[str]:
    root = repo_root / build_map["root"]
    paths: set[str] = set()
    for folder, files in build_map.get("shared", {}).items():
        for file_name in files:
            paths.add(str((root / folder / file_name).resolve()))
    for _, sections in build_map.get("circles", {}).items():
        for folder, files in sections.items():
            for file_name in files:
                paths.add(str((root / folder / file_name).resolve()))
    return paths

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--build-map", required=True)
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    build_map_path = Path(args.build_map).resolve()
    build_map = json.loads(build_map_path.read_text(encoding="utf-8"))
    exp = expected_paths(repo_root, build_map)
    existing = {p for p in exp if Path(p).exists()}
    missing = sorted(exp - existing)

    print(f"Expected files: {len(exp)}")
    print(f"Existing expected files: {len(existing)}")
    print(f"Missing files: {len(missing)}")
    if missing:
        print("\nMissing:")
        for path in missing:
            print(path)

if __name__ == "__main__":
    main()
