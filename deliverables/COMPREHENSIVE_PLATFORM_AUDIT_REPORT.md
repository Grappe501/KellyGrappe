# Kelly Grappe SOS Platform Audit Report

Generated: 2026-03-19T15:57:55.767444Z

## Executive summary

This repository already contains **a substantial platform scaffold**: a React/Vite frontend, a large card/dashboard architecture, multiple Netlify functions, Supabase schemas, local IndexedDB CRM services, and a sizable Python tooling layer for mapping and generation.

The platform is **not yet production-ready as a unified operating system**. The biggest reasons are:

1. **The app does not currently build successfully.**
2. **Routing/module architecture is split** between a static `App.tsx` and a dynamic module loader that is not actually mounted.
3. **The contact system is split across IndexedDB and Supabase**, which is good for offline workflows but not yet coherent for production statewide operations.
4. **The statewide messaging pipeline is incomplete**, especially SMS and bulk dispatch from the contact database.
5. **Many platform capabilities exist as scaffolding or drafts**, but not yet as a fully integrated, testable runtime.

## What I found in the repo

### Repository shape

- Total files scanned (excluding `.git`, `node_modules`, build artifacts): **835**
- Major source counts:
  - TypeScript files: **457**
  - TSX files: **163**
  - Python files: **74**
  - JSON files: **61**
  - Markdown files: **43**
- Area counts:
  - Cards: **64**
  - Modules: **49**
  - Platform engine files: **159**
  - Netlify function files: **20**
  - Analysis/generator tools: **60**

### Build state

`npm run build` in `app/` currently fails.

Main visible blockers:
- `src/platform/ai/ai.runtime.ts` references `AIRegistry.initialize`, which does not exist.
- Cockpit telemetry files have type mismatches across event types and snapshot types.
- `useCockpitTelemetry` is called with the wrong arity.

That means the frontend is not presently in a release-safe state.

### Architecture reality check

There are **two competing app-entry patterns**:

- `app/src/App.tsx` mounts only a static `Routes` set for `/` and `/war-room`.
- `app/src/app/router/AppRouter.tsx` exists and is capable of loading module routes dynamically, but it is **not mounted** by `App.tsx`.

This matters because the repo contains a module system and manifest loader, but the active app shell currently bypasses it.

### Module manifest drift

The module loader expects `module.json` files shaped like:

- `name`
- `routes[]`
- `features[]`

But `app/src/modules/eventRequests/module.json` still uses a legacy shape:

- `moduleId`
- `route`
- `status`

So the event request module is documented as part of the platform, but it is **not aligned with the active loader contract**.

### Messaging reality

The platform already has pieces of a messaging system:

- `MessagingCenterCard.tsx` can search contacts and call:
  - `/.netlify/functions/send-email`
  - `/.netlify/functions/send-sms`
- `send-email.ts` is implemented with SendGrid.
- `send-sms.ts` is **empty**.
- `messaging.delivery.engine.ts` exists, but it only **queues rows into `message_queue`**; it does not perform a production dispatch pipeline.
- Twilio send logic exists inside `event-assist.ts`, but only for that specific workflow.

Bottom line: **email single-send exists, SMS general-send does not, and bulk campaign messaging is not complete.**

### Contact/data architecture

You have **two contact layers**:

1. **IndexedDB local CRM layer** in `app/src/shared/utils/db/...`
2. **Supabase production-side tables/functions** via Netlify functions

This is powerful, but it is currently split-brain.

Current strengths:
- Live contact intake is one of the strongest implemented flows in the repo.
- Contact import UI is fairly mature.
- Bulk upsert to Supabase exists.
- Follow-up creation/list/update exists.

Current risk:
- The messaging UI reads contacts locally, while production broadcast needs a centralized statewide DB.
- Until one source of truth is chosen for production operations, statewide outreach will be fragile.

### Supabase/data model status

Schemas and references indicate planned support for:
- `contacts`
- `voters`
- `contact_voter_matches`
- `followups`
- `event_requests`
- `training_*`
- `message_queue` (code reference)
- `event_notifications` (code reference)

Important note: some tables are referenced in code but I did not find a complete matching migration set for the full messaging runtime.

### Tooling layer

The repo includes a large Python tooling layer:
- platform mapper
- build mapper
- activation auditor
- architecture graph builder
- registry builder
- dashboard builders
- civic identity/voter tools

This is useful and should be kept, but it needs one **authoritative audit/build ledger** so each future thread can start from the exact same truth state.

## Completion estimate by area

| Area | Est. complete | Why |
|---|---:|---|
| Frontend shell / card system | 75% | Large card inventory, dashboard manifests, registries, and layout framework are present. |
| Module/routing kernel | 35% | Dynamic loader exists, but App.tsx bypasses it and one module manifest still uses a legacy schema. |
| Live contact capture | 80% | Full page workflow, media capture hooks, follow-up creation, and local DB services are implemented. |
| Contact import and Supabase upsert | 65% | CSV mapping/import UI and contacts-bulk-upsert function exist, but the client and server stores are still split. |
| Voter import/intelligence | 35% | Planning UI and SQL schemas exist, but no complete production ingestion pipeline or sync path is wired. |
| Follow-up pipeline | 70% | Create/list/update functions exist and live contact integrates with follow-up creation. |
| Email sending | 50% | Single-send email function is implemented, but campaign-grade queueing, audit, suppression, and templating are incomplete. |
| SMS sending | 10% | UI references a send-sms function, but the file is empty; Twilio logic only appears inside event-assist. |
| Broadcast messaging from contact DB | 20% | Audience and queue concepts exist, but no end-to-end production dispatch pipeline is completed. |
| AI platform layer | 45% | Many AI engine files exist, but current build is blocked and operational integrations are not yet cohesive. |
| Training/LRS | 30% | Schema exists, but no obvious end-user UI or production learning workflow is wired. |
| Production hardening / build stability | 20% | Build currently fails, auth/RBAC is not evident, and observability/testing are thin. |

## Platform capabilities now

- War-room style React/Vite frontend with a large card/dashboard inventory.
- Local-first contact capture using IndexedDB services.
- CSV contact import workflow with field mapping and optional Supabase bulk upsert.
- Follow-up creation/list/update functions backed by Supabase.
- Single-recipient email send through Netlify + SendGrid.
- Event-assist function that can notify by email/SMS when provided approval code and provider env vars.
- Supabase schema drafts for contacts, voters, follow-ups, event requests, and training.

## Platform capabilities when complete

- Statewide contact database as a single source of truth.
- Segmented bulk email and SMS campaigns with queueing, throttling, logging, opt-in rules, and retry handling.
- Voter/contact match engine and geographic targeting across precinct, county, and district.
- Production campaign command center across field, messaging, volunteer, and analytics.
- AI-assisted planning, message generation, routing, and system diagnostics operating on live platform state.
- Training-based capability unlocks and role-driven access to tools.

## Best first production target

Your stated priority is correct:

> **Get the statewide email + text system working first, tied to the contact database.**

That should become the first real production backbone, because once it is stable it unlocks:

- contact engagement
- volunteer follow-up
- event recruitment
- supporter activation
- rapid response messaging
- data feedback loops for the rest of the platform

## Recommended master build order

### Phase 0
**Objective:** Stabilize the build and routing baseline
- Fix TypeScript build blockers in app/src/platform/ui/cockpit and ai.runtime.ts.
- Decide whether App.tsx uses AppRouter/module loader or a static route file, then make that the single routing path.
- Normalize module manifests to one schema; convert eventRequests/module.json to the loader format.
- Add a release gate: npm run build + a lightweight audit script must pass before every zip.

### Phase 1
**Objective:** Make contacts the system of record
- Choose Supabase as production source of truth for contacts and follow-ups.
- Keep IndexedDB only as offline cache/staging, not the primary production store.
- Create/validate contacts, followups, message_queue, message_templates, audience_segments, and message_deliveries tables.
- Wire the contacts UI to read from Supabase-backed endpoints for production mode.

### Phase 2
**Objective:** Ship the statewide email + SMS pipeline first
- Implement app/netlify/functions/send-sms.ts as a real Twilio transport.
- Replace the single-recipient MessagingCenterCard workflow with campaign send APIs that accept segment IDs or contact IDs.
- Add compliance fields: consent, opt-out, quiet hours, invalid destination, bounce/failure status.
- Create dispatch queue + worker pattern: queue insert, batch claim, provider send, delivery log, retry/fail finalization.

### Phase 3
**Objective:** Connect segmentation and templates
- Turn audience builder into saved segments against Supabase contacts.
- Add reusable templates with channel-specific variables and preview.
- Support test sends, approval step, and send history.

### Phase 4
**Objective:** Bring in voter intelligence
- Load statewide voter data into voters + matching tables.
- Attach turnout/persuasion scores and district/precinct geography to contacts.
- Use this for messaging segmentation and prioritization.

### Phase 5
**Objective:** Expand outward once messaging is stable
- Volunteer, field, training, and AI orchestration should all build on the stabilized contact and messaging backbone.
- Harden analytics, alerts, and operator dashboards.

## Recommended workflow protocol

- Work only in small, named phases that end with a full-file replacement zip.
- Each phase should include: changed files/, PHASE_REPORT.md, APPLY_ORDER.md, TEST_PLAN.md, and HANDOFF_SNAPSHOT.md.
- Do not mix architecture cleanup with feature expansion unless the feature depends on it.
- Always ship the audit output with the phase so the next thread can see the exact baseline and delta.
- Use a build ledger that records: date, phase, objective, files replaced, tests run, deploy result, rollback note, and next blockers.

## My recommendation for the system mapper/auditor program

The attached Python script (`scripts/system_mapper_auditor.py`) should become the mandatory baseline check for every phase. It should:

- map repo structure
- validate module manifests
- detect empty or suspicious functions
- inspect env-var names without exposing secrets
- summarize table references
- run a build check
- write:
  - `SYSTEM_AUDIT.json`
  - `SYSTEM_AUDIT.md`
  - `BUILD_BLOCKERS.md`

That gives every new build thread a reproducible map of where the system stands.

## The most important build blockers to clear before the messaging phase

1. Fix TypeScript build failures.
2. Unify routing and module loading.
3. Normalize module manifests.
4. Make Supabase the production messaging/contact source of truth.
5. Implement a real `send-sms.ts`.
6. Add message queue + delivery log schema and worker flow.
7. Add compliance controls before statewide sending:
   - consent
   - unsubscribe
   - bounce/failure handling
   - quiet hours
   - audit log

## Final judgment

This is **not a blank project**. It is a **partially built operating system with a lot of real scaffolding already in place**.

The fastest path is **not** to keep expanding sideways.

The fastest path is:

1. stabilize the build,
2. consolidate the data/messaging spine,
3. ship statewide email + SMS from the centralized contacts database,
4. then expand the rest of the platform around that stable backbone.

That is the right order for speed, safety, and low-error phase delivery.
