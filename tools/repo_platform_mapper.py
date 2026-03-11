import os
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(".")
OUTPUT = Path("analysis")
OUTPUT.mkdir(exist_ok=True)

TS_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"]

PAGE_HINTS = [
    "Page",
    "Dashboard",
    "Screen",
    "View",
    "Route"
]

ROUTE_HINTS = [
    "Route(",
    "<Route",
    "createBrowserRouter"
]


def find_source_files():
    files = []
    for root, dirs, filenames in os.walk(ROOT):
        if "node_modules" in root:
            continue
        if ".git" in root:
            continue

        for f in filenames:
            if any(f.endswith(ext) for ext in TS_EXTENSIONS):
                files.append(Path(root) / f)

    return files


def extract_imports(text):
    imports = re.findall(r'import\s+(?:.*?\s+from\s+)?["\'](.*?)["\']', text)
    return imports


def extract_exports(text):
    exports = re.findall(r'export\s+(?:default\s+)?(function|const|class)\s+(\w+)', text)
    return exports


def detect_routes(text):
    routes = []
    for hint in ROUTE_HINTS:
        if hint in text:
            routes.append(hint)
    return routes


def analyze_files(files):
    report = []

    page_candidates = []
    route_files = []

    import_graph = defaultdict(list)

    for file in files:
        try:
            text = file.read_text(encoding="utf-8")
        except:
            continue

        imports = extract_imports(text)
        exports = extract_exports(text)
        routes = detect_routes(text)

        for imp in imports:
            import_graph[str(file)].append(imp)

        if any(hint in file.name for hint in PAGE_HINTS):
            page_candidates.append(file)

        if routes:
            route_files.append(file)

        report.append({
            "file": file,
            "imports": imports,
            "exports": exports,
            "routes": routes
        })

    return report, page_candidates, route_files, import_graph


def generate_markdown(report, pages, routes, graph):

    md = []

    md.append("# Platform Repository Analysis\n")

    md.append("## Page Candidates\n")
    for p in pages:
        md.append(f"- {p}")

    md.append("\n## Routing Files\n")
    for r in routes:
        md.append(f"- {r}")

    md.append("\n## Import Graph\n")

    for file, imports in graph.items():
        md.append(f"\n### {file}\n")
        for i in imports:
            md.append(f"- {i}")

    md.append("\n## File Inventory\n")

    for entry in report:
        md.append(f"\n### {entry['file']}\n")

        if entry["exports"]:
            md.append("Exports:")
            for e in entry["exports"]:
                md.append(f"- {e}")

        if entry["routes"]:
            md.append("Route Indicators:")
            for r in entry["routes"]:
                md.append(f"- {r}")

        if entry["imports"]:
            md.append("Imports:")
            for i in entry["imports"]:
                md.append(f"- {i}")

    output_file = OUTPUT / "platform_repo_map.md"
    output_file.write_text("\n".join(md), encoding="utf-8")

    print(f"\nRepository map generated:")
    print(output_file)


def main():
    print("Scanning repository...\n")

    files = find_source_files()

    print(f"Found {len(files)} source files\n")

    report, pages, routes, graph = analyze_files(files)

    generate_markdown(report, pages, routes, graph)


if __name__ == "__main__":
    main()