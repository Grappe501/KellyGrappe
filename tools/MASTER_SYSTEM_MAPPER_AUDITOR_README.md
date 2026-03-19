# Master System Mapper / Auditor

This script creates a deep repo audit and a durable build-planning baseline.

## What it generates

When run against the repo root, it writes:

- `analysis/master_audit/master_system_audit.json`
- `analysis/master_audit/MASTER_SYSTEM_AUDIT.md`
- `analysis/master_audit/MASTER_BUILD_MAP.md`
- `analysis/master_audit/HANDOFF_SNAPSHOT.md`

## What it analyzes

- Full root tree scan
- Manifest files (`package.json`, `netlify.toml`, `vite.config`, `tsconfig`, `supabase/config.toml`)
- Source file summaries
- Import graph hotspots
- Contact / CRM / database related files
- Email / SMS / queue / compliance related files
- Dashboard / routing / AI / serverless files
- TODO / FIXME / HACK markers
- Environment variable usage
- Stage completion heuristics
- Risk register
- Recommended phase order
- Optional build probe

## Usage

From the repo root:

```bash
python master_system_mapper_auditor.py . --output-dir analysis/master_audit
```

To also run a local build probe:

```bash
python master_system_mapper_auditor.py . --output-dir analysis/master_audit --run-build
```

With a custom build command:

```bash
python master_system_mapper_auditor.py . --output-dir analysis/master_audit --build-command npm run build
```

## Recommended placement

Put the script at repo root, or under `tools/` if you prefer. My recommendation is:

- `tools/master_system_mapper_auditor.py`

Then run:

```bash
python tools/master_system_mapper_auditor.py . --output-dir analysis/master_audit --run-build
```

## Workflow use

Run it:

1. before Phase 0
2. after every 1–3 phases
3. before migrating to a new thread
4. after major architecture changes

This keeps the master build map, handoff state, and risk register current.
