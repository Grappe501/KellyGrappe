# Arkansas Election Information Engine

## Purpose

The Election Information Engine is the campaign site's neutral, source-attributed voter-information layer. It is designed to make Arkansas election information easier to find without presenting campaign content as government information.

## 2026 General Election

- Election Day: November 3, 2026
- Early voting: October 19 through November 2, subject to county-specific official schedules
- Election Day voting hours: 7:30 AM–7:30 PM
- Primary authoritative source: Arkansas Secretary of State
- Secondary election administration source: Arkansas State Board of Election Commissioners
- Address lookup reference: Arkansas VoterView

## Data contract

Every polling location must have a stable `id` and `electionId`, county, name, physical address, type, official source URL, and verification state. Optional fields include dates, hours, ZIP, coordinates and accessibility verification.

Location records are not campaign-authored facts. They must be collected from official county/SOS/SBEC material, retain source attribution, and carry verification metadata. Changes must be versioned by election cycle rather than silently overwriting history.

## Public/private boundary

The public Voter Center can expose official location facts, dates, hours, directions and source links. It must not expose campaign lead assignments, volunteer notes, internal status, private contact information or campaign staffing plans.

The private Polling Operations dashboard can use the same location IDs while adding campaign-only operational records. Volunteer lead intake will be added only after the campaign supplies the final form requirements.

## Build sequence

1. Election data contract and public/private boundary — complete.
2. Public Voter Center routes and foundational UI — complete.
3. Statewide official polling-location ingestion for all 75 counties — next.
4. Address-to-precinct and address-to-location resolution.
5. Sample ballot / ballot-content engine.
6. Private polling lead assignment data and dashboard persistence.
7. Campaign volunteer lead intake form.
8. Results and historical election center.

## Guardrails

- Never imply the campaign site is the Arkansas government website.
- Official sources control when information conflicts.
- Display source and verification metadata for election facts.
- Do not use voter lookup information to create persuasion scores, political profiles or targeted persuasion recommendations.
- Keep campaign staffing data behind authenticated/private permissions.
- Never ship placeholder polling locations as if they were verified official records.
