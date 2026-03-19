# Next Build Recommendation

## Phase to build next
Phase 1.0B - Contact Backbone

## Why
- The voters table is real and populated, so voter targeting can anchor the platform.
- CRM contacts service is still a scaffold stub, so contact actions in the UI will not persist.
- Communications email service is still a stub, so statewide email is not wired yet.
- Communications SMS service is still a stub, so text messaging is not wired yet.

## Recommended scope
- Create a production-ready `contacts` schema and repository layer.
- Replace stubbed CRM contacts, email, and SMS services with real implementations.
- Keep `voters` read-only and use it only for enrichment/targeting.
