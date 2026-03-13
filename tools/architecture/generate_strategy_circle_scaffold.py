#!/usr/bin/env python3
"""
Generate a Strategy Circle scaffold from a build map.

Usage:
  python tools/architecture/generate_strategy_circle_scaffold.py \
    --repo-root /path/to/repo \
    --build-map tools/architecture/strategy_system_build_map.json

The script is idempotent by default: it will not overwrite existing files.
Use --force to overwrite existing stubs.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List


TS_STUB = """/**
 * AUTO-GENERATED STUB
 *
 * Purpose:
 * TODO: describe this module's responsibility.
 *
 * Status:
 * - scaffolded
 * - not implemented
 */

export {}
"""

TSX_STUB = """/**
 * AUTO-GENERATED STUB
 *
 * Purpose:
 * TODO: describe this card's responsibility.
 *
 * Status:
 * - scaffolded
 * - not implemented
 */

import React from \"react\"

export default function COMPONENT_NAME() {
  return (
    <div>
      <strong>COMPONENT_NAME</strong>
      <p>Scaffold stub.</p>
    </div>
  )
}
"""


def load_build_map(build_map_path: Path) -> Dict:
    with build_map_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def infer_stub(file_name: str) -> str:
    if file_name.endswith(".tsx"):
        component_name = file_name.replace(".tsx", "")
        return TSX_STUB.replace("COMPONENT_NAME", component_name)
    return TS_STUB


def write_file(path: Path, content: str, force: bool = False) -> str:
    if path.exists() and not force:
        return "exists"

    path.write_text(content, encoding="utf-8")
    return "created" if not path.exists() else "written"


def scaffold(repo_root: Path, build_map: Dict, force: bool = False) -> Dict[str, List[str]]:
    base_path = repo_root / build_map.get("base_path", "app/src")
    created: List[str] = []
    skipped: List[str] = []

    for directory in build_map.get("directories", []):
        ensure_directory(base_path / directory)

    for directory, files in build_map.get("files", {}).items():
        directory_path = base_path / directory
        ensure_directory(directory_path)

        for file_name in files:
            file_path = directory_path / file_name
            if file_path.exists() and not force:
                skipped.append(str(file_path))
                continue

            stub = infer_stub(file_name)
            file_path.write_text(stub, encoding="utf-8")
            created.append(str(file_path))

    return {"created": created, "skipped": skipped}


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Strategy Circle scaffold")
    parser.add_argument("--repo-root", required=True, help="Path to repository root")
    parser.add_argument("--build-map", required=True, help="Path to strategy build map json")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    build_map_path = Path(args.build_map).resolve()

    if not repo_root.exists():
        raise SystemExit(f"Repo root does not exist: {repo_root}")
    if not build_map_path.exists():
        raise SystemExit(f"Build map does not exist: {build_map_path}")

    build_map = load_build_map(build_map_path)
    result = scaffold(repo_root=repo_root, build_map=build_map, force=args.force)

    print("\n======================================")
    print("Strategy Circle Scaffold Generator")
    print("======================================")
    print(f"Created: {len(result['created'])}")
    print(f"Skipped: {len(result['skipped'])}")

    if result["created"]:
        print("\nCreated files:")
        for item in result["created"]:
            print(f"  + {item}")

    if result["skipped"]:
        print("\nSkipped existing files:")
        for item in result["skipped"]:
            print(f"  - {item}")


if __name__ == "__main__":
    main()
