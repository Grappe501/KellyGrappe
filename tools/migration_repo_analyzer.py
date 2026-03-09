from __future__ import annotations

import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple


ROOT = Path(".").resolve()
ANALYSIS_DIR = ROOT / "analysis"
ANALYSIS_DIR.mkdir(exist_ok=True)

SNAPSHOT_FILE = ANALYSIS_DIR / ".migration_snapshot.json"
HISTORY_FILE = ANALYSIS_DIR / "migration_build_history.json"


# ---------------------------------------------------------------------------
# BASIC HELPERS
# ---------------------------------------------------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def rel(p: Path) -> str:
    try:
      return str(p.relative_to(ROOT)).replace("\\", "/")
    except Exception:
      return str(p).replace("\\", "/")


def exists(path_str: str) -> bool:
    return (ROOT / path_str).exists()


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save_json(path: Path, data: Any) -> None:
    write_text(path, json.dumps(data, indent=2))


def find_files(base: Path, suffixes: Tuple[str, ...]) -> List[Path]:
    if not base.exists():
        return []
    return sorted(
        [p for p in base.rglob("*") if p.is_file() and p.suffix.lower() in suffixes]
    )


def file_sha1(path: Path) -> str:
    h = hashlib.sha1()
    try:
        with path.open("rb") as f:
            while True:
                chunk = f.read(8192)
                if not chunk:
                    break
                h.update(chunk)
    except Exception:
        return ""
    return h.hexdigest()


# ---------------------------------------------------------------------------
# REPO TARGET DEFINITIONS
# ---------------------------------------------------------------------------

ROOT_DOCS = [
    "MASTER_BUILD_PATH.md",
    "ARCHITECTURE_MAP.md",
    "DEVELOPER_RULES.md",
    "SYSTEM_OVERVIEW.md",
    "README_APPLY_FIRST.md",
]

TARGET_SPINE = {
    "platform_bootstrap": "app/src/platform/PlatformBootstrap.ts",
    "platform_registry_folder": "app/src/platform/registry",
    "platform_defaults_folder": "app/src/platform/defaults",
    "platform_renderers_folder": "app/src/platform/renderers",
    "card_registry_loader": "app/src/cards/registry.ts",
    "cards_index": "app/src/cards/index.ts",
    "dashboard_renderer": "app/src/platform/renderers/DashboardRenderer.tsx",
    "card_renderer": "app/src/platform/renderers/CardRenderer.tsx",
    "war_room_template": "app/src/dashboards/templates/warRoom.template.ts",
    "card_types_folder": "app/src/cards/types",
}

PLATFORM_REGISTRY_FILES = [
    "app/src/platform/registry/card.registry.ts",
    "app/src/platform/registry/dashboard.registry.ts",
    "app/src/platform/registry/role.registry.ts",
    "app/src/platform/registry/microroom.registry.ts",
    "app/src/platform/registry/feature.registry.ts",
    "app/src/platform/registry/brand.registry.ts",
    "app/src/platform/registry/index.ts",
]

DEFAULTS_FILES = [
    "app/src/platform/defaults/default.features.ts",
    "app/src/platform/defaults/default.roles.ts",
    "app/src/platform/defaults/default.microrooms.ts",
    "app/src/platform/defaults/default.brands.ts",
    "app/src/platform/defaults/index.ts",
]

CARD_TYPE_FILES = [
    "app/src/cards/types/primitives.types.ts",
    "app/src/cards/types/featureFlags.types.ts",
    "app/src/cards/types/workspace.types.ts",
    "app/src/cards/types/cardLayout.types.ts",
    "app/src/cards/types/cardAI.types.ts",
    "app/src/cards/types/cardData.types.ts",
    "app/src/cards/types/cardDefinition.types.ts",
    "app/src/cards/types/dashboard.types.ts",
    "app/src/cards/types/microroom.types.ts",
    "app/src/cards/types/roles.types.ts",
    "app/src/cards/types/registry.types.ts",
    "app/src/cards/types/analytics.types.ts",
    "app/src/cards/types/theme.types.ts",
    "app/src/cards/types/helpers.types.ts",
    "app/src/cards/types/index.ts",
]

TARGET_CARD_DIRS = [
    "app/src/cards/command",
    "app/src/cards/messaging",
    "app/src/cards/metrics",
    "app/src/cards/operations",
    "app/src/cards/social",
    "app/src/cards/fundraising",
    "app/src/cards/intake",
    "app/src/cards/ai",
]

LEGACY_SIGNALS = [
    "app/src/modules/dashboard/WarRoomDashboardPage.tsx",
    "app/src/modules/liveContact/LiveContactPage.tsx",
    "app/src/modules/CONTACT_IMPORT/ContactImportPage.tsx",
    "app/src/modules/businessCardScan/BusinessCardScanPage.tsx",
]

SHARED_SERVICE_FILES = [
    "app/src/shared/utils/db/services/contacts.service.ts",
    "app/src/shared/utils/db/services/followups.service.ts",
    "app/src/shared/utils/db/services/voterMatching.service.ts",
    "app/src/shared/utils/db/services/relationships.service.ts",
    "app/src/shared/utils/db/services/media.service.ts",
    "app/src/shared/utils/db/services/origins.service.ts",
]

BUILD_CONFIG_FILES = [
    "app/package.json",
    "app/tsconfig.json",
    "app/vite.config.ts",
    "app/vite.config.js",
    "netlify.toml",
    "app/src/main.tsx",
    "app/src/App.tsx",
]


# ---------------------------------------------------------------------------
# SCANNERS
# ---------------------------------------------------------------------------

def scan_repo_files() -> Dict[str, Dict[str, Any]]:
    tracked: Dict[str, Dict[str, Any]] = {}


    for p in find_files(ROOT / "app" / "src", (".ts", ".tsx", ".md", ".json")):
        tracked[rel(p)] = {
            "sha1": file_sha1(p),
            "size": p.stat().st_size,
        }

    for p in find_files(ROOT / "app" / "netlify" / "functions", (".ts", ".js")):
        tracked[rel(p)] = {
            "sha1": file_sha1(p),
            "size": p.stat().st_size,
        }

    for name in ROOT_DOCS:
        p = ROOT / name
        if p.exists():
            tracked[rel(p)] = {
                "sha1": file_sha1(p),
                "size": p.stat().st_size,
            }

    return tracked


def scan_docs() -> Dict[str, bool]:
    return {name: exists(name) for name in ROOT_DOCS}


def scan_target_spine() -> Dict[str, bool]:
    return {key: exists(path) for key, path in TARGET_SPINE.items()}


def scan_platform_registries() -> Dict[str, bool]:
    return {path: exists(path) for path in PLATFORM_REGISTRY_FILES}


def scan_defaults() -> Dict[str, bool]:
    return {path: exists(path) for path in DEFAULTS_FILES}


def scan_card_types() -> Dict[str, bool]:
    return {path: exists(path) for path in CARD_TYPE_FILES}


def scan_target_card_dirs() -> Dict[str, bool]:
    return {path: exists(path) for path in TARGET_CARD_DIRS}


def scan_legacy_signals() -> Dict[str, bool]:
    return {path: exists(path) for path in LEGACY_SIGNALS}


def scan_shared_services() -> Dict[str, bool]:
    return {path: exists(path) for path in SHARED_SERVICE_FILES}


def scan_build_configs() -> Dict[str, bool]:
    return {path: exists(path) for path in BUILD_CONFIG_FILES}


def scan_counts() -> Dict[str, int]:
    app_src = ROOT / "app" / "src"
    modules_dir = app_src / "modules"
    cards_dir = app_src / "cards"
    netlify_dir = ROOT / "app" / "netlify" / "functions"

    ts_files = find_files(app_src, (".ts", ".tsx"))
    netlify_files = find_files(netlify_dir, (".ts", ".js"))

    card_related_files = []
    if cards_dir.exists():
        for p in find_files(cards_dir, (".ts", ".tsx")):
            if p.name.endswith("Card.tsx") or p.name.endswith(".register.ts"):
                card_related_files.append(p)

    legacy_module_files = []
    if modules_dir.exists():
        legacy_module_files = find_files(modules_dir, (".ts", ".tsx"))

    return {
        "ts_total": len(ts_files),
        "netlify_functions_total": len(netlify_files),
        "card_related_files": len(card_related_files),
        "legacy_module_files": len(legacy_module_files),
    }


def scan_card_files() -> List[str]:
    cards_dir = ROOT / "app" / "src" / "cards"
    out: List[str] = []
    if cards_dir.exists():
        for p in find_files(cards_dir, (".ts", ".tsx")):
            if p.name.endswith("Card.tsx") or p.name.endswith(".register.ts"):
                out.append(rel(p))
    return out


def scan_registry_imports() -> List[str]:
    registry_file = ROOT / "app" / "src" / "cards" / "registry.ts"
    if not registry_file.exists():
        return []
    text = read_text(registry_file)
    imports = []
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("import "):
            imports.append(s)
    return imports


def scan_dashboard_templates() -> List[str]:
    templates_dir = ROOT / "app" / "src" / "dashboards" / "templates"
    if not templates_dir.exists():
        return []
    return [rel(p) for p in find_files(templates_dir, (".ts", ".tsx"))]


def scan_netlify_functions() -> List[str]:
    base = ROOT / "app" / "netlify" / "functions"
    if not base.exists():
        return []
    return [rel(p) for p in find_files(base, (".ts", ".js"))]


def scan_card_candidates() -> List[Dict[str, str]]:
    candidates: List[Dict[str, str]] = []

    patterns = [
        ("app/src/modules/businessCardScan/BusinessCardScanPage.tsx", "cards/intake/BusinessCardScannerCard.tsx", "intake"),
        ("app/src/modules/CONTACT_IMPORT/ContactImportPage.tsx", "cards/intake/ContactImportCard.tsx", "intake"),
        ("app/src/modules/liveContact/LiveContactPage.tsx", "cards/intake/LiveContactCard.tsx", "intake"),
        ("app/src/modules/eventRequests/EventRequestPage.tsx", "cards/intake/EventRequestCard.tsx", "intake"),
        ("app/src/modules/contacts/ContactsDirectoryPage.tsx", "cards/operations/ContactsDirectoryCard.tsx", "operations"),
    ]

    for old_path, new_path, category in patterns:
        if exists(old_path):
            candidates.append({
                "source": old_path,
                "suggested_target": f"app/src/{new_path}",
                "category": category,
            })

    return candidates


def scan_theme_readiness() -> Dict[str, List[str]]:
    findings = {
        "hardcoded_brand_classes": [],
        "hardcoded_brand_tokens": [],
    }
    app_src = ROOT / "app" / "src"
    if not app_src.exists():
        return findings

    suspicious_tokens = [
        "bg-indigo-",
        "text-indigo-",
        "bg-red-",
        "text-red-",
        "bg-blue-",
        "text-blue-",
        "#4338ca",
        "#2563eb",
        "#dc2626",
    ]

    for p in find_files(app_src, (".ts", ".tsx")):
        text = read_text(p)
        for token in suspicious_tokens:
            if token in text:
                findings["hardcoded_brand_tokens"].append(rel(p))
                break

    findings["hardcoded_brand_tokens"] = sorted(set(findings["hardcoded_brand_tokens"]))
    return findings


def scan_ai_logging_readiness() -> Dict[str, Any]:
    app_src = ROOT / "app" / "src"
    netlify = ROOT / "app" / "netlify" / "functions"
    ai_related: List[str] = []

    for base in [app_src, netlify]:
        if not base.exists():
            continue
        for p in find_files(base, (".ts", ".tsx", ".js")):
            text = read_text(p).lower()
            if "openai" in text or "ai" in p.name.lower():
                ai_related.append(rel(p))

    required_fields = [
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

    coverage = {f: False for f in required_fields}
    corpus = "\n".join(read_text(ROOT / p) for p in ai_related if (ROOT / p).exists()).lower()
    for f in required_fields:
        coverage[f] = f in corpus

    return {
        "ai_related_files": sorted(set(ai_related)),
        "logging_field_coverage": coverage,
    }


# ---------------------------------------------------------------------------
# INTERPRETATION / SCORING
# ---------------------------------------------------------------------------

def interpret_state(
    docs_ok: bool,
    spine_count: int,
    registry_count: int,
    defaults_count: int,
    card_types_count: int,
    legacy_count: int,
    card_dirs_count: int,
) -> str:
    if legacy_count > 0 and (spine_count > 0 or registry_count > 0 or card_dirs_count > 0):
        return (
            "Repository is in active migration state: legacy module/page structure and "
            "new platform/card/registry structure coexist intentionally."
        )
    if spine_count == 0 and registry_count == 0:
        return "Repository appears to be mostly legacy structure with little or no platform spine yet."
    if spine_count > 0 and registry_count > 0 and defaults_count > 0:
        return (
            "New platform spine is materially present. Continue building forward into "
            "registry/template/renderer architecture."
        )
    return "Repository contains partial migration toward platform architecture."


def score_section(found: int, total: int) -> int:
    if total <= 0:
        return 0
    return round((found / total) * 100)


def build_architecture_score(result: Dict[str, Any]) -> Dict[str, int]:
    docs_score = score_section(sum(result["docs_present"].values()), len(result["docs_present"]))
    spine_score = score_section(sum(result["target_spine"].values()), len(result["target_spine"]))
    registries_score = score_section(sum(result["platform_registries"].values()), len(result["platform_registries"]))
    defaults_score = score_section(sum(result["platform_defaults"].values()), len(result["platform_defaults"]))
    card_types_score = score_section(sum(result["card_type_system"].values()), len(result["card_type_system"]))
    services_score = score_section(sum(result["shared_services"].values()), len(result["shared_services"]))

    overall = round(
        (
            docs_score
            + spine_score
            + registries_score
            + defaults_score
            + card_types_score
            + services_score
        ) / 6
    )

    return {
        "docs_score": docs_score,
        "platform_spine_score": spine_score,
        "registry_score": registries_score,
        "defaults_score": defaults_score,
        "card_type_system_score": card_types_score,
        "shared_services_score": services_score,
        "overall_platform_readiness": overall,
    }


# ---------------------------------------------------------------------------
# DELTA TRACKING
# ---------------------------------------------------------------------------

def build_snapshot(tracked_files: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "generated_at": now_iso(),
        "files": tracked_files,
    }


def compute_delta(prev: Dict[str, Any], curr: Dict[str, Any]) -> Dict[str, Any]:
    prev_files = prev.get("files", {})
    curr_files = curr.get("files", {})

    prev_keys = set(prev_files.keys())
    curr_keys = set(curr_files.keys())

    new_files = sorted(curr_keys - prev_keys)
    removed_files = sorted(prev_keys - curr_keys)

    modified_files = []
    for key in sorted(curr_keys & prev_keys):
        if prev_files[key].get("sha1") != curr_files[key].get("sha1"):
            modified_files.append(key)

    return {
        "new_files": new_files,
        "removed_files": removed_files,
        "modified_files": modified_files,
    }


def update_build_history(summary: Dict[str, Any]) -> List[Dict[str, Any]]:
    history = load_json(HISTORY_FILE, [])
    history.append(summary)
    save_json(HISTORY_FILE, history)
    return history


# ---------------------------------------------------------------------------
# DRIFT DETECTION
# ---------------------------------------------------------------------------

def detect_architecture_drift(result: Dict[str, Any]) -> List[str]:
    drift: List[str] = []

    # dashboards hardwired in legacy module area
    if exists("app/src/modules/dashboard/WarRoomDashboardPage.tsx") and not exists("app/src/dashboards/templates/warRoom.template.ts"):
        drift.append(
            "Legacy WarRoomDashboardPage exists without completed template-driven dashboard replacement."
        )

    # registry missing while cards folder exists
    if exists("app/src/cards") and not exists("app/src/cards/registry.ts"):
        drift.append("Cards folder exists but cards/registry.ts is missing.")

    # platform bootstrap missing while registries exist
    platform_registry_count = sum(result["platform_registries"].values())
    if platform_registry_count > 0 and not exists("app/src/platform/PlatformBootstrap.ts"):
        drift.append("Platform registries exist but PlatformBootstrap.ts is missing.")

    # old dashboard components may indicate unfinished migration
    legacy_component_dir = ROOT / "app" / "src" / "modules" / "dashboard" / "components"
    if legacy_component_dir.exists():
        legacy_cards = [p for p in find_files(legacy_component_dir, (".tsx", ".ts")) if p.name.endswith("Card.tsx")]
        if legacy_cards:
            drift.append("Legacy dashboard/components still contains card-like files pending migration to app/src/cards/.")

    # no theme provider
    if exists("app/src/platform/registry/brand.registry.ts") and not exists("app/src/theme/ThemeProvider.tsx"):
        drift.append("Brand registry exists but ThemeProvider.tsx is missing.")

    return drift


# ---------------------------------------------------------------------------
# NEXT BUILD RECOMMENDER
# ---------------------------------------------------------------------------

def recommend_next_files(result: Dict[str, Any]) -> List[str]:
    recs: List[str] = []

    if not result["target_spine"].get("platform_bootstrap", False):
        recs.append("app/src/platform/PlatformBootstrap.ts")

    if not result["target_spine"].get("card_registry_loader", False):
        recs.append("app/src/cards/registry.ts")

    if not result["target_spine"].get("card_renderer", False):
        recs.append("app/src/platform/renderers/CardRenderer.tsx")

    if not result["target_spine"].get("dashboard_renderer", False):
        recs.append("app/src/platform/renderers/DashboardRenderer.tsx")

    if not result["target_spine"].get("war_room_template", False):
        recs.append("app/src/dashboards/templates/warRoom.template.ts")

    if not result["shared_services"].get("app/src/shared/utils/db/services/contacts.service.ts", False):
        recs.append("app/src/shared/utils/db/services/contacts.service.ts")

    if exists("app/src/cards/messaging") and not any("MessagingCenterCard" in p for p in result["card_related_files"]):
        recs.append("app/src/cards/messaging/MessagingCenterCard.tsx")
    else:
        recs.append("app/src/cards/messaging/MessagingCenterCard.tsx")

    recs.append("app/src/cards/command/CommandSearchCard.tsx")
    recs.append("app/src/modules/dashboard/WarRoomDashboardPage.tsx")

    seen = set()
    ordered = []
    for r in recs:
        if r not in seen:
            seen.add(r)
            ordered.append(r)
    return ordered[:10]


# ---------------------------------------------------------------------------
# STUB GENERATION
# ---------------------------------------------------------------------------

def maybe_generate_stub_files(result: Dict[str, Any]) -> List[str]:
    generated: List[str] = []

    stubs = {
        "app/src/platform/registry/index.ts": 'export * from "./brand.registry";\nexport * from "./card.registry";\nexport * from "./dashboard.registry";\nexport * from "./role.registry";\nexport * from "./microroom.registry";\nexport * from "./feature.registry";\n',
        "app/src/platform/defaults/index.ts": 'export * from "./default.features";\nexport * from "./default.roles";\nexport * from "./default.microrooms";\nexport * from "./default.brands";\n',
        "README_APPLY_FIRST.md": (
            "IMPORTANT — READ BEFORE ANALYZING THE REPOSITORY\n\n"
            "This repository is in ACTIVE ARCHITECTURAL MIGRATION.\n\n"
            "Run:\n\n"
            "python tools/migration_repo_analyzer.py\n\n"
            "Then read:\n\n"
            "analysis/migration_repo_report.md\n"
            "analysis/AI_HANDOFF_PACKET.md\n"
        ),
    }

    for path_str, content in stubs.items():
        path = ROOT / path_str
        if not path.exists():
            write_text(path, content)
            generated.append(path_str)

    return generated


# ---------------------------------------------------------------------------
# MAIN CLASSIFIER
# ---------------------------------------------------------------------------

def classify_repo() -> Dict[str, Any]:
    tracked_files = scan_repo_files()

    result: Dict[str, Any] = {
        "generated_at": now_iso(),
        "root": rel(ROOT),
        "docs_present": scan_docs(),
        "target_spine": scan_target_spine(),
        "legacy_signals": scan_legacy_signals(),
        "target_card_dirs": scan_target_card_dirs(),
        "platform_registries": scan_platform_registries(),
        "platform_defaults": scan_defaults(),
        "card_type_system": scan_card_types(),
        "shared_services": scan_shared_services(),
        "build_configs": scan_build_configs(),
        "counts": scan_counts(),
        "card_related_files": scan_card_files(),
        "registry_imports_detected": scan_registry_imports(),
        "dashboard_templates": scan_dashboard_templates(),
        "netlify_functions": scan_netlify_functions(),
        "card_candidates": scan_card_candidates(),
        "theme_readiness": scan_theme_readiness(),
        "ai_logging_readiness": scan_ai_logging_readiness(),
        "architecture_drift": [],
        "architecture_score": {},
        "migration_state_summary": {},
        "recommended_next_files": [],
        "tracked_files": tracked_files,
    }

    docs_ok = all(result["docs_present"].values())
    spine_count = sum(result["target_spine"].values())
    registry_count = sum(result["platform_registries"].values())
    defaults_count = sum(result["platform_defaults"].values())
    card_types_count = sum(result["card_type_system"].values())
    legacy_count = sum(result["legacy_signals"].values())
    card_dirs_count = sum(result["target_card_dirs"].values())

    result["migration_state_summary"] = {
        "docs_found": docs_ok,
        "new_platform_spine_present": spine_count,
        "registry_files_present": registry_count,
        "default_registry_seed_files_present": defaults_count,
        "card_type_split_files_present": card_types_count,
        "legacy_module_signals_present": legacy_count,
        "target_card_dirs_present": card_dirs_count,
        "interpretation": interpret_state(
            docs_ok,
            spine_count,
            registry_count,
            defaults_count,
            card_types_count,
            legacy_count,
            card_dirs_count,
        ),
    }

    result["architecture_score"] = build_architecture_score(result)
    result["architecture_drift"] = detect_architecture_drift(result)
    result["recommended_next_files"] = recommend_next_files(result)

    return result


# ---------------------------------------------------------------------------
# WRITERS
# ---------------------------------------------------------------------------

def write_repo_report(report: Dict[str, Any]) -> None:
    save_json(ANALYSIS_DIR / "migration_repo_report.json", report)

    lines: List[str] = []
    lines.append("# Migration Repository Report\n")
    lines.append(f"**Generated:** `{report['generated_at']}`")
    lines.append(f"**Root:** `{report['root']}`\n")

    lines.append("## Interpretation\n")
    lines.append(report["migration_state_summary"]["interpretation"] + "\n")

    lines.append("## Architecture Score\n")
    for k, v in report["architecture_score"].items():
        lines.append(f"- **{k}**: {v}%")
    lines.append("")

    for section in [
        "docs_present",
        "target_spine",
        "platform_registries",
        "platform_defaults",
        "card_type_system",
        "shared_services",
        "build_configs",
        "legacy_signals",
        "target_card_dirs",
    ]:
        lines.append(f"## {section.replace('_', ' ').title()}\n")
        for k, v in report[section].items():
            lines.append(f"- `{k}`: {'YES' if v else 'NO'}")
        lines.append("")

    lines.append("## Counts\n")
    for k, v in report["counts"].items():
        lines.append(f"- `{k}`: {v}")
    lines.append("")

    lines.append("## Registered Card Imports Detected\n")
    if report["registry_imports_detected"]:
        for line in report["registry_imports_detected"]:
            lines.append(f"- `{line}`")
    else:
        lines.append("- None detected")
    lines.append("")

    lines.append("## Dashboard Templates\n")
    if report["dashboard_templates"]:
        for item in report["dashboard_templates"]:
            lines.append(f"- `{item}`")
    else:
        lines.append("- None detected")
    lines.append("")

    lines.append("## Architecture Drift\n")
    if report["architecture_drift"]:
        for item in report["architecture_drift"]:
            lines.append(f"- {item}")
    else:
        lines.append("- No major drift detected")
    lines.append("")

    lines.append("## Recommended Next Files\n")
    for item in report["recommended_next_files"]:
        lines.append(f"1. `{item}`")
    lines.append("")

    write_text(ANALYSIS_DIR / "migration_repo_report.md", "\n".join(lines))


def write_card_registry_map(report: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append("# Card Registry Map\n")
    lines.append("## Card-Related Files\n")
    if report["card_related_files"]:
        for item in report["card_related_files"]:
            lines.append(f"- `{item}`")
    else:
        lines.append("- No card files detected")
    lines.append("")

    lines.append("## Registry Imports\n")
    if report["registry_imports_detected"]:
        for line in report["registry_imports_detected"]:
            lines.append(f"- `{line}`")
    else:
        lines.append("- No registry imports detected")
    lines.append("")

    lines.append("## Card Migration Candidates\n")
    if report["card_candidates"]:
        for c in report["card_candidates"]:
            lines.append(
                f"- `{c['source']}` → `{c['suggested_target']}` ({c['category']})"
            )
    else:
        lines.append("- No migration candidates detected")
    lines.append("")

    write_text(ANALYSIS_DIR / "migration_card_registry_map.md", "\n".join(lines))


def write_dashboard_map(report: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append("# Dashboard Map\n")
    lines.append("## Templates\n")
    if report["dashboard_templates"]:
        for item in report["dashboard_templates"]:
            lines.append(f"- `{item}`")
    else:
        lines.append("- No templates detected")
    lines.append("")
    write_text(ANALYSIS_DIR / "migration_dashboard_map.md", "\n".join(lines))


def write_architecture_score(report: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append("# Architecture Score\n")
    for k, v in report["architecture_score"].items():
        lines.append(f"- **{k}**: {v}%")
    lines.append("")
    write_text(ANALYSIS_DIR / "migration_architecture_score.md", "\n".join(lines))


def write_debt_register(report: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append("# Migration Debt Register\n")
    debt = list(report["architecture_drift"])

    if not report["target_spine"]["platform_bootstrap"]:
        debt.append("PlatformBootstrap.ts missing.")
    if not report["target_spine"]["card_renderer"]:
        debt.append("CardRenderer.tsx missing.")
    if not report["target_spine"]["dashboard_renderer"]:
        debt.append("DashboardRenderer.tsx missing.")
    if not report["target_spine"]["war_room_template"]:
        debt.append("warRoom.template.ts missing.")
    if not report["shared_services"]["app/src/shared/utils/db/services/contacts.service.ts"]:
        debt.append("contacts.service.ts missing or not detected.")
    if report["theme_readiness"]["hardcoded_brand_tokens"]:
        debt.append("Hardcoded brand tokens detected; theming not centralized yet.")
    if not any(report["ai_logging_readiness"]["logging_field_coverage"].values()):
        debt.append("AI logging coverage is weak or not implemented.")

    if debt:
        for item in debt:
            lines.append(f"- {item}")
    else:
        lines.append("- No major migration debt currently detected.")
    lines.append("")

    write_text(ANALYSIS_DIR / "migration_debt_register.md", "\n".join(lines))


def write_next_build_brief(report: Dict[str, Any], delta: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append("# Next Build Brief\n")
    lines.append("## Current State\n")
    lines.append(report["migration_state_summary"]["interpretation"])
    lines.append("")

    lines.append("## What Changed Since Previous Run\n")
    if delta["new_files"] or delta["modified_files"] or delta["removed_files"]:
        if delta["new_files"]:
            lines.append("### New Files")
            for item in delta["new_files"]:
                lines.append(f"- `{item}`")
        if delta["modified_files"]:
            lines.append("\n### Modified Files")
            for item in delta["modified_files"]:
                lines.append(f"- `{item}`")
        if delta["removed_files"]:
            lines.append("\n### Removed Files")
            for item in delta["removed_files"]:
                lines.append(f"- `{item}`")
    else:
        lines.append("- No file-level changes detected since previous analyzer run.")
    lines.append("")

    lines.append("## Top Recommended Files\n")
    for item in report["recommended_next_files"]:
        lines.append(f"1. `{item}`")
    lines.append("")

    lines.append("## Immediate Priorities\n")
    lines.append("- Stabilize platform spine")
    lines.append("- Complete shared service blockers")
    lines.append("- Build operational War Room cards")
    lines.append("- Continue template/renderer-driven dashboard assembly")
    lines.append("")

    write_text(ANALYSIS_DIR / "next_build_brief.md", "\n".join(lines))


def write_ai_handoff_packet(report: Dict[str, Any], delta: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append("# AI Handoff Packet\n")
    lines.append("## Repository State\n")
    lines.append(report["migration_state_summary"]["interpretation"])
    lines.append("")

    lines.append("## Read These First\n")
    for doc, ok in report["docs_present"].items():
        lines.append(f"- `{doc}`: {'present' if ok else 'missing'}")
    lines.append("")

    lines.append("## Platform Spine Summary\n")
    for k, v in report["target_spine"].items():
        lines.append(f"- `{k}`: {'YES' if v else 'NO'}")
    lines.append("")

    lines.append("## Registry Summary\n")
    for k, v in report["platform_registries"].items():
        lines.append(f"- `{k}`: {'YES' if v else 'NO'}")
    lines.append("")

    lines.append("## Build Delta Summary\n")
    lines.append(f"- New files: {len(delta['new_files'])}")
    lines.append(f"- Modified files: {len(delta['modified_files'])}")
    lines.append(f"- Removed files: {len(delta['removed_files'])}")
    lines.append("")

    lines.append("## Recommended Next Files\n")
    for item in report["recommended_next_files"]:
        lines.append(f"- `{item}`")
    lines.append("")

    lines.append("## Architecture Warnings\n")
    if report["architecture_drift"]:
        for item in report["architecture_drift"]:
            lines.append(f"- {item}")
    else:
        lines.append("- No major drift detected")
    lines.append("")

    lines.append("## AI Logging Readiness\n")
    for field, ok in report["ai_logging_readiness"]["logging_field_coverage"].items():
        lines.append(f"- `{field}`: {'YES' if ok else 'NO'}")
    lines.append("")

    write_text(ANALYSIS_DIR / "AI_HANDOFF_PACKET.md", "\n".join(lines))


def write_build_delta(delta: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append("# Migration Build Delta\n")

    lines.append("## New Files\n")
    if delta["new_files"]:
        for item in delta["new_files"]:
            lines.append(f"- `{item}`")
    else:
        lines.append("- None")
    lines.append("")

    lines.append("## Modified Files\n")
    if delta["modified_files"]:
        for item in delta["modified_files"]:
            lines.append(f"- `{item}`")
    else:
        lines.append("- None")
    lines.append("")

    lines.append("## Removed Files\n")
    if delta["removed_files"]:
        for item in delta["removed_files"]:
            lines.append(f"- `{item}`")
    else:
        lines.append("- None")
    lines.append("")

    write_text(ANALYSIS_DIR / "migration_build_delta.md", "\n".join(lines))


def write_autoplan(report: Dict[str, Any], delta: Dict[str, Any]) -> None:
    autoplan = {
        "generated_at": report["generated_at"],
        "current_state": report["migration_state_summary"]["interpretation"],
        "architecture_score": report["architecture_score"],
        "completed_features": {
            "platform_spine": report["target_spine"],
            "registries": report["platform_registries"],
            "defaults": report["platform_defaults"],
            "card_types": report["card_type_system"],
        },
        "build_delta": delta,
        "blockers": report["architecture_drift"],
        "next_files": report["recommended_next_files"],
        "validation_steps": [
            "Run TypeScript build",
            "Verify PlatformBootstrap executes",
            "Verify registries load",
            "Verify dashboard template resolves",
            "Verify first operational cards render"
        ],
    }
    save_json(ANALYSIS_DIR / "BUILD_AUTOPLAN.json", autoplan)


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main() -> None:
    print("\n" + "=" * 72)
    print(" CIVIC PLATFORM MIGRATION ANALYZER ")
    print("=" * 72)
    print("IMPORTANT:")
    print("This repository may be in ACTIVE ARCHITECTURAL MIGRATION.")
    print("Legacy and new structures may intentionally coexist.")
    print("Do NOT treat transitional overlap as architectural failure.")
    print("=" * 72 + "\n")

    report = classify_repo()

    previous_snapshot = load_json(SNAPSHOT_FILE, {"files": {}})
    current_snapshot = build_snapshot(report["tracked_files"])
    delta = compute_delta(previous_snapshot, current_snapshot)

    generated_stubs = maybe_generate_stub_files(report)

    write_repo_report(report)
    write_card_registry_map(report)
    write_dashboard_map(report)
    write_architecture_score(report)
    write_debt_register(report)
    write_next_build_brief(report, delta)
    write_ai_handoff_packet(report, delta)
    write_build_delta(delta)
    write_autoplan(report, delta)

    summary_entry = {
        "generated_at": report["generated_at"],
        "interpretation": report["migration_state_summary"]["interpretation"],
        "architecture_score": report["architecture_score"],
        "delta_counts": {
            "new_files": len(delta["new_files"]),
            "modified_files": len(delta["modified_files"]),
            "removed_files": len(delta["removed_files"]),
        },
        "recommended_next_files": report["recommended_next_files"],
        "generated_stubs": generated_stubs,
    }
    history = update_build_history(summary_entry)

    save_json(SNAPSHOT_FILE, current_snapshot)

    print(report["migration_state_summary"]["interpretation"])
    print("\nArchitecture Score:")
    for k, v in report["architecture_score"].items():
        print(f"  - {k}: {v}%")

    print("\nRecommended next files:")
    for item in report["recommended_next_files"]:
        print(f"  - {item}")

    if generated_stubs:
        print("\nGenerated structural stubs:")
        for item in generated_stubs:
            print(f"  - {item}")

    print(f"\nBuild history entries: {len(history)}")
    print("\nReports written:")
    print("  - analysis/migration_repo_report.json")
    print("  - analysis/migration_repo_report.md")
    print("  - analysis/migration_build_delta.md")
    print("  - analysis/migration_build_history.json")
    print("  - analysis/migration_card_registry_map.md")
    print("  - analysis/migration_dashboard_map.md")
    print("  - analysis/migration_architecture_score.md")
    print("  - analysis/migration_debt_register.md")
    print("  - analysis/next_build_brief.md")
    print("  - analysis/AI_HANDOFF_PACKET.md")
    print("  - analysis/BUILD_AUTOPLAN.json")
    print("  - analysis/.migration_snapshot.json")
    print("")


if __name__ == "__main__":
    main()