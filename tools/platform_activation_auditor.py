from __future__ import annotations

import json
import re
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple


ROOT = Path(".").resolve()
APP_SRC = ROOT / "app" / "src"
ANALYSIS_DIR = ROOT / "analysis"
ANALYSIS_DIR.mkdir(exist_ok=True)

REPORT_JSON = ANALYSIS_DIR / "platform_activation_audit.json"
REPORT_MD = ANALYSIS_DIR / "platform_activation_audit.md"
PRIORITY_MD = ANALYSIS_DIR / "platform_activation_priority_queue.md"
AUTOBUILD_JSON = ANALYSIS_DIR / "PLATFORM_AUTOBUILD_QUEUE.json"

TS_SUFFIXES = (".ts", ".tsx", ".js", ".jsx")

ENTRY_FILES = [
    "app/src/main.tsx",
    "app/src/App.tsx",
]

BOOTSTRAP_FILE = "app/src/platform/PlatformBootstrap.ts"
CARD_REGISTRY_FILE = "app/src/cards/registry.ts"
DASHBOARD_RENDERER_FILE = "app/src/platform/renderers/DashboardRenderer.tsx"
CARD_RENDERER_FILE = "app/src/platform/renderers/CardRenderer.tsx"

TARGET_REGISTRIES = [
    "app/src/platform/registry/card.registry.ts",
    "app/src/platform/registry/dashboard.registry.ts",
    "app/src/platform/registry/role.registry.ts",
    "app/src/platform/registry/microroom.registry.ts",
    "app/src/platform/registry/feature.registry.ts",
    "app/src/platform/registry/brand.registry.ts",
    "app/src/platform/registry/index.ts",
]

TARGET_DEFAULTS = [
    "app/src/platform/defaults/default.features.ts",
    "app/src/platform/defaults/default.roles.ts",
    "app/src/platform/defaults/default.microrooms.ts",
    "app/src/platform/defaults/default.brands.ts",
    "app/src/platform/defaults/index.ts",
]

SUSPICIOUS_THEME_TOKENS = [
    "bg-indigo-",
    "text-indigo-",
    "bg-blue-",
    "text-blue-",
    "bg-red-",
    "text-red-",
    "#4338ca",
    "#2563eb",
    "#dc2626",
]

AI_LOGGING_FIELDS = [
    "workspace",
    "organization",
    "dashboard",
    "card",
    "session",
    "ip",
    "browser",
    "device",
    "prompt",
    "response",
    "tokens",
    "latency",
]

IMPORT_RE = re.compile(
    r"""import\s+(?:type\s+)?(?:[\w*\s{},]+)\s+from\s+["']([^"']+)["']""",
    re.MULTILINE,
)

DYNAMIC_IMPORT_RE = re.compile(
    r"""import\(\s*["']([^"']+)["']\s*\)""",
    re.MULTILINE,
)

ROUTE_PATH_RE = re.compile(
    r"""path\s*=\s*["']([^"']+)["']""",
    re.MULTILINE,
)

JSX_TAG_RE = re.compile(
    r"""<([A-Z][A-Za-z0-9_]*)\b""",
    re.MULTILINE,
)

EXPORT_DEFAULT_RE = re.compile(
    r"""export\s+default\s+([A-Z][A-Za-z0-9_]*)?""",
    re.MULTILINE,
)

FUNCTION_COMPONENT_RE = re.compile(
    r"""(?:export\s+default\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(""",
    re.MULTILINE,
)

CONST_COMPONENT_RE = re.compile(
    r"""const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(""",
    re.MULTILINE,
)


@dataclass
class ImportEdge:
    source: str
    target: str
    kind: str  # static | dynamic


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except Exception:
        return str(path).replace("\\", "/")


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def save_json(path: Path, data: Any) -> None:
    write_text(path, json.dumps(data, indent=2))


def exists(path_str: str) -> bool:
    return (ROOT / path_str).exists()


def list_source_files() -> List[Path]:
    if not APP_SRC.exists():
        return []
    files: List[Path] = []
    for suffix in TS_SUFFIXES:
        files.extend(APP_SRC.rglob(f"*{suffix}"))
    return sorted([p for p in files if p.is_file()])


def resolve_import(source_file: Path, import_path: str) -> Optional[Path]:
    if not import_path.startswith("."):
        return None

    candidate_base = (source_file.parent / import_path).resolve()

    candidates = [
        candidate_base,
        candidate_base.with_suffix(".ts"),
        candidate_base.with_suffix(".tsx"),
        candidate_base.with_suffix(".js"),
        candidate_base.with_suffix(".jsx"),
        candidate_base / "index.ts",
        candidate_base / "index.tsx",
        candidate_base / "index.js",
        candidate_base / "index.jsx",
    ]

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate

    return None


def parse_imports(file_path: Path) -> List[ImportEdge]:
    text = read_text(file_path)
    edges: List[ImportEdge] = []

    for match in IMPORT_RE.findall(text):
        resolved = resolve_import(file_path, match)
        if resolved:
            edges.append(
                ImportEdge(
                    source=rel(file_path),
                    target=rel(resolved),
                    kind="static",
                )
            )

    for match in DYNAMIC_IMPORT_RE.findall(text):
        resolved = resolve_import(file_path, match)
        if resolved:
            edges.append(
                ImportEdge(
                    source=rel(file_path),
                    target=rel(resolved),
                    kind="dynamic",
                )
            )

    return edges


def build_import_graph(files: List[Path]) -> Tuple[Dict[str, Set[str]], Dict[str, Set[str]], List[ImportEdge]]:
    graph: Dict[str, Set[str]] = defaultdict(set)
    reverse_graph: Dict[str, Set[str]] = defaultdict(set)
    edges: List[ImportEdge] = []

    for file_path in files:
        file_rel = rel(file_path)
        graph.setdefault(file_rel, set())
        reverse_graph.setdefault(file_rel, set())

        for edge in parse_imports(file_path):
            graph[edge.source].add(edge.target)
            reverse_graph[edge.target].add(edge.source)
            edges.append(edge)

    return graph, reverse_graph, edges


def find_reachable(start_nodes: List[str], graph: Dict[str, Set[str]]) -> Set[str]:
    visited: Set[str] = set()
    queue: deque[str] = deque()

    for node in start_nodes:
        if node in graph:
            queue.append(node)
            visited.add(node)

    while queue:
        current = queue.popleft()
        for nxt in graph.get(current, set()):
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)

    return visited


def detect_cycles(graph: Dict[str, Set[str]]) -> List[List[str]]:
    visited: Set[str] = set()
    active: Set[str] = set()
    stack: List[str] = []
    cycles: List[List[str]] = []

    def dfs(node: str) -> None:
        visited.add(node)
        active.add(node)
        stack.append(node)

        for nxt in graph.get(node, set()):
            if nxt not in visited:
                dfs(nxt)
            elif nxt in active:
                if nxt in stack:
                    start_idx = stack.index(nxt)
                    cycle = stack[start_idx:] + [nxt]
                    if cycle not in cycles:
                        cycles.append(cycle)

        stack.pop()
        active.remove(node)

    for node in graph:
        if node not in visited:
            dfs(node)

    return cycles[:50]


def extract_routes(file_path: Path) -> List[str]:
    text = read_text(file_path)
    return sorted(set(ROUTE_PATH_RE.findall(text)))


def extract_component_names(text: str) -> Set[str]:
    names: Set[str] = set()

    for regex in (FUNCTION_COMPONENT_RE, CONST_COMPONENT_RE):
        for match in regex.findall(text):
            if match:
                names.add(match)

    default_match = EXPORT_DEFAULT_RE.findall(text)
    for item in default_match:
        if item:
            names.add(item)

    return names


def scan_files_index(files: List[Path]) -> Dict[str, Dict[str, Any]]:
    index: Dict[str, Dict[str, Any]] = {}

    for file_path in files:
        file_rel = rel(file_path)
        text = read_text(file_path)
        file_name = file_path.name

        routes = extract_routes(file_path)
        declared_components = sorted(extract_component_names(text))
        used_components = sorted(set(JSX_TAG_RE.findall(text)))

        index[file_rel] = {
            "path": file_rel,
            "name": file_name,
            "routes": routes,
            "declared_components": declared_components,
            "used_components": used_components,
            "is_card": file_name.endswith("Card.tsx"),
            "is_page": file_name.endswith("Page.tsx"),
            "is_dashboard_template": "app/src/dashboards/templates/" in file_rel,
            "is_module_file": "app/src/modules/" in file_rel,
            "is_platform_file": "app/src/platform/" in file_rel,
            "is_dashboard_file": "app/src/dashboards/" in file_rel,
            "is_registry_file": ".registry.ts" in file_rel or file_rel.endswith("/registry.ts"),
            "is_service_file": file_name.endswith(".service.ts") or file_name.endswith(".service.tsx"),
            "is_entry_file": file_rel in ENTRY_FILES,
            "text_len": len(text),
        }

    return index


def scan_bootstrap_activation(files_index: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    main_text = read_text(ROOT / "app/src/main.tsx")
    app_text = read_text(ROOT / "app/src/App.tsx")
    bootstrap_text = read_text(ROOT / BOOTSTRAP_FILE)
    dashboard_renderer_text = read_text(ROOT / DASHBOARD_RENDERER_FILE)
    card_renderer_text = read_text(ROOT / CARD_RENDERER_FILE)

    activation = {
        "platform_bootstrap_exists": exists(BOOTSTRAP_FILE),
        "main_imports_platform_bootstrap": "PlatformBootstrap" in main_text,
        "app_imports_platform_bootstrap": "PlatformBootstrap" in app_text,
        "main_references_app": bool(re.search(r"""<App\b""", main_text)),
        "main_references_platform_bootstrap": bool(re.search(r"""<PlatformBootstrap\b""", main_text)),
        "app_references_platform_bootstrap": bool(re.search(r"""<PlatformBootstrap\b""", app_text)),
        "dashboard_renderer_exists": exists(DASHBOARD_RENDERER_FILE),
        "card_renderer_exists": exists(CARD_RENDERER_FILE),
        "bootstrap_mentions_dashboard_renderer": "DashboardRenderer" in bootstrap_text,
        "bootstrap_mentions_card_renderer": "CardRenderer" in bootstrap_text,
        "bootstrap_mentions_registry": "registry" in bootstrap_text.lower(),
        "dashboard_renderer_mentions_template": "template" in dashboard_renderer_text.lower(),
        "card_renderer_mentions_card": "card" in card_renderer_text.lower(),
    }

    activation["runtime_bootstrap_active"] = bool(
        activation["platform_bootstrap_exists"]
        and (
            activation["main_references_platform_bootstrap"]
            or activation["app_references_platform_bootstrap"]
        )
    )

    return activation


def scan_registry_coverage(files_index: Dict[str, Dict[str, Any]], reverse_graph: Dict[str, Set[str]]) -> Dict[str, Any]:
    card_files = sorted([p for p, meta in files_index.items() if meta["is_card"] and p.startswith("app/src/cards/")])
    registry_exists = exists(CARD_REGISTRY_FILE)
    registry_text = read_text(ROOT / CARD_REGISTRY_FILE)

    registered_cards: List[str] = []
    unregistered_cards: List[str] = []
    orphan_cards: List[str] = []

    for card_file in card_files:
        stem = Path(card_file).stem
        in_registry_by_name = stem in registry_text
        imported_by_registry = CARD_REGISTRY_FILE in reverse_graph.get(card_file, set())
        imported_anywhere = len(reverse_graph.get(card_file, set())) > 0

        if in_registry_by_name or imported_by_registry:
            registered_cards.append(card_file)
        else:
            unregistered_cards.append(card_file)

        if not imported_anywhere:
            orphan_cards.append(card_file)

    return {
        "registry_exists": registry_exists,
        "card_total": len(card_files),
        "registered_cards": registered_cards,
        "unregistered_cards": unregistered_cards,
        "orphan_cards": orphan_cards,
    }


def scan_route_drift(files_index: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    route_files = []
    legacy_route_targets = []
    platform_route_targets = []
    dashboard_route_targets = []

    for path_str, meta in files_index.items():
        if meta["routes"]:
            route_files.append(path_str)

        if not meta["is_page"]:
            continue

        routes = meta["routes"]
        if not routes:
            continue

        if meta["is_module_file"]:
            legacy_route_targets.append({"file": path_str, "routes": routes})
        elif meta["is_platform_file"]:
            platform_route_targets.append({"file": path_str, "routes": routes})
        elif meta["is_dashboard_file"]:
            dashboard_route_targets.append({"file": path_str, "routes": routes})

    return {
        "route_files": route_files,
        "legacy_route_targets": legacy_route_targets,
        "platform_route_targets": platform_route_targets,
        "dashboard_route_targets": dashboard_route_targets,
    }


def scan_template_adoption(files_index: Dict[str, Dict[str, Any]], reverse_graph: Dict[str, Set[str]]) -> Dict[str, Any]:
    template_files = sorted(
        [
            p for p, meta in files_index.items()
            if meta["is_dashboard_template"]
        ]
    )
    unused_templates = [p for p in template_files if len(reverse_graph.get(p, set())) == 0]

    return {
        "template_total": len(template_files),
        "templates": template_files,
        "unused_templates": unused_templates,
        "war_room_template_exists": exists("app/src/dashboards/templates/warRoom.template.ts"),
    }


def scan_dead_legacy_pages(files_index: Dict[str, Dict[str, Any]], reverse_graph: Dict[str, Set[str]], reachable: Set[str]) -> Dict[str, Any]:
    legacy_pages = sorted(
        [
            p for p, meta in files_index.items()
            if meta["is_page"] and meta["is_module_file"]
        ]
    )

    unreachable_legacy_pages = [p for p in legacy_pages if p not in reachable]
    unimported_legacy_pages = [p for p in legacy_pages if len(reverse_graph.get(p, set())) == 0]

    return {
        "legacy_pages_total": len(legacy_pages),
        "legacy_pages": legacy_pages,
        "unreachable_legacy_pages": unreachable_legacy_pages,
        "unimported_legacy_pages": unimported_legacy_pages,
    }


def scan_service_overlap(files_index: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    services = sorted([p for p, meta in files_index.items() if meta["is_service_file"]])
    by_stem: Dict[str, List[str]] = defaultdict(list)

    for service in services:
        by_stem[Path(service).stem].append(service)

    duplicate_service_stems = {
        stem: paths for stem, paths in by_stem.items() if len(paths) > 1
    }

    return {
        "services_total": len(services),
        "services": services,
        "duplicate_service_stems": duplicate_service_stems,
    }


def scan_theme_drift(files: List[Path]) -> Dict[str, Any]:
    findings: Dict[str, List[str]] = defaultdict(list)

    for file_path in files:
        text = read_text(file_path)
        file_rel = rel(file_path)
        for token in SUSPICIOUS_THEME_TOKENS:
            if token in text:
                findings[token].append(file_rel)

    normalized = {
        token: sorted(set(paths))
        for token, paths in findings.items()
    }

    return {
        "theme_provider_exists": exists("app/src/theme/ThemeProvider.tsx"),
        "brand_registry_exists": exists("app/src/platform/registry/brand.registry.ts"),
        "hardcoded_token_findings": normalized,
        "hardcoded_file_total": len(sorted(set(p for paths in normalized.values() for p in paths))),
    }


def scan_ai_logging(files: List[Path]) -> Dict[str, Any]:
    ai_related_files: List[str] = []
    corpus_parts: List[str] = []

    for file_path in files:
        file_rel = rel(file_path)
        text = read_text(file_path)
        text_lower = text.lower()

        if "openai" in text_lower or "ai" in file_path.name.lower():
            ai_related_files.append(file_rel)
            corpus_parts.append(text_lower)

    corpus = "\n".join(corpus_parts)
    coverage = {field: (field in corpus) for field in AI_LOGGING_FIELDS}

    return {
        "ai_related_files": sorted(set(ai_related_files)),
        "logging_field_coverage": coverage,
        "coverage_score": round((sum(coverage.values()) / len(coverage)) * 100) if coverage else 0,
    }


def scan_registry_readiness() -> Dict[str, Any]:
    registries = {path: exists(path) for path in TARGET_REGISTRIES}
    defaults = {path: exists(path) for path in TARGET_DEFAULTS}

    return {
        "registries": registries,
        "defaults": defaults,
        "registry_score": round((sum(registries.values()) / len(registries)) * 100) if registries else 0,
        "defaults_score": round((sum(defaults.values()) / len(defaults)) * 100) if defaults else 0,
    }


def scan_platform_bypass(edges: List[ImportEdge]) -> Dict[str, Any]:
    dashboard_to_modules = []
    platform_to_modules = []
    cards_to_modules = []

    for edge in edges:
        src = edge.source
        tgt = edge.target

        if src.startswith("app/src/dashboards/") and tgt.startswith("app/src/modules/"):
            dashboard_to_modules.append(asdict(edge))
        if src.startswith("app/src/platform/") and tgt.startswith("app/src/modules/"):
            platform_to_modules.append(asdict(edge))
        if src.startswith("app/src/cards/") and tgt.startswith("app/src/modules/"):
            cards_to_modules.append(asdict(edge))

    return {
        "dashboard_to_modules": dashboard_to_modules,
        "platform_to_modules": platform_to_modules,
        "cards_to_modules": cards_to_modules,
    }


def build_scores(
    bootstrap: Dict[str, Any],
    registry_coverage: Dict[str, Any],
    route_drift: Dict[str, Any],
    template_adoption: Dict[str, Any],
    dead_legacy: Dict[str, Any],
    service_overlap: Dict[str, Any],
    theme_drift: Dict[str, Any],
    ai_logging: Dict[str, Any],
    registry_readiness: Dict[str, Any],
    cycles: List[List[str]],
    platform_bypass: Dict[str, Any],
) -> Dict[str, int]:
    runtime_activation_score = 100 if bootstrap["runtime_bootstrap_active"] else 35 if bootstrap["platform_bootstrap_exists"] else 0

    registry_activation_score = 0
    if registry_coverage["card_total"] == 0:
        registry_activation_score = 0
    else:
        registered = len(registry_coverage["registered_cards"])
        total = registry_coverage["card_total"]
        registry_activation_score = round((registered / total) * 100)

    route_migration_score = 100
    if route_drift["legacy_route_targets"]:
        route_migration_score = max(0, 100 - min(90, len(route_drift["legacy_route_targets"]) * 10))

    template_adoption_score = 100
    if template_adoption["template_total"] == 0:
        template_adoption_score = 0
    elif template_adoption["unused_templates"]:
        used = template_adoption["template_total"] - len(template_adoption["unused_templates"])
        template_adoption_score = round((used / template_adoption["template_total"]) * 100)

    legacy_detachment_score = 100
    if dead_legacy["legacy_pages_total"] > 0:
        detached = len(dead_legacy["unreachable_legacy_pages"])
        total = dead_legacy["legacy_pages_total"]
        legacy_detachment_score = round((detached / total) * 100)

    service_consolidation_score = 100 if not service_overlap["duplicate_service_stems"] else 70
    theme_centralization_score = max(0, 100 - (theme_drift["hardcoded_file_total"] * 5))
    ai_observability_score = ai_logging["coverage_score"]
    registry_foundation_score = round((registry_readiness["registry_score"] + registry_readiness["defaults_score"]) / 2)

    cycle_penalty = min(40, len(cycles) * 5)
    bypass_count = (
        len(platform_bypass["dashboard_to_modules"])
        + len(platform_bypass["platform_to_modules"])
        + len(platform_bypass["cards_to_modules"])
    )
    bypass_penalty = min(40, bypass_count * 3)

    architecture_integrity_score = max(
        0,
        round(
            (
                runtime_activation_score
                + registry_activation_score
                + route_migration_score
                + template_adoption_score
                + legacy_detachment_score
                + service_consolidation_score
                + theme_centralization_score
                + ai_observability_score
                + registry_foundation_score
            ) / 9
        ) - cycle_penalty - bypass_penalty
    )

    return {
        "runtime_activation_score": runtime_activation_score,
        "registry_activation_score": registry_activation_score,
        "route_migration_score": route_migration_score,
        "template_adoption_score": template_adoption_score,
        "legacy_detachment_score": legacy_detachment_score,
        "service_consolidation_score": service_consolidation_score,
        "theme_centralization_score": theme_centralization_score,
        "ai_observability_score": ai_observability_score,
        "registry_foundation_score": registry_foundation_score,
        "architecture_integrity_score": max(0, architecture_integrity_score),
    }


def build_findings(
    bootstrap: Dict[str, Any],
    registry_coverage: Dict[str, Any],
    route_drift: Dict[str, Any],
    template_adoption: Dict[str, Any],
    dead_legacy: Dict[str, Any],
    service_overlap: Dict[str, Any],
    theme_drift: Dict[str, Any],
    cycles: List[List[str]],
    platform_bypass: Dict[str, Any],
) -> List[str]:
    findings: List[str] = []

    if not bootstrap["runtime_bootstrap_active"]:
        findings.append("PlatformBootstrap exists but does not appear to be the active runtime entry.")
    if registry_coverage["unregistered_cards"]:
        findings.append("Some cards exist in app/src/cards but are not registered.")
    if registry_coverage["orphan_cards"]:
        findings.append("Some cards exist but are not imported anywhere.")
    if route_drift["legacy_route_targets"]:
        findings.append("Legacy module pages still appear to be route targets.")
    if template_adoption["template_total"] == 0:
        findings.append("No dashboard templates detected.")
    elif template_adoption["unused_templates"]:
        findings.append("Some dashboard templates exist but are not imported.")
    if dead_legacy["unreachable_legacy_pages"]:
        findings.append("Some legacy module pages are unreachable from current entrypoints and may be dead code.")
    if service_overlap["duplicate_service_stems"]:
        findings.append("Potential overlapping services detected by duplicate service stems.")
    if theme_drift["hardcoded_file_total"] > 0:
        findings.append("Hardcoded brand/theme tokens detected; theming is not fully centralized.")
    if cycles:
        findings.append("Circular local import chains detected.")
    if platform_bypass["dashboard_to_modules"] or platform_bypass["platform_to_modules"] or platform_bypass["cards_to_modules"]:
        findings.append("New architecture imports legacy modules directly in some places.")

    if not findings:
        findings.append("No major activation blockers detected.")

    return findings


def build_priority_queue(
    bootstrap: Dict[str, Any],
    registry_coverage: Dict[str, Any],
    route_drift: Dict[str, Any],
    template_adoption: Dict[str, Any],
    dead_legacy: Dict[str, Any],
    theme_drift: Dict[str, Any],
    ai_logging: Dict[str, Any],
    platform_bypass: Dict[str, Any],
) -> List[Dict[str, Any]]:
    queue: List[Dict[str, Any]] = []

    if not bootstrap["runtime_bootstrap_active"]:
        queue.append({
            "priority": 1,
            "category": "runtime",
            "task": "Activate PlatformBootstrap in runtime entry chain",
            "targets": ["app/src/main.tsx", "app/src/App.tsx", BOOTSTRAP_FILE],
            "why": "The platform cannot become the operating system until bootstrap is the active entry.",
        })

    if registry_coverage["unregistered_cards"]:
        queue.append({
            "priority": 2,
            "category": "registry",
            "task": "Register unregistered cards",
            "targets": [CARD_REGISTRY_FILE] + registry_coverage["unregistered_cards"][:10],
            "why": "Unregistered cards cannot be composed into dashboards or micro-rooms.",
        })

    if route_drift["legacy_route_targets"]:
        queue.append({
            "priority": 3,
            "category": "routing",
            "task": "Replace direct legacy page routing with platform/dashboard routing",
            "targets": [item["file"] for item in route_drift["legacy_route_targets"][:10]],
            "why": "Legacy route targets bypass the registry-driven platform.",
        })

    if template_adoption["template_total"] == 0 or template_adoption["unused_templates"]:
        targets = template_adoption["unused_templates"][:10]
        if exists("app/src/dashboards/templates/warRoom.template.ts"):
            targets.insert(0, "app/src/dashboards/templates/warRoom.template.ts")
        queue.append({
            "priority": 4,
            "category": "dashboard_templates",
            "task": "Adopt template-driven dashboards",
            "targets": targets or ["app/src/dashboards/templates/warRoom.template.ts"],
            "why": "Dashboards should assemble capabilities through templates, not hand-wired pages.",
        })

    bypass_targets = (
        [item["source"] for item in platform_bypass["dashboard_to_modules"]]
        + [item["source"] for item in platform_bypass["platform_to_modules"]]
        + [item["source"] for item in platform_bypass["cards_to_modules"]]
    )
    if bypass_targets:
        queue.append({
            "priority": 5,
            "category": "architecture_bypass",
            "task": "Remove new-architecture imports of legacy modules",
            "targets": sorted(set(bypass_targets))[:10],
            "why": "Cards, dashboards, and platform files should consume services, registries, or migrated primitives, not legacy modules.",
        })

    if dead_legacy["unreachable_legacy_pages"]:
        queue.append({
            "priority": 6,
            "category": "cleanup",
            "task": "Review unreachable legacy pages for migration or removal",
            "targets": dead_legacy["unreachable_legacy_pages"][:10],
            "why": "Dead pages create confusion and mislead future automated build systems.",
        })

    if theme_drift["hardcoded_file_total"] > 0:
        token_targets = sorted(
            set(path for paths in theme_drift["hardcoded_token_findings"].values() for path in paths)
        )
        queue.append({
            "priority": 7,
            "category": "theming",
            "task": "Centralize hardcoded brand styles behind theme system",
            "targets": token_targets[:10],
            "why": "A multi-tenant civic OS needs theme-safe rendering.",
        })

    if ai_logging["coverage_score"] < 100:
        queue.append({
            "priority": 8,
            "category": "observability",
            "task": "Complete AI logging schema coverage",
            "targets": ai_logging["ai_related_files"][:10],
            "why": "Self-automated build and AI operations need full prompt/response/session observability.",
        })

    return queue


def classify_autobuild_state(scores: Dict[str, int], findings: List[str]) -> Dict[str, Any]:
    blockers = []
    ready = True

    if scores["runtime_activation_score"] < 100:
        blockers.append("Runtime bootstrap is not active.")
        ready = False
    if scores["registry_activation_score"] < 100:
        blockers.append("Card registry coverage is incomplete.")
        ready = False
    if scores["route_migration_score"] < 100:
        blockers.append("Legacy page routing still exists.")
        ready = False
    if scores["template_adoption_score"] == 0:
        blockers.append("Dashboard template system is not active.")
        ready = False
    if scores["architecture_integrity_score"] < 70:
        blockers.append("Architecture integrity score is below automated-build threshold.")
        ready = False

    return {
        "autobuild_ready": ready,
        "blockers": blockers,
        "finding_count": len(findings),
        "recommended_threshold": 85,
        "current_integrity_score": scores["architecture_integrity_score"],
    }


def generate_report() -> Dict[str, Any]:
    files = list_source_files()
    files_index = scan_files_index(files)
    graph, reverse_graph, edges = build_import_graph(files)
    reachable = find_reachable([f for f in ENTRY_FILES if f in graph], graph)
    cycles = detect_cycles(graph)

    bootstrap = scan_bootstrap_activation(files_index)
    registry_coverage = scan_registry_coverage(files_index, reverse_graph)
    route_drift = scan_route_drift(files_index)
    template_adoption = scan_template_adoption(files_index, reverse_graph)
    dead_legacy = scan_dead_legacy_pages(files_index, reverse_graph, reachable)
    service_overlap = scan_service_overlap(files_index)
    theme_drift = scan_theme_drift(files)
    ai_logging = scan_ai_logging(files)
    registry_readiness = scan_registry_readiness()
    platform_bypass = scan_platform_bypass(edges)

    scores = build_scores(
        bootstrap=bootstrap,
        registry_coverage=registry_coverage,
        route_drift=route_drift,
        template_adoption=template_adoption,
        dead_legacy=dead_legacy,
        service_overlap=service_overlap,
        theme_drift=theme_drift,
        ai_logging=ai_logging,
        registry_readiness=registry_readiness,
        cycles=cycles,
        platform_bypass=platform_bypass,
    )

    findings = build_findings(
        bootstrap=bootstrap,
        registry_coverage=registry_coverage,
        route_drift=route_drift,
        template_adoption=template_adoption,
        dead_legacy=dead_legacy,
        service_overlap=service_overlap,
        theme_drift=theme_drift,
        cycles=cycles,
        platform_bypass=platform_bypass,
    )

    priority_queue = build_priority_queue(
        bootstrap=bootstrap,
        registry_coverage=registry_coverage,
        route_drift=route_drift,
        template_adoption=template_adoption,
        dead_legacy=dead_legacy,
        theme_drift=theme_drift,
        ai_logging=ai_logging,
        platform_bypass=platform_bypass,
    )

    autobuild_state = classify_autobuild_state(scores, findings)

    return {
        "generated_at": now_iso(),
        "root": rel(ROOT),
        "summary": {
            "source_files_total": len(files),
            "import_edges_total": len(edges),
            "reachable_files_from_entrypoints": len(reachable),
            "circular_chains_detected": len(cycles),
        },
        "bootstrap_activation": bootstrap,
        "registry_coverage": registry_coverage,
        "route_drift": route_drift,
        "template_adoption": template_adoption,
        "dead_legacy_analysis": dead_legacy,
        "service_overlap": service_overlap,
        "theme_drift": theme_drift,
        "ai_logging": ai_logging,
        "registry_readiness": registry_readiness,
        "platform_bypass": platform_bypass,
        "circular_imports": cycles,
        "scores": scores,
        "findings": findings,
        "priority_queue": priority_queue,
        "autobuild_state": autobuild_state,
    }


def write_markdown(report: Dict[str, Any]) -> None:
    lines: List[str] = []

    lines.append("# Platform Activation Audit\n")
    lines.append(f"**Generated:** `{report['generated_at']}`")
    lines.append(f"**Root:** `{report['root']}`\n")

    lines.append("## Autobuild State\n")
    lines.append(f"- **autobuild_ready**: `{report['autobuild_state']['autobuild_ready']}`")
    lines.append(f"- **current_integrity_score**: `{report['autobuild_state']['current_integrity_score']}`")
    lines.append(f"- **recommended_threshold**: `{report['autobuild_state']['recommended_threshold']}`")
    if report["autobuild_state"]["blockers"]:
        lines.append("- **blockers:**")
        for blocker in report["autobuild_state"]["blockers"]:
            lines.append(f"  - {blocker}")
    else:
        lines.append("- **blockers:** none")
    lines.append("")

    lines.append("## Scores\n")
    for key, value in report["scores"].items():
        lines.append(f"- **{key}**: {value}%")
    lines.append("")

    lines.append("## Findings\n")
    for item in report["findings"]:
        lines.append(f"- {item}")
    lines.append("")

    lines.append("## Bootstrap Activation\n")
    for key, value in report["bootstrap_activation"].items():
        lines.append(f"- `{key}`: `{value}`")
    lines.append("")

    lines.append("## Registry Coverage\n")
    lines.append(f"- `registry_exists`: `{report['registry_coverage']['registry_exists']}`")
    lines.append(f"- `card_total`: `{report['registry_coverage']['card_total']}`")
    lines.append(f"- `registered_cards`: `{len(report['registry_coverage']['registered_cards'])}`")
    lines.append(f"- `unregistered_cards`: `{len(report['registry_coverage']['unregistered_cards'])}`")
    lines.append(f"- `orphan_cards`: `{len(report['registry_coverage']['orphan_cards'])}`")
    if report["registry_coverage"]["unregistered_cards"]:
        lines.append("\n### Unregistered Cards")
        for item in report["registry_coverage"]["unregistered_cards"]:
            lines.append(f"- `{item}`")
    if report["registry_coverage"]["orphan_cards"]:
        lines.append("\n### Orphan Cards")
        for item in report["registry_coverage"]["orphan_cards"]:
            lines.append(f"- `{item}`")
    lines.append("")

    lines.append("## Route Drift\n")
    lines.append(f"- `legacy_route_targets`: `{len(report['route_drift']['legacy_route_targets'])}`")
    lines.append(f"- `platform_route_targets`: `{len(report['route_drift']['platform_route_targets'])}`")
    lines.append(f"- `dashboard_route_targets`: `{len(report['route_drift']['dashboard_route_targets'])}`")
    if report["route_drift"]["legacy_route_targets"]:
        lines.append("\n### Legacy Route Targets")
        for item in report["route_drift"]["legacy_route_targets"]:
            lines.append(f"- `{item['file']}` -> {', '.join(item['routes'])}")
    lines.append("")

    lines.append("## Template Adoption\n")
    lines.append(f"- `template_total`: `{report['template_adoption']['template_total']}`")
    lines.append(f"- `unused_templates`: `{len(report['template_adoption']['unused_templates'])}`")
    lines.append(f"- `war_room_template_exists`: `{report['template_adoption']['war_room_template_exists']}`")
    if report["template_adoption"]["templates"]:
        lines.append("\n### Templates")
        for item in report["template_adoption"]["templates"]:
            lines.append(f"- `{item}`")
    if report["template_adoption"]["unused_templates"]:
        lines.append("\n### Unused Templates")
        for item in report["template_adoption"]["unused_templates"]:
            lines.append(f"- `{item}`")
    lines.append("")

    lines.append("## Dead Legacy Analysis\n")
    lines.append(f"- `legacy_pages_total`: `{report['dead_legacy_analysis']['legacy_pages_total']}`")
    lines.append(f"- `unreachable_legacy_pages`: `{len(report['dead_legacy_analysis']['unreachable_legacy_pages'])}`")
    lines.append(f"- `unimported_legacy_pages`: `{len(report['dead_legacy_analysis']['unimported_legacy_pages'])}`")
    if report["dead_legacy_analysis"]["unreachable_legacy_pages"]:
        lines.append("\n### Unreachable Legacy Pages")
        for item in report["dead_legacy_analysis"]["unreachable_legacy_pages"]:
            lines.append(f"- `{item}`")
    lines.append("")

    lines.append("## Service Overlap\n")
    lines.append(f"- `services_total`: `{report['service_overlap']['services_total']}`")
    if report["service_overlap"]["duplicate_service_stems"]:
        lines.append("\n### Duplicate Service Stems")
        for stem, items in report["service_overlap"]["duplicate_service_stems"].items():
            lines.append(f"- `{stem}`")
            for item in items:
                lines.append(f"  - `{item}`")
    else:
        lines.append("- No duplicate service stems detected")
    lines.append("")

    lines.append("## Theme Drift\n")
    lines.append(f"- `theme_provider_exists`: `{report['theme_drift']['theme_provider_exists']}`")
    lines.append(f"- `brand_registry_exists`: `{report['theme_drift']['brand_registry_exists']}`")
    lines.append(f"- `hardcoded_file_total`: `{report['theme_drift']['hardcoded_file_total']}`")
    if report["theme_drift"]["hardcoded_token_findings"]:
        lines.append("\n### Hardcoded Token Findings")
        for token, items in report["theme_drift"]["hardcoded_token_findings"].items():
            lines.append(f"- `{token}`")
            for item in items:
                lines.append(f"  - `{item}`")
    lines.append("")

    lines.append("## AI Logging\n")
    lines.append(f"- `coverage_score`: `{report['ai_logging']['coverage_score']}`")
    lines.append(f"- `ai_related_files`: `{len(report['ai_logging']['ai_related_files'])}`")
    for field, value in report["ai_logging"]["logging_field_coverage"].items():
        lines.append(f"- `{field}`: `{value}`")
    lines.append("")

    lines.append("## Platform Bypass\n")
    for section in ["dashboard_to_modules", "platform_to_modules", "cards_to_modules"]:
        items = report["platform_bypass"][section]
        lines.append(f"- `{section}`: `{len(items)}`")
        for item in items:
            lines.append(f"  - `{item['source']}` -> `{item['target']}` ({item['kind']})")
    lines.append("")

    lines.append("## Circular Imports\n")
    if report["circular_imports"]:
        for cycle in report["circular_imports"]:
            lines.append(f"- {' -> '.join(cycle)}")
    else:
        lines.append("- None detected")
    lines.append("")

    lines.append("## Priority Queue\n")
    for item in report["priority_queue"]:
        lines.append(f"### P{item['priority']} — {item['task']}")
        lines.append(f"- **category**: `{item['category']}`")
        lines.append(f"- **why**: {item['why']}")
        lines.append("- **targets**:")
        for target in item["targets"]:
            lines.append(f"  - `{target}`")
        lines.append("")

    write_text(REPORT_MD, "\n".join(lines))


def write_priority_queue_md(report: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append("# Platform Activation Priority Queue\n")

    if not report["priority_queue"]:
        lines.append("- No priority actions generated.\n")
        write_text(PRIORITY_MD, "\n".join(lines))
        return

    for item in report["priority_queue"]:
        lines.append(f"## P{item['priority']} — {item['task']}\n")
        lines.append(f"- **Category:** `{item['category']}`")
        lines.append(f"- **Why:** {item['why']}")
        lines.append("- **Targets:**")
        for target in item["targets"]:
            lines.append(f"  - `{target}`")
        lines.append("")

    write_text(PRIORITY_MD, "\n".join(lines))


def write_autobuild_queue(report: Dict[str, Any]) -> None:
    payload = {
        "generated_at": report["generated_at"],
        "autobuild_state": report["autobuild_state"],
        "scores": report["scores"],
        "priority_queue": report["priority_queue"],
        "next_pipeline": [
            "Run migration_repo_analyzer.py",
            "Run platform_activation_auditor.py",
            "Read analysis/migration_repo_report.md",
            "Read analysis/platform_activation_audit.md",
            "Execute highest-priority queue item",
            "Run TypeScript build",
            "Repeat until autobuild_ready == true",
        ],
    }
    save_json(AUTOBUILD_JSON, payload)


def main() -> None:
    print("\n" + "=" * 72)
    print(" PLATFORM ACTIVATION AUDITOR ")
    print("=" * 72)
    print("Purpose:")
    print("Validate runtime wiring, card registration, dashboard adoption,")
    print("legacy drift, platform bypass, and automated build readiness.")
    print("=" * 72 + "\n")

    report = generate_report()

    save_json(REPORT_JSON, report)
    write_markdown(report)
    write_priority_queue_md(report)
    write_autobuild_queue(report)

    print("Autobuild Ready:", report["autobuild_state"]["autobuild_ready"])
    print("Architecture Integrity Score:", report["scores"]["architecture_integrity_score"])
    print("\nTop Findings:")
    for item in report["findings"]:
        print(" -", item)

    if report["priority_queue"]:
        print("\nTop Priority:")
        first = report["priority_queue"][0]
        print(f" P{first['priority']} - {first['task']}")
        for target in first["targets"]:
            print("   -", target)

    print("\nReports written:")
    print(f" - {rel(REPORT_JSON)}")
    print(f" - {rel(REPORT_MD)}")
    print(f" - {rel(PRIORITY_MD)}")
    print(f" - {rel(AUTOBUILD_JSON)}")
    print("")


if __name__ == "__main__":
    main()