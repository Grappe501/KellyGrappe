#!/usr/bin/env python3
"""
Compare an expected Strategy Circle build map to the actual repo and report drift.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Set


def load_build_map(path: Path) -> Dict:
    return json.loads(path.read_text(encoding="utf-8"))


def expected_files(repo_root: Path, build_map: Dict) -> Set[Path]:
    base_path = repo_root / build_map.get("base_path", "app/src")
    expected: Set[Path] = set()

    for directory, files in build_map.get("files", {}).items():
        for name in files:
            expected.add((base_path / directory / name).resolve())

    return expected


def actual_files(repo_root: Path, build_map: Dict) -> Set[Path]:
    base_path = repo_root / build_map.get("base_path", "app/src")
    actual: Set[Path] = set()

    for directory in build_map.get("files", {}).keys():
        dir_path = (base_path / directory).resolve()
        if not dir_path.exists():
            continue
        for child in dir_path.iterdir():
            if child.is_file():
                actual.add(child.resolve())

    return actual


def main() -> None:
    parser = argparse.ArgumentParser(description="Report Strategy Circle architecture drift")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--build-map", required=True)
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    build_map_path = Path(args.build_map).resolve()

    build_map = load_build_map(build_map_path)
    exp = expected_files(repo_root, build_map)
    act = actual_files(repo_root, build_map)

    missing = sorted(str(p) for p in exp - act)
    unexpected = sorted(str(p) for p in act - exp)
    present = sorted(str(p) for p in exp & act)

    print("\n======================================")
    print("Strategy Circle Drift Report")
    print("======================================")
    print(f"Expected files:   {len(exp)}")
    print(f"Present files:    {len(present)}")
    print(f"Missing files:    {len(missing)}")
    print(f"Unexpected files: {len(unexpected)}")

    if missing:
        print("\nMissing:")
        for item in missing:
            print(f"  - {item}")

    if unexpected:
        print("\nUnexpected:")
        for item in unexpected:
            print(f"  + {item}")


if __name__ == "__main__":
    main()
