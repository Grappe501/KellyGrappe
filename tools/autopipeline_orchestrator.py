
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List

ROOT = Path(".").resolve()
TOOLS = ROOT / "tools"
ANALYSIS = ROOT / "analysis"
ANALYSIS.mkdir(exist_ok=True)

OUTPUT_JSON = ANALYSIS / "AUTOBUILD_MASTER_PLAN.json"
OUTPUT_MD = ANALYSIS / "AUTOBUILD_MASTER_PLAN.md"
RUN_LOG = ANALYSIS / "AUTOPIPELINE_RUN_LOG.json"

PIPELINE = [
    {
        "name": "migration_repo_analyzer",
        "script": "migration_repo_analyzer.py",
        "required_outputs": [
            "analysis/migration_repo_report.json",
            "analysis/migration_repo_report.md",
        ],
    },
    {
        "name": "platform_activation_auditor",
        "script": "platform_activation_auditor.py",
        "required_outputs": [
            "analysis/platform_activation_audit.json",
            "analysis/platform_activation_audit.md",
        ],
    },
    {
        "name": "architecture_graph_builder",
        "script": "architecture_graph_builder.py",
        "required_outputs": [
            "analysis/system_dependency_graph.json",
            "analysis/system_dependency_graph.md",
        ],
    },
    {
        "name": "service_mapper",
        "script": "service_mapper.py",
        "required_outputs": [
            "analysis/service_map.json",
            "analysis/service_map.md",
        ],
    },
    {
        "name": "capability_registry_builder",
        "script": "capability_registry_builder.py",
        "required_outputs": [
            "analysis/platform_capability_map.json",
            "analysis/platform_capability_map.md",
        ],
    },
    {
        "name": "dashboard_composer",
        "script": "dashboard_composer.py",
        "required_outputs": [
            "analysis/dashboard_blueprints.json",
            "analysis/dashboard_blueprints.md",
        ],
    },
    {
        "name": "card_scaffold_generator",
        "script": "card_scaffold_generator.py",
        "required_outputs": [
            "analysis/generated_cards_log.json",
            "analysis/generated_cards_report.md",
        ],
    },
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def save_json(path: Path, data: Any) -> None:
    write_text(path, json.dumps(data, indent=2))


def load_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def path_exists(path_str: str) -> bool:
    return (ROOT / path_str).exists()


def run_script(script_name: str) -> Dict[str, Any]:
    script_path = TOOLS / script_name
    if not script_path.exists():
        return {
            "script": script_name,
            "exists": False,
            "ran": False,
            "returncode": None,
            "stdout": "",
            "stderr": f"Missing tool: {script_path}",
        }

    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )

    return {
        "script": script_name,
        "exists": True,
        "ran": True,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def collect_output_state(required_outputs: List[str]) -> Dict[str, bool]:
    return {output: path_exists(output) for output in required_outputs}


def collect_queue_hints() -> List[Dict[str, Any]]:
    queue_files = [
        ANALYSIS / "BUILD_AUTOPLAN.json",
        ANALYSIS / "PLATFORM_AUTOBUILD_QUEUE.json",
        ANALYSIS / "GRAPH_AUTOBUILD_HINTS.json",
        ANALYSIS / "CAPABILITY_AUTOBUILD_QUEUE.json",
        ANALYSIS / "DASHBOARD_AUTOBUILD_QUEUE.json",
        ANALYSIS / "CARD_SCAFFOLD_AUTOBUILD_QUEUE.json",
    ]

    hints: List[Dict[str, Any]] = []
    for path in queue_files:
        payload = load_json(path, {})
        if not payload:
            continue

        if isinstance(payload, dict):
            next_actions = payload.get("next_actions")
            if isinstance(next_actions, list):
                for item in next_actions:
                    hints.append(
                        {
                            "source": str(path.relative_to(ROOT)).replace("\\", "/"),
                            "item": item,
                        }
                    )
            else:
                hints.append(
                    {
                        "source": str(path.relative_to(ROOT)).replace("\\", "/"),
                        "item": payload,
                    }
                )

    return hints


def determine_pipeline_health(run_results: List[Dict[str, Any]], step_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    missing_tools = [r["script"] for r in run_results if not r["exists"]]
    failed_tools = [r["script"] for r in run_results if r["exists"] and r["returncode"] not in (0, None)]
    missing_outputs = []

    for step in step_results:
        for output, ok in step["outputs"].items():
            if not ok:
                missing_outputs.append(output)

    ready = not missing_tools and not failed_tools and not missing_outputs

    return {
        "autobuild_ready": ready,
        "missing_tools": missing_tools,
        "failed_tools": failed_tools,
        "missing_outputs": missing_outputs,
    }


def build_master_plan(run_results: List[Dict[str, Any]], step_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    health = determine_pipeline_health(run_results, step_results)
    queue_hints = collect_queue_hints()

    recommended_next_actions: List[Dict[str, Any]] = []

    if health["missing_tools"]:
        recommended_next_actions.append(
            {
                "priority": 1,
                "task": "Create missing tool files",
                "targets": health["missing_tools"],
                "why": "The orchestrated pipeline cannot complete until all tool scripts exist.",
            }
        )

    if health["failed_tools"]:
        recommended_next_actions.append(
            {
                "priority": 2,
                "task": "Fix tool execution failures",
                "targets": health["failed_tools"],
                "why": "One or more tools ran but returned errors.",
            }
        )

    if health["missing_outputs"]:
        recommended_next_actions.append(
            {
                "priority": 3,
                "task": "Repair missing report outputs",
                "targets": health["missing_outputs"][:20],
                "why": "The pipeline depends on expected analysis artifacts to continue safely.",
            }
        )

    for hint in queue_hints[:10]:
        recommended_next_actions.append(
            {
                "priority": len(recommended_next_actions) + 4,
                "task": hint["item"].get("task", "Review queued action") if isinstance(hint["item"], dict) else "Review queued action",
                "targets": hint["item"].get("targets", []) if isinstance(hint["item"], dict) else [],
                "why": f"Suggested by {hint['source']}",
            }
        )

    return {
        "generated_at": now_iso(),
        "pipeline_health": health,
        "pipeline_steps": step_results,
        "recommended_next_actions": recommended_next_actions[:20],
        "queue_hint_count": len(queue_hints),
    }


def write_markdown(master_plan: Dict[str, Any]) -> None:
    lines: List[str] = []
    lines.append("# Autobuild Master Plan\n")
    lines.append(f"**Generated:** `{master_plan['generated_at']}`\n")

    health = master_plan["pipeline_health"]
    lines.append("## Pipeline Health\n")
    lines.append(f"- **autobuild_ready:** `{health['autobuild_ready']}`")
    lines.append(f"- **missing_tools:** `{len(health['missing_tools'])}`")
    lines.append(f"- **failed_tools:** `{len(health['failed_tools'])}`")
    lines.append(f"- **missing_outputs:** `{len(health['missing_outputs'])}`")
    lines.append("")

    if health["missing_tools"]:
        lines.append("### Missing Tools")
        for item in health["missing_tools"]:
            lines.append(f"- `{item}`")
        lines.append("")

    if health["failed_tools"]:
        lines.append("### Failed Tools")
        for item in health["failed_tools"]:
            lines.append(f"- `{item}`")
        lines.append("")

    if health["missing_outputs"]:
        lines.append("### Missing Outputs")
        for item in health["missing_outputs"]:
            lines.append(f"- `{item}`")
        lines.append("")

    lines.append("## Pipeline Steps\n")
    for step in master_plan["pipeline_steps"]:
        lines.append(f"### {step['name']}")
        lines.append(f"- **script:** `{step['script']}`")
        lines.append(f"- **ran:** `{step['ran']}`")
        lines.append(f"- **returncode:** `{step['returncode']}`")
        lines.append("- **outputs:**")
        for output, ok in step["outputs"].items():
            lines.append(f"  - `{output}`: `{'YES' if ok else 'NO'}`")
        lines.append("")

    lines.append("## Recommended Next Actions\n")
    if not master_plan["recommended_next_actions"]:
        lines.append("- No next actions generated.\n")
    else:
        for item in master_plan["recommended_next_actions"]:
            lines.append(f"### P{item['priority']} — {item['task']}")
            lines.append(f"- **Why:** {item['why']}")
            if item["targets"]:
                lines.append("- **Targets:**")
                for target in item["targets"]:
                    lines.append(f"  - `{target}`")
            lines.append("")

    write_text(OUTPUT_MD, "\n".join(lines))


def main() -> None:
    print("\n" + "=" * 72)
    print(" AUTOPIPELINE ORCHESTRATOR ")
    print("=" * 72)
    print("Purpose:")
    print("Run the build intelligence toolchain in order and produce one master build plan.")
    print("=" * 72 + "\n")

    run_results: List[Dict[str, Any]] = []
    step_results: List[Dict[str, Any]] = []

    for step in PIPELINE:
        run_result = run_script(step["script"])
        run_results.append(run_result)

        outputs = collect_output_state(step["required_outputs"])

        step_results.append(
            {
                "name": step["name"],
                "script": step["script"],
                "ran": run_result["ran"],
                "returncode": run_result["returncode"],
                "outputs": outputs,
            }
        )

    save_json(RUN_LOG, {
        "generated_at": now_iso(),
        "run_results": run_results,
    })

    master_plan = build_master_plan(run_results, step_results)
    save_json(OUTPUT_JSON, master_plan)
    write_markdown(master_plan)

    print("Reports written:")
    print(f" - {OUTPUT_JSON}")
    print(f" - {OUTPUT_MD}")
    print(f" - {RUN_LOG}")
    print("")


if __name__ == "__main__":
    main()
