# AI Builder v1

## Purpose
Generate full file replacements for defined build phases.

## Workflow

1. Define phase in `phase_config.yaml`
2. Use PhaseEngine to read config
3. Generate files with FileGenerator
4. Replace files in main project
5. Run build using BuildValidator

## Rules

- Full file replacement only
- No partial edits
- No architecture drift
- One phase at a time