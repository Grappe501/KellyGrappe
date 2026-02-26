# Phase 1: Event Requests Wizard (Module 001)

This folder is designed to be unzipped directly into:
`app/src/modules/`

It replaces `eventRequests/EventRequestPage.tsx` with a wizard-style UI.

## Notes
- AI Assist calls `/.netlify/functions/event-assist` if available.
- Calendar check calls `/.netlify/functions/calendar-check` if available.
- Submission uses existing project utilities:
  - `submitModule()` from `shared/utils/apiClient`
  - `processIntake()` from `shared/utils/intakePipeline`
