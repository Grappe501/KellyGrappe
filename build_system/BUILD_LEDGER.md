# BUILD_LEDGER

## Purpose

This file is the single source of truth for build progress across threads.

Every phase zip should update this file.

## Entry template

### Phase ID
- Date:
- Branch / commit:
- Objective:
- Status: planned | in-progress | deployed | blocked | rolled back

### Files replaced
- full/path/file1
- full/path/file2

### Database changes
- migration file:
- tables touched:
- env vars added/changed:

### Validation
- `npm run build`:
- local smoke test:
- netlify deploy result:
- post-deploy checks:

### Issues found
- issue:
- fix:
- follow-up:

### Next phase
- target:
- blockers:
