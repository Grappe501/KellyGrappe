\# Kelly Grappe for Secretary of State  

\# Campaign Operations Platform – System Diagram



\*\*Document Status:\*\* Living Architecture Diagram  

\*\*Purpose:\*\* Visual flow overview of how the system works now and how it scales  

\*\*Version:\*\* 1.0  

\*\*Last Updated:\*\* (Update as we go)



---



\# 1. Phase 1 System Flow (Current Build)



This is the lightweight intake engine.

\[ User (Mobile / Desktop) ]

│

▼

\[ Campaign PWA Frontend ]

│

▼

POST /.netlify/functions/api/submit

│

▼

\[ Universal Submit Function ]

│

├── Validate Against Schema

│

├── Log Submission (Google Sheet)

│

├── Send Email (SendGrid)

│

└── Create Google Calendar Event

│

▼

\[ Campaign Staff Inbox + Calendar ]





\### What Exists in Phase 1



\- Module-based forms

\- No login required

\- Google Sheet = structured storage

\- Google Calendar = scheduling view

\- Email = notification layer



---



\# 2. Module Architecture (Expandable Intake Engine)



Each feature follows the same structure:



MODULE

├── module.json (metadata)

├── schema.json (validation rules)

├── copy.md (UI text)

└── actions.json (what happens after submit)





All modules use:



\[ Frontend Module ]

│

▼

\[ Universal Submit API ]

│

▼

\[ Action Pipeline ]



This allows exponential expansion without rewriting backend logic.



---



\# 3. Long-Term Architecture (Phase 2+ CRM Core)



Once we introduce a database, the system expands:



\[ Public Users ]

│

▼

\[ Campaign PWA ]

│

▼

\[ Universal API Layer ]

│

▼

\[ Submission Log (Immutable) ]

│

├───────────────┐

▼ ▼

\[ CRM Objects ] \[ Action Engine ]

(People, Tasks, (Email, SMS,

Events, etc.) Calendar, etc.)

│

▼

\[ Supabase Postgres Database ]

│

▼

\[ Staff Dashboards + Volunteer Portal ]





---



\# 4. Full Campaign CRM System (Mature State)



&nbsp;                    ┌────────────────────┐

&nbsp;                    │   Public Modules   │

&nbsp;                    │ (Event, Volunteer, │

&nbsp;                    │  Sign, Issue, etc) │

&nbsp;                    └─────────┬──────────┘

&nbsp;                              │

&nbsp;                              ▼

&nbsp;                    ┌────────────────────┐

&nbsp;                    │  Universal Submit  │

&nbsp;                    │    API Gateway     │

&nbsp;                    └─────────┬──────────┘

&nbsp;                              │

&nbsp;                              ▼

&nbsp;               ┌────────────────────────────┐

&nbsp;               │   Submissions (Raw Log)    │

&nbsp;               └─────────┬──────────────────┘

&nbsp;                         │

&nbsp;   ┌─────────────────────┼──────────────────────┐

&nbsp;   ▼                     ▼                      ▼

┌──────────────┐ ┌────────────────┐ ┌────────────────┐

│ People │ │ Events │ │ Tasks │

└──────────────┘ └────────────────┘ └────────────────┘

│ │ │

▼ ▼ ▼

┌──────────────┐ ┌────────────────┐ ┌────────────────┐

│ Interactions │ │ Shifts │ │ Donations │

└──────────────┘ └────────────────┘ └────────────────┘

│

▼

┌──────────────────┐

│ Staff Dashboard │

└──────────────────┘





---



\# 5. Workflow Engine Concept



Every submission follows this logic:



Validate

│

Store Raw Submission

│

Execute Module Actions

│

Spawn CRM Objects (if Phase 2+)

│

Assign Tasks

│

Track Status Pipeline





This keeps:



\- Intake separate from CRM data

\- Raw data immutable

\- CRM objects structured

\- Work assignable and trackable



---



\# 6. Volunteer \& Field Expansion Diagram



Future Field Operations Layer:



\[ Volunteer Login ]

│

▼

\[ Role-Based Access Control ]

│

▼

\[ Volunteer Dashboard ]

│

├── Assigned Tasks

├── Upcoming Shifts

├── My Turf

├── Contact Scripts

└── Log Interactions





Field Logging Flow:



\[ Volunteer Logs Contact ]

│

▼

\[ Interaction Record Created ]

│

▼

\[ Update Person Record ]

│

▼

\[ Trigger Follow-Up Task if Needed ]





---



\# 7. Communications Engine (Future Automation Layer)





Trigger Event (e.g., Event Confirmed)

│

▼

\[ Automation Rule Engine ]

│

├── Send Confirmation Email

├── Send SMS Reminder

├── Notify Scheduler

└── Tag Person Record





---



\# 8. Data Evolution Path



| Phase | Storage | Auth | Dashboards | Complexity |

|-------|---------|------|------------|------------|

| Phase 1 | Google Sheets | No | No | Low |

| Phase 2 | Supabase Postgres | Yes | Staff | Medium |

| Phase 3 | Full CRM | Yes | Staff + Volunteer | High |

| Phase 4 | Automation + Field | Yes | Full Ops | Advanced |



---



\# 9. Architectural Guardrails



To avoid re-architecture mid-campaign:



1\. Never bypass the Universal Submit API.

2\. Always log raw Submissions immutably.

3\. Treat modules as plug-ins.

4\. Keep business logic in backend, not frontend.

5\. Design new features as modules, not custom code blocks.



---



\# 10. Strategic Summary



We are building:



A modular intake engine →  

that evolves into a CRM →  

that evolves into a full Campaign Operations Platform.



This system is designed to:



\- Start simple

\- Scale safely

\- Avoid rebuilds

\- Preserve data integrity

\- Enable exponential module growth



---



\# Change Log



(Add updates to architecture decisions here.)



You now have:



LONG\_TERM\_CAMPAIGN\_CRM\_ARCHITECTURE.md (strategy)



SYSTEM\_DIAGRAM.md (visual flows)



If you'd like next, we can create:



MODULE\_ROADMAP.md (next 12 modules with priority order)



DATA\_MODEL\_DRAFT.md (actual SQL table layout)



Or VOLUNTEER\_ROLE\_ARCHITECTURE.md (permission hierarchy)



You’re building this the right way.





