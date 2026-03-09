from __future__ import annotations

import json
import re
from collections import Counter, defaultdict, deque
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


ROOT = Path('.').resolve()
APP_SRC = ROOT / 'app' / 'src'
NETLIFY_FUNCTIONS = ROOT / 'app' / 'netlify' / 'functions'
ANALYSIS_DIR = ROOT / 'analysis'
ANALYSIS_DIR.mkdir(exist_ok=True)

SYSTEM_GRAPH_JSON = ANALYSIS_DIR / 'system_dependency_graph.json'
SYSTEM_GRAPH_MD = ANALYSIS_DIR / 'system_dependency_graph.md'
CARD_GRAPH_JSON = ANALYSIS_DIR / 'card_dependency_graph.json'
SERVICE_GRAPH_JSON = ANALYSIS_DIR / 'service_dependency_graph.json'
DASHBOARD_GRAPH_JSON = ANALYSIS_DIR / 'dashboard_dependency_graph.json'
HOTSPOTS_MD = ANALYSIS_DIR / 'architecture_hotspots.md'
AUTOBUILD_HINTS_JSON = ANALYSIS_DIR / 'GRAPH_AUTOBUILD_HINTS.json'

SOURCE_SUFFIXES = ('.ts', '.tsx', '.js', '.jsx', '.json')
ENTRY_FILES = [
    'app/src/main.tsx',
    'app/src/App.tsx',
    'app/src/platform/PlatformBootstrap.ts',
]

IMPORT_RE = re.compile(
    r'''import\s+(?:type\s+)?(?:[\w*\s{},]+)\s+from\s+["']([^"']+)["']''',
    re.MULTILINE,
)

DYNAMIC_IMPORT_RE = re.compile(
    r'''import\(\s*["']([^"']+)["']\s*\)''',
    re.MULTILINE,
)

REQUIRE_RE = re.compile(
    r'''require\(\s*["']([^"']+)["']\s*\)''',
    re.MULTILINE,
)

ROUTE_PATH_RE = re.compile(
    r'''path\s*=\s*["']([^"']+)["']''',
    re.MULTILINE,
)

CARD_KEY_RE = re.compile(r'''cardKey\s*:\s*["']([A-Za-z0-9_-]+)["']''')
DASHBOARD_KEY_RE = re.compile(r'''dashboardKey\s*:\s*["']([A-Za-z0-9_-]+)["']''')
FETCH_RE = re.compile(r'''\bfetch\s*\(''')
SUPABASE_RE = re.compile(r'''\bsupabase\b''', re.IGNORECASE)
NETLIFY_CALL_RE = re.compile(r'''/\.netlify/functions/([A-Za-z0-9_-]+)''')
OPENAI_RE = re.compile(r'''\bopenai\b''', re.IGNORECASE)


@dataclass
class Edge:
    source: str
    target: str
    kind: str


@dataclass
class NodeSummary:
    path: str
    category: str
    subcategory: str
    import_in_degree: int
    import_out_degree: int
    reachable_from_entry: bool
    routes: List[str]
    declared_card_keys: List[str]
    declared_dashboard_keys: List[str]
    direct_fetch: bool
    direct_supabase: bool
    netlify_calls: List[str]
    ai_related: bool


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace('\\', '/')
    except Exception:
        return str(path).replace('\\', '/')


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        return ''


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


def save_json(path: Path, data: Any) -> None:
    write_text(path, json.dumps(data, indent=2))


def list_files(base: Path, suffixes: Tuple[str, ...]) -> List[Path]:
    if not base.exists():
        return []
    return sorted([p for p in base.rglob('*') if p.is_file() and p.suffix.lower() in suffixes])


def resolve_import(source_file: Path, import_path: str) -> Optional[Path]:
    if import_path.startswith('.'):
        base = (source_file.parent / import_path).resolve()
        candidates = [
            base,
            base.with_suffix('.ts'),
            base.with_suffix('.tsx'),
            base.with_suffix('.js'),
            base.with_suffix('.jsx'),
            base.with_suffix('.json'),
            base / 'index.ts',
            base / 'index.tsx',
            base / 'index.js',
            base / 'index.jsx',
            base / 'index.json',
        ]
        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return candidate
        return None

    if import_path.startswith('app/'):
        candidate = (ROOT / import_path).resolve()
        candidates = [
            candidate,
            candidate.with_suffix('.ts'),
            candidate.with_suffix('.tsx'),
            candidate.with_suffix('.js'),
            candidate.with_suffix('.jsx'),
            candidate / 'index.ts',
            candidate / 'index.tsx',
            candidate / 'index.js',
            candidate / 'index.jsx',
        ]
        for item in candidates:
            if item.exists() and item.is_file():
                return item

    return None


def parse_edges(file_path: Path) -> List[Edge]:
    text = read_text(file_path)
    edges: List[Edge] = []

    for match in IMPORT_RE.findall(text):
        resolved = resolve_import(file_path, match)
        if resolved:
            edges.append(Edge(rel(file_path), rel(resolved), 'static_import'))

    for match in DYNAMIC_IMPORT_RE.findall(text):
        resolved = resolve_import(file_path, match)
        if resolved:
            edges.append(Edge(rel(file_path), rel(resolved), 'dynamic_import'))

    for match in REQUIRE_RE.findall(text):
        resolved = resolve_import(file_path, match)
        if resolved:
            edges.append(Edge(rel(file_path), rel(resolved), 'require'))

    return edges


def detect_category(path_str: str) -> Tuple[str, str]:
    if path_str.startswith('app/src/cards/'):
        parts = path_str.split('/')
        return 'card', parts[3] if len(parts) > 3 else 'root'
    if path_str.startswith('app/src/dashboards/templates/'):
        return 'dashboard_template', 'template'
    if path_str.startswith('app/src/dashboards/manifests/'):
        return 'dashboard_manifest', 'manifest'
    if path_str.startswith('app/src/dashboards/'):
        return 'dashboard', 'dashboard'
    if path_str.startswith('app/src/platform/registry/'):
        return 'platform_registry', 'registry'
    if path_str.startswith('app/src/platform/defaults/'):
        return 'platform_default', 'default'
    if path_str.startswith('app/src/platform/renderers/'):
        return 'platform_renderer', 'renderer'
    if path_str.startswith('app/src/platform/'):
        return 'platform', 'core'
    if path_str.startswith('app/src/modules/'):
        parts = path_str.split('/')
        return 'legacy_module', parts[3] if len(parts) > 3 else 'module'
    if path_str.startswith('app/src/shared/utils/db/services/'):
        return 'service', 'db_service'
    if path_str.endswith('.service.ts') or path_str.endswith('.service.tsx'):
        return 'service', 'service'
    if path_str.startswith('app/src/shared/utils/db/'):
        return 'database', 'db'
    if path_str.startswith('app/netlify/functions/'):
        return 'netlify_function', 'function'
    if path_str.startswith('app/src/theme/'):
        return 'theme', 'theme'
    if path_str.startswith('app/src/'):
        return 'app_source', 'generic'
    return 'other', 'other'


def find_reachable(entrypoints: Iterable[str], graph: Dict[str, Set[str]]) -> Set[str]:
    visited: Set[str] = set()
    queue: deque[str] = deque()

    for item in entrypoints:
        if item in graph:
            visited.add(item)
            queue.append(item)

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
    seen_keys: Set[Tuple[str, ...]] = set()

    def dfs(node: str) -> None:
        visited.add(node)
        active.add(node)
        stack.append(node)

        for nxt in graph.get(node, set()):
            if nxt not in visited:
                dfs(nxt)
            elif nxt in active and nxt in stack:
                idx = stack.index(nxt)
                cycle = stack[idx:] + [nxt]
                key = tuple(cycle)
                if key not in seen_keys:
                    seen_keys.add(key)
                    cycles.append(cycle)

        stack.pop()
        active.remove(node)

    for node in sorted(graph.keys()):
        if node not in visited:
            dfs(node)

    return cycles[:100]


def build_graph(files: List[Path]) -> Tuple[Dict[str, Set[str]], Dict[str, Set[str]], List[Edge]]:
    graph: Dict[str, Set[str]] = defaultdict(set)
    reverse_graph: Dict[str, Set[str]] = defaultdict(set)
    edges: List[Edge] = []

    for file_path in files:
        file_rel = rel(file_path)
        graph.setdefault(file_rel, set())
        reverse_graph.setdefault(file_rel, set())

        for edge in parse_edges(file_path):
            graph[edge.source].add(edge.target)
            reverse_graph[edge.target].add(edge.source)
            edges.append(edge)

    return graph, reverse_graph, edges


def collect_metadata(files: List[Path], reverse_graph: Dict[str, Set[str]], graph: Dict[str, Set[str]], reachable: Set[str]) -> Dict[str, NodeSummary]:
    metadata: Dict[str, NodeSummary] = {}

    for file_path in files:
        path_str = rel(file_path)
        text = read_text(file_path)
        category, subcategory = detect_category(path_str)

        metadata[path_str] = NodeSummary(
            path=path_str,
            category=category,
            subcategory=subcategory,
            import_in_degree=len(reverse_graph.get(path_str, set())),
            import_out_degree=len(graph.get(path_str, set())),
            reachable_from_entry=path_str in reachable,
            routes=sorted(set(ROUTE_PATH_RE.findall(text))),
            declared_card_keys=sorted(set(CARD_KEY_RE.findall(text))),
            declared_dashboard_keys=sorted(set(DASHBOARD_KEY_RE.findall(text))),
            direct_fetch=bool(FETCH_RE.search(text)),
            direct_supabase=bool(SUPABASE_RE.search(text)),
            netlify_calls=sorted(set(NETLIFY_CALL_RE.findall(text))),
            ai_related=bool(OPENAI_RE.search(text) or 'ai' in file_path.name.lower()),
        )

    return metadata


def build_dashboard_card_links(files: List[Path], metadata: Dict[str, NodeSummary], graph: Dict[str, Set[str]]) -> Dict[str, Any]:
    card_key_to_file: Dict[str, str] = {}
    for path_str, meta in metadata.items():
        if meta.category == 'card' and path_str.endswith('Card.tsx'):
            stem = Path(path_str).stem
            key = stem.replace('Card', '')
            if key:
                key = key[0].lower() + key[1:]
                card_key_to_file[key] = path_str

    dashboard_map: Dict[str, Dict[str, Any]] = {}

    for path_str, meta in metadata.items():
        if meta.category not in {'dashboard', 'dashboard_template', 'dashboard_manifest'}:
            continue

        linked_cards: Set[str] = set()

        for target in graph.get(path_str, set()):
            if metadata.get(target) and metadata[target].category == 'card':
                linked_cards.add(target)

        for card_key in meta.declared_card_keys:
            target = card_key_to_file.get(card_key)
            if target:
                linked_cards.add(target)

        dashboard_map[path_str] = {
            'dashboard_keys': meta.declared_dashboard_keys,
            'routes': meta.routes,
            'linked_cards': sorted(linked_cards),
            'category': meta.category,
        }

    return dashboard_map


def build_card_service_links(metadata: Dict[str, NodeSummary], graph: Dict[str, Set[str]]) -> Dict[str, Any]:
    results: Dict[str, Any] = {}

    for path_str, meta in metadata.items():
        if meta.category != 'card':
            continue

        direct_services = sorted([t for t in graph.get(path_str, set()) if metadata.get(t) and metadata[t].category == 'service'])
        direct_database = sorted([t for t in graph.get(path_str, set()) if metadata.get(t) and metadata[t].category == 'database'])
        direct_legacy = sorted([t for t in graph.get(path_str, set()) if metadata.get(t) and metadata[t].category == 'legacy_module'])

        results[path_str] = {
            'direct_services': direct_services,
            'direct_database': direct_database,
            'direct_legacy_imports': direct_legacy,
            'direct_fetch': meta.direct_fetch,
            'direct_supabase': meta.direct_supabase,
            'netlify_calls': meta.netlify_calls,
        }

    return results


def build_service_consumers(metadata: Dict[str, NodeSummary], reverse_graph: Dict[str, Set[str]]) -> Dict[str, Any]:
    results: Dict[str, Any] = {}

    for path_str, meta in metadata.items():
        if meta.category != 'service':
            continue

        consumers = sorted(reverse_graph.get(path_str, set()))
        results[path_str] = {
            'consumers': consumers,
            'card_consumers': [c for c in consumers if metadata.get(c) and metadata[c].category == 'card'],
            'dashboard_consumers': [c for c in consumers if metadata.get(c) and metadata[c].category.startswith('dashboard')],
            'legacy_consumers': [c for c in consumers if metadata.get(c) and metadata[c].category == 'legacy_module'],
            'platform_consumers': [c for c in consumers if metadata.get(c) and metadata[c].category.startswith('platform')],
        }

    return results


def build_hotspots(metadata: Dict[str, NodeSummary], reverse_graph: Dict[str, Set[str]], graph: Dict[str, Set[str]], cycles: List[List[str]]) -> Dict[str, Any]:
    cycle_nodes = Counter(node for cycle in cycles for node in cycle)
    hotspots = []

    for path_str, meta in metadata.items():
        risk_flags: List[str] = []

        if meta.import_in_degree >= 8:
            risk_flags.append('high_inbound_dependency')
        if meta.import_out_degree >= 10:
            risk_flags.append('high_outbound_dependency')
        if cycle_nodes.get(path_str, 0) > 0:
            risk_flags.append('circular_dependency_member')
        if meta.category == 'card' and (meta.direct_fetch or meta.direct_supabase):
            risk_flags.append('card_contains_direct_data_access')
        if meta.category == 'card':
            direct_targets = graph.get(path_str, set())
            if any(metadata.get(t) and metadata[t].category == 'legacy_module' for t in direct_targets):
                risk_flags.append('card_imports_legacy_module')
        if meta.category.startswith('platform'):
            direct_targets = graph.get(path_str, set())
            if any(metadata.get(t) and metadata[t].category == 'legacy_module' for t in direct_targets):
                risk_flags.append('platform_imports_legacy_module')
        if meta.category == 'legacy_module' and meta.reachable_from_entry:
            risk_flags.append('reachable_legacy_runtime_path')

        if risk_flags:
            hotspots.append({
                'path': path_str,
                'category': meta.category,
                'subcategory': meta.subcategory,
                'import_in_degree': meta.import_in_degree,
                'import_out_degree': meta.import_out_degree,
                'risk_flags': risk_flags,
            })

    hotspots.sort(key=lambda item: (len(item['risk_flags']), item['import_in_degree'] + item['import_out_degree']), reverse=True)

    return {
        'hotspots': hotspots[:50],
        'cycle_membership_counts': dict(cycle_nodes),
    }


def build_autobuild_hints(metadata: Dict[str, NodeSummary], dashboard_links: Dict[str, Any], card_service_links: Dict[str, Any], service_consumers: Dict[str, Any], hotspots: Dict[str, Any]) -> Dict[str, Any]:
    orphan_cards = sorted([
        path for path, meta in metadata.items()
        if meta.category == 'card' and meta.import_in_degree == 0 and not any(path in item.get('linked_cards', []) for item in dashboard_links.values())
    ])

    cards_needing_service_extraction = sorted([
        path for path, info in card_service_links.items()
        if info['direct_fetch'] or info['direct_supabase'] or info['direct_database']
    ])

    underused_services = sorted([
        path for path, info in service_consumers.items() if len(info['consumers']) <= 1
    ])

    legacy_runtime_files = sorted([
        path for path, meta in metadata.items()
        if meta.category == 'legacy_module' and meta.reachable_from_entry
    ])

    priority_queue: List[Dict[str, Any]] = []

    if legacy_runtime_files:
        priority_queue.append({
            'priority': 1,
            'task': 'Reduce active legacy runtime surface',
            'targets': legacy_runtime_files[:15],
            'why': 'Reachable legacy modules are still part of the live execution path.',
        })

    if cards_needing_service_extraction:
        priority_queue.append({
            'priority': 2,
            'task': 'Extract card-level data access into services',
            'targets': cards_needing_service_extraction[:15],
            'why': 'Cards should compose capabilities, not own raw fetch or database access.',
        })

    if orphan_cards:
        priority_queue.append({
            'priority': 3,
            'task': 'Register or place orphan cards into dashboards',
            'targets': orphan_cards[:15],
            'why': 'Orphan cards are build waste until attached to registry and dashboard composition.',
        })

    hotspot_targets = [item['path'] for item in hotspots.get('hotspots', [])[:15]]
    if hotspot_targets:
        priority_queue.append({
            'priority': 4,
            'task': 'Refactor dependency hotspots',
            'targets': hotspot_targets,
            'why': 'High-dependency hubs and circular members create brittle automation paths.',
        })

    if underused_services:
        priority_queue.append({
            'priority': 5,
            'task': 'Review underused services for consolidation or onboarding',
            'targets': underused_services[:15],
            'why': 'Low-consumption services may be dead, mislocated, or missing capability registration.',
        })

    return {
        'orphan_cards': orphan_cards,
        'cards_needing_service_extraction': cards_needing_service_extraction,
        'underused_services': underused_services,
        'legacy_runtime_files': legacy_runtime_files,
        'priority_queue': priority_queue,
    }


def build_system_report(files: List[Path], metadata: Dict[str, NodeSummary], edges: List[Edge], reachable: Set[str], cycles: List[List[str]]) -> Dict[str, Any]:
    category_counts = Counter(meta.category for meta in metadata.values())
    subcategory_counts = Counter(f'{meta.category}:{meta.subcategory}' for meta in metadata.values())

    return {
        'generated_at': now_iso(),
        'root': rel(ROOT),
        'summary': {
            'source_files_total': len(files),
            'nodes_total': len(metadata),
            'edges_total': len(edges),
            'reachable_from_entry_total': len(reachable),
            'cycle_count': len(cycles),
        },
        'category_counts': dict(category_counts),
        'subcategory_counts': dict(subcategory_counts),
        'entry_files': [entry for entry in ENTRY_FILES if entry in metadata],
        'nodes': [asdict(meta) for meta in metadata.values()],
        'edges': [asdict(edge) for edge in edges],
        'cycles': cycles,
    }


def write_system_markdown(system_report: Dict[str, Any], dashboard_links: Dict[str, Any], card_service_links: Dict[str, Any], service_consumers: Dict[str, Any], hotspots: Dict[str, Any], autobuild_hints: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append('# System Dependency Graph\n')
    lines.append(f"**Generated:** `{system_report['generated_at']}`")
    lines.append(f"**Root:** `{system_report['root']}`\n")

    lines.append('## Summary\n')
    for key, value in system_report['summary'].items():
        lines.append(f'- **{key}**: {value}')
    lines.append('')

    lines.append('## Category Counts\n')
    for key, value in sorted(system_report['category_counts'].items()):
        lines.append(f'- `{key}`: {value}')
    lines.append('')

    lines.append('## Entry Files\n')
    for item in system_report['entry_files']:
        lines.append(f'- `{item}`')
    if not system_report['entry_files']:
        lines.append('- None detected')
    lines.append('')

    lines.append('## Dependency Hotspots\n')
    if hotspots['hotspots']:
        for item in hotspots['hotspots'][:20]:
            lines.append(f"- `{item['path']}` — {', '.join(item['risk_flags'])} (in={item['import_in_degree']}, out={item['import_out_degree']})")
    else:
        lines.append('- None detected')
    lines.append('')

    lines.append('## Dashboard to Card Links\n')
    if dashboard_links:
        for path_str, info in dashboard_links.items():
            lines.append(f"- `{path_str}`")
            if info['dashboard_keys']:
                lines.append(f"  - dashboard_keys: {', '.join(info['dashboard_keys'])}")
            if info['routes']:
                lines.append(f"  - routes: {', '.join(info['routes'])}")
            if info['linked_cards']:
                lines.append('  - linked_cards:')
                for card in info['linked_cards']:
                    lines.append(f'    - `{card}`')
            else:
                lines.append('  - linked_cards: none detected')
    else:
        lines.append('- No dashboard files detected')
    lines.append('')

    lines.append('## Card to Service Links\n')
    if card_service_links:
        for path_str, info in sorted(card_service_links.items()):
            lines.append(f"- `{path_str}`")
            if info['direct_services']:
                lines.append('  - direct_services:')
                for item in info['direct_services']:
                    lines.append(f'    - `{item}`')
            if info['direct_database']:
                lines.append('  - direct_database:')
                for item in info['direct_database']:
                    lines.append(f'    - `{item}`')
            if info['direct_legacy_imports']:
                lines.append('  - direct_legacy_imports:')
                for item in info['direct_legacy_imports']:
                    lines.append(f'    - `{item}`')
            if info['netlify_calls']:
                lines.append(f"  - netlify_calls: {', '.join(info['netlify_calls'])}")
            lines.append(f"  - direct_fetch: {info['direct_fetch']}")
            lines.append(f"  - direct_supabase: {info['direct_supabase']}")
    else:
        lines.append('- No cards detected')
    lines.append('')

    lines.append('## Service Consumers\n')
    if service_consumers:
        for path_str, info in sorted(service_consumers.items()):
            lines.append(f"- `{path_str}` — consumers={len(info['consumers'])}")
            if info['card_consumers']:
                lines.append(f"  - card_consumers: {len(info['card_consumers'])}")
            if info['legacy_consumers']:
                lines.append(f"  - legacy_consumers: {len(info['legacy_consumers'])}")
            if info['platform_consumers']:
                lines.append(f"  - platform_consumers: {len(info['platform_consumers'])}")
    else:
        lines.append('- No services detected')
    lines.append('')

    lines.append('## Circular Imports\n')
    if system_report['cycles']:
        for cycle in system_report['cycles'][:20]:
            lines.append(f"- {' -> '.join(cycle)}")
    else:
        lines.append('- None detected')
    lines.append('')

    lines.append('## Autobuild Hints\n')
    if autobuild_hints['priority_queue']:
        for item in autobuild_hints['priority_queue']:
            lines.append(f"### P{item['priority']} — {item['task']}")
            lines.append(f"- **why:** {item['why']}")
            lines.append('- **targets:**')
            for target in item['targets']:
                lines.append(f"  - `{target}`")
            lines.append('')
    else:
        lines.append('- No priority hints generated')

    write_text(SYSTEM_GRAPH_MD, '\n'.join(lines))


def write_hotspots_markdown(hotspots: Dict[str, Any], autobuild_hints: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append('# Architecture Hotspots\n')

    if hotspots['hotspots']:
        for item in hotspots['hotspots']:
            lines.append(f"## `{item['path']}`\n")
            lines.append(f"- **category:** `{item['category']}`")
            lines.append(f"- **subcategory:** `{item['subcategory']}`")
            lines.append(f"- **import_in_degree:** {item['import_in_degree']}")
            lines.append(f"- **import_out_degree:** {item['import_out_degree']}")
            lines.append(f"- **risk_flags:** {', '.join(item['risk_flags'])}\n")
    else:
        lines.append('- No hotspots detected\n')

    lines.append('## Priority Queue\n')
    if autobuild_hints['priority_queue']:
        for item in autobuild_hints['priority_queue']:
            lines.append(f"- **P{item['priority']} {item['task']}**")
            for target in item['targets']:
                lines.append(f"  - `{target}`")
    else:
        lines.append('- No queued actions')

    write_text(HOTSPOTS_MD, '\n'.join(lines))


def main() -> None:
    print('\n' + '=' * 72)
    print(' ARCHITECTURE GRAPH BUILDER ')
    print('=' * 72)
    print('Purpose:')
    print('Build the dependency graph that later tools use for capability,')
    print('dashboard, service, and autobuild decisions.')
    print('=' * 72 + '\n')

    files = list_files(APP_SRC, SOURCE_SUFFIXES)
    if NETLIFY_FUNCTIONS.exists():
        files.extend(list_files(NETLIFY_FUNCTIONS, ('.ts', '.js')))
    files = sorted(set(files))

    graph, reverse_graph, edges = build_graph(files)
    reachable = find_reachable([entry for entry in ENTRY_FILES if entry in graph], graph)
    cycles = detect_cycles(graph)
    metadata = collect_metadata(files, reverse_graph, graph, reachable)

    system_report = build_system_report(files, metadata, edges, reachable, cycles)
    dashboard_links = build_dashboard_card_links(files, metadata, graph)
    card_service_links = build_card_service_links(metadata, graph)
    service_consumers = build_service_consumers(metadata, reverse_graph)
    hotspots = build_hotspots(metadata, reverse_graph, graph, cycles)
    autobuild_hints = build_autobuild_hints(metadata, dashboard_links, card_service_links, service_consumers, hotspots)

    save_json(SYSTEM_GRAPH_JSON, system_report)
    save_json(CARD_GRAPH_JSON, card_service_links)
    save_json(SERVICE_GRAPH_JSON, service_consumers)
    save_json(DASHBOARD_GRAPH_JSON, dashboard_links)
    save_json(AUTOBUILD_HINTS_JSON, autobuild_hints)

    write_system_markdown(system_report, dashboard_links, card_service_links, service_consumers, hotspots, autobuild_hints)
    write_hotspots_markdown(hotspots, autobuild_hints)

    print('Nodes:', system_report['summary']['nodes_total'])
    print('Edges:', system_report['summary']['edges_total'])
    print('Cycles:', system_report['summary']['cycle_count'])
    print('Reachable from entry:', system_report['summary']['reachable_from_entry_total'])
    print('\nTop autobuild priorities:')
    if autobuild_hints['priority_queue']:
        for item in autobuild_hints['priority_queue'][:5]:
            print(f" - P{item['priority']}: {item['task']}")
    else:
        print(' - None generated')

    print('\nReports written:')
    print(f' - {rel(SYSTEM_GRAPH_JSON)}')
    print(f' - {rel(SYSTEM_GRAPH_MD)}')
    print(f' - {rel(CARD_GRAPH_JSON)}')
    print(f' - {rel(SERVICE_GRAPH_JSON)}')
    print(f' - {rel(DASHBOARD_GRAPH_JSON)}')
    print(f' - {rel(HOTSPOTS_MD)}')
    print(f' - {rel(AUTOBUILD_HINTS_JSON)}')
    print('')


if __name__ == '__main__':
    main()
