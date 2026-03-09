import json
import re
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(".")
CARDS_DIR = ROOT / "app" / "src" / "cards"
SERVICES_DIR = ROOT / "app" / "src" / "shared" / "utils" / "db" / "services"
ANALYSIS = ROOT / "analysis"

OUTPUT_MAP = ANALYSIS / "service_connections.json"
OUTPUT_REPORT = ANALYSIS / "service_connections.md"

connections = []


def now():
    return datetime.now(timezone.utc).isoformat()


def detect_service(card_name):

    """
    Very simple first-pass heuristic.
    Later versions will use the dependency graph.
    """

    name = card_name.lower()

    if "contact" in name:
        return "contacts.service"

    if "followup" in name:
        return "followups.service"

    if "vote" in name:
        return "voterMatching.service"

    if "power" in name:
        return "relationships.service"

    if "media" in name:
        return "media.service"

    return None


def inject_service_import(card_path, service):

    content = card_path.read_text()

    if service in content:
        return False

    service_import = f'import {{ {service.split(".")[0]} }} from "../../shared/utils/db/services/{service}.ts";\n'

    lines = content.split("\n")

    insert_index = 0

    for i, line in enumerate(lines):
        if line.startswith("import"):
            insert_index = i + 1

    lines.insert(insert_index, service_import)

    card_path.write_text("\n".join(lines))

    return True


def process_cards():

    for card in CARDS_DIR.rglob("*Card.tsx"):

        service = detect_service(card.name)

        if not service:
            continue

        service_path = SERVICES_DIR / f"{service}.ts"

        if not service_path.exists():
            continue

        injected = inject_service_import(card, service)

        connections.append(
            {
                "card": str(card),
                "service": str(service_path),
                "injected": injected,
            }
        )


def write_outputs():

    ANALYSIS.mkdir(exist_ok=True)

    with open(OUTPUT_MAP, "w") as f:
        json.dump(
            {
                "generated_at": now(),
                "connections": connections,
            },
            f,
            indent=2,
        )

    md = [
        "# Service Connections",
        "",
        f"Generated: {now()}",
        "",
    ]

    for c in connections:

        md.append(f"### {Path(c['card']).name}")
        md.append(f"- service: `{c['service']}`")
        md.append(f"- import injected: `{c['injected']}`")
        md.append("")

    OUTPUT_REPORT.write_text("\n".join(md))


def main():

    print("\nSERVICE CONNECTOR GENERATOR\n")

    process_cards()

    write_outputs()

    print("Service connections generated.\n")
    print("analysis/service_connections.json")
    print("analysis/service_connections.md\n")


if __name__ == "__main__":
    main()