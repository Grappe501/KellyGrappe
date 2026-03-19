import os
import re
import json
from pathlib import Path
from collections import defaultdict, Counter
from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(".").resolve()
SCAN_DIRS = ["app/src", "app/netlify/functions", "analysis", "build_directions", "docs", "tools"]
IGNORE_PARTS = {"node_modules", ".git", "dist", "coverage", ".next", ".netlify"}

KEYWORDS = {
    "registry": ["registry", "registercard", "registerdashboard", "manifest"],
    "kernel": ["kernel", "runtime", "boot", "activatecircle", "orchestrator"],
    "circles": ["circle", "circles/"],
    "dashboards": ["dashboard", "warroom", "room.template"],
    "modules": ["module", "modules/"],
    "ai_autobuild": ["autobuild", "generator", "generate_", "ai/", "role.ts", "copilot", "assistant"],
    "messaging": ["email", "sms", "text", "twilio", "sendgrid", "messaging"],
    "contacts": ["contact", "contacts", "volunteer", "voter", "followup", "follow_up"],
    "supabase": ["supabase", ".from(", ".table(", "createclient("],
}

TABLE_NAME_PATTERNS = [
    re.compile(r"""\.from\(\s*["']([a-zA-Z0-9_]+)["']\s*\)"""),
    re.compile(r"""\.table\(\s*["']([a-zA-Z0-9_]+)["']\s*\)"""),
    re.compile(r"""from\(\s*`([a-zA-Z0-9_]+)`\s*\)"""),
    re.compile(r"""table\(\s*`([a-zA-Z0-9_]+)`\s*\)"""),
]

COMMON_TABLES = [
    "voters", "contacts", "volunteers", "users", "profiles", "events", "donations",
    "followups", "contact_messages", "message_campaigns", "message_deliveries",
    "campaign_contacts", "supporters", "entity_reviews", "entities", "ingestion_jobs",
    "uploaded_files", "training_progress", "organizer_progress", "calendar_events",
]

def safe_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""

def load_env() -> tuple[str, str]:
    for env_path in [ROOT / ".env", ROOT / "app" / ".env"]:
        if env_path.exists():
            load_dotenv(env_path, override=False)
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
    return url, key

def walk_files() -> list[Path]:
    files = []
    for rel in SCAN_DIRS:
        target = ROOT / rel
        if not target.exists():
            continue
        for path in target.rglob("*"):
            if not path.is_file():
                continue
            if any(part in IGNORE_PARTS for part in path.parts):
                continue
            files.append(path)
    return files

def scan_codebase(files: list[Path]) -> dict:
    hits = {k: [] for k in KEYWORDS}
    folder_counts = Counter()
    table_refs = Counter()
    netlify_functions = []
    circle_manifests = []
    dashboards = []
    services = []
    stubs = []
    file_records = []

    for path in files:
        rel = path.relative_to(ROOT).as_posix()
        text = safe_text(path)
        low = text.lower()

        folder_counts[path.parts[1] if len(path.parts) > 1 else path.parts[0]] += 1

        for bucket, words in KEYWORDS.items():
            if any(w in low for w in words):
                hits[bucket].append(rel)

        for pattern in TABLE_NAME_PATTERNS:
            for match in pattern.findall(text):
                table_refs[match] += 1

        if rel.startswith("app/netlify/functions/"):
            netlify_functions.append(rel)
        if rel.endswith(".manifest.ts"):
            circle_manifests.append(rel)
        if ".dashboard." in rel or rel.endswith(".dashboard.ts") or "dashboard" in rel.lower():
            dashboards.append(rel)
        if "/services/" in rel or rel.endswith(".service.ts"):
            services.append(rel)
        if "AUTO-GENERATED STUB" in text or "export const placeholder = true" in text:
            stubs.append(rel)

        file_records.append({
            "path": rel,
            "size": path.stat().st_size,
            "lines": text.count("\n") + 1 if text else 0,
        })

    inferred_tables = sorted(set(COMMON_TABLES + list(table_refs.keys())))
    return {
        "hits": {k: sorted(set(v)) for k, v in hits.items()},
        "folder_counts": folder_counts,
        "table_refs": table_refs,
        "inferred_tables": inferred_tables,
        "netlify_functions": sorted(netlify_functions),
        "circle_manifests": sorted(circle_manifests),
        "dashboards": sorted(set(dashboards)),
        "services": sorted(set(services)),
        "stubs": sorted(set(stubs)),
        "file_records": sorted(file_records, key=lambda x: x["lines"], reverse=True),
    }

def try_fetch_table(supabase, table: str) -> dict:
    result = {
        "accessible": False,
        "row_count": None,
        "columns": [],
        "sample": [],
        "error": None,
        "signals": {},
    }
    try:
        count_resp = supabase.table(table).select("*", count="exact", head=True).limit(1).execute()
        result["row_count"] = count_resp.count
        sample_resp = supabase.table(table).select("*").limit(5).execute()
        data = sample_resp.data or []
        result["sample"] = data
        if data:
            result["columns"] = list(data[0].keys())
        result["accessible"] = True

        col_str = " ".join(result["columns"]).lower()
        result["signals"] = {
            "email": "email" in col_str,
            "phone": any(x in col_str for x in ["phone", "mobile", "cell", "sms"]),
            "name": any(x in col_str for x in ["name", "first_name", "last_name", "first", "last"]),
            "districting": any(x in col_str for x in ["district", "precinct", "county"]),
            "messaging": any(x in col_str for x in ["email", "phone", "sms", "opt_in", "unsubscribe", "message"]),
            "identity_link": any(x in col_str for x in ["voter_id", "user_id", "profile_id", "contact_id"]),
        }
        score = sum(1 for v in result["signals"].values() if v)
        result["signals"]["score"] = score
    except Exception as e:
        result["error"] = str(e)
    return result

def scan_database(supabase, inferred_tables: list[str]) -> dict:
    db_map = {}
    contact_candidates = []
    accessible_tables = []

    for table in inferred_tables:
        info = try_fetch_table(supabase, table)
        if info["accessible"]:
            accessible_tables.append(table)
            if info["signals"].get("email") or info["signals"].get("phone") or info["signals"].get("messaging"):
                contact_candidates.append((table, info["signals"].get("score", 0)))
        db_map[table] = info

    contact_candidates.sort(key=lambda x: x[1], reverse=True)
    return {
        "tables": db_map,
        "accessible_tables": accessible_tables,
        "contact_candidates": contact_candidates,
    }

def classify_system(code_scan: dict, db_scan: dict) -> dict:
    stubs = set(code_scan["stubs"])
    services = code_scan["services"]

    service_status = []
    for service in services:
        status = "stub" if service in stubs else "implemented"
        service_status.append({"path": service, "status": status})

    readiness = {
        "registry_system": len(code_scan["hits"]["registry"]),
        "kernel_system": len(code_scan["hits"]["kernel"]),
        "circle_system": len(code_scan["hits"]["circles"]),
        "dashboard_system": len(code_scan["dashboards"]),
        "module_system": len(code_scan["hits"]["modules"]),
        "ai_autobuild_system": len(code_scan["hits"]["ai_autobuild"]),
        "messaging_system": len(code_scan["hits"]["messaging"]),
        "contacts_system": len(code_scan["hits"]["contacts"]),
        "accessible_db_tables": len(db_scan["accessible_tables"]),
        "stub_services": len(code_scan["stubs"]),
    }

    findings = []
    if "voters" in db_scan["accessible_tables"]:
        findings.append("The voters table is real and populated, so voter targeting can anchor the platform.")
    if not db_scan["contact_candidates"]:
        findings.append("No messaging-ready contact table was discovered from live data samples.")
    if any(x["path"].endswith("contacts.service.ts") and x["status"] == "stub" for x in service_status):
        findings.append("CRM contacts service is still a scaffold stub, so contact actions in the UI will not persist.")
    if any(x["path"].endswith("email.service.ts") and x["status"] == "stub" for x in service_status):
        findings.append("Communications email service is still a stub, so statewide email is not wired yet.")
    if any(x["path"].endswith("sms.service.ts") and x["status"] == "stub" for x in service_status):
        findings.append("Communications SMS service is still a stub, so text messaging is not wired yet.")

    return {
        "readiness_counters": readiness,
        "service_status": service_status,
        "findings": findings,
    }

def write_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2, default=lambda x: dict(x) if isinstance(x, Counter) else str(x)), encoding="utf-8")

def write_reports(root: Path, code_scan: dict, db_scan: dict, system: dict):
    out = root

    write_json(out / "MASTER_SYSTEM_INTELLIGENCE.json", {
        "code_scan": {
            "folder_counts": dict(code_scan["folder_counts"]),
            "table_refs": dict(code_scan["table_refs"]),
            "netlify_functions": code_scan["netlify_functions"],
            "circle_manifests": code_scan["circle_manifests"],
            "dashboards": code_scan["dashboards"],
            "services": code_scan["services"],
            "stubs": code_scan["stubs"],
        },
        "db_scan": db_scan,
        "system": system,
    })

    with (out / "MASTER_SYSTEM_MAP.md").open("w", encoding="utf-8") as f:
        f.write("# Master System Map\n\n")
        f.write("## Summary\n")
        for item in system["findings"]:
            f.write(f"- {item}\n")
        f.write("\n## Codebase Domains\n")
        for bucket, files in code_scan["hits"].items():
            f.write(f"\n### {bucket} ({len(files)})\n")
            for rel in files[:100]:
                f.write(f"- {rel}\n")

        f.write("\n## Circle Manifests\n")
        for rel in code_scan["circle_manifests"]:
            f.write(f"- {rel}\n")

        f.write("\n## Dashboards\n")
        for rel in code_scan["dashboards"][:150]:
            f.write(f"- {rel}\n")

        f.write("\n## Netlify Functions\n")
        for rel in code_scan["netlify_functions"]:
            f.write(f"- {rel}\n")

    with (out / "DATABASE_DEEP_MAP.md").open("w", encoding="utf-8") as f:
        f.write("# Database Deep Map\n\n")
        for table, info in db_scan["tables"].items():
            f.write(f"## {table}\n")
            f.write(f"- accessible: {info['accessible']}\n")
            f.write(f"- row_count: {info['row_count']}\n")
            if info["error"]:
                f.write(f"- error: {info['error']}\n\n")
                continue
            f.write("- columns:\n")
            for c in info["columns"]:
                f.write(f"  - {c}\n")
            f.write("- signals:\n")
            for k, v in info["signals"].items():
                f.write(f"  - {k}: {v}\n")
            f.write("\n")

    with (out / "CONTACT_DISCOVERY_REPORT.md").open("w", encoding="utf-8") as f:
        f.write("# Contact Discovery Report\n\n")
        f.write("## Ranked contact-like tables\n")
        if db_scan["contact_candidates"]:
            for table, score in db_scan["contact_candidates"]:
                f.write(f"- {table} (score: {score})\n")
        else:
            f.write("- None discovered from live samples\n")

        f.write("\n## Operational conclusion\n")
        f.write("- `voters` is a targeting dataset, not a messaging-ready contact system.\n")
        f.write("- `contacts` exists by name but was not populated in the scanned sample.\n")
        f.write("- A production contact backbone should be built in `contacts` and linked to `voters` by `voter_id` when available.\n")

    with (out / "SYSTEM_ARCHITECTURE_ANALYSIS.md").open("w", encoding="utf-8") as f:
        f.write("# System Architecture Analysis\n\n")
        f.write("## Readiness counters\n")
        for k, v in system["readiness_counters"].items():
            f.write(f"- {k}: {v}\n")

        f.write("\n## Service status\n")
        for entry in system["service_status"]:
            f.write(f"- {entry['path']}: {entry['status']}\n")

        f.write("\n## Table references inferred from code\n")
        for table, count in code_scan["table_refs"].most_common():
            f.write(f"- {table}: {count}\n")

    with (out / "AI_SYSTEM_ANALYSIS.md").open("w", encoding="utf-8") as f:
        f.write("# AI / Autobuild System Analysis\n\n")
        ai_files = code_scan["hits"]["ai_autobuild"]
        for rel in ai_files[:150]:
            f.write(f"- {rel}\n")
        f.write("\n## Interpretation\n")
        f.write("- The repo contains a substantial autobuild/generator layer, but many operational services are still stubs.\n")
        f.write("- That means the platform has strong scaffold generation capability, but weak activation of production workflows.\n")

    with (out / "NEXT_BUILD_RECOMMENDATION.md").open("w", encoding="utf-8") as f:
        f.write("# Next Build Recommendation\n\n")
        f.write("## Phase to build next\n")
        f.write("Phase 1.0B - Contact Backbone\n\n")
        f.write("## Why\n")
        for item in system["findings"]:
            f.write(f"- {item}\n")
        f.write("\n## Recommended scope\n")
        f.write("- Create a production-ready `contacts` schema and repository layer.\n")
        f.write("- Replace stubbed CRM contacts, email, and SMS services with real implementations.\n")
        f.write("- Keep `voters` read-only and use it only for enrichment/targeting.\n")

def main():
    print("Loading environment...")
    url, key = load_env()
    print("SUPABASE_URL:", url)
    print("KEY LOADED:", bool(key))
    if not url or not key:
        raise RuntimeError("Missing Supabase credentials. Expected SUPABASE_URL and a service or anon key.")

    print("\nScanning codebase for architecture, registries, circles, dashboards, modules, and AI autobuild layers...")
    files = walk_files()
    code_scan = scan_codebase(files)

    print("\nConnecting to Supabase and scanning discovered/inferred tables...")
    supabase = create_client(url, key)
    db_scan = scan_database(supabase, code_scan["inferred_tables"])

    print("\nClassifying system readiness...")
    system = classify_system(code_scan, db_scan)

    print("\nWriting reports...")
    write_reports(ROOT, code_scan, db_scan, system)

    print("\nDone.")
    print("Generated:")
    print("- MASTER_SYSTEM_INTELLIGENCE.json")
    print("- MASTER_SYSTEM_MAP.md")
    print("- DATABASE_DEEP_MAP.md")
    print("- CONTACT_DISCOVERY_REPORT.md")
    print("- SYSTEM_ARCHITECTURE_ANALYSIS.md")
    print("- AI_SYSTEM_ANALYSIS.md")
    print("- NEXT_BUILD_RECOMMENDATION.md")

if __name__ == "__main__":
    main()
