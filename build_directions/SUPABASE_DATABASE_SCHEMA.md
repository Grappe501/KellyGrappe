\# Kelly Grappe for Secretary of State  

\# Supabase Database Schema – Phase 2 CRM Core



\*\*Document Status:\*\* Foundational Schema Draft  

\*\*Purpose:\*\* Define the relational database structure for Phase 2 CRM  

\*\*Database:\*\* Supabase (Postgres)  

\*\*Version:\*\* 1.0  

\*\*Last Updated:\*\* (Update as we go)



---



\# Design Philosophy



1\. Submissions are immutable (raw intake log).

2\. CRM objects are structured and relational.

3\. All public modules feed into `submissions`.

4\. Business logic happens in backend, not the database.

5\. Use Row-Level Security (RLS) for permission control.

6\. Keep schema normalized but practical for campaign speed.



---



\# Core Architecture Overview

submissions (raw intake)

│

▼

people ─── organizations ─── locations

│

├── interactions

├── tasks

├── events

├── shifts

├── donations

└── training\_records





---



\# 1. AUTHENTICATION (Supabase Native)



Supabase provides:



\- auth.users (managed by Supabase)

\- UUID primary keys

\- JWT-based authentication



We extend this with a `profiles` table.



---



\# 2. PROFILES (Campaign Users)



Table: profiles



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) | references auth.users.id |

| full\_name | text | |

| role | text | admin, manager, scheduler, captain, volunteer |

| created\_at | timestamptz | default now() |



Purpose:

Controls dashboard permissions and internal access.



---



\# 3. SUBMISSIONS (Immutable Intake Log)



Table: submissions



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) |

| module\_id | text |

| raw\_data | jsonb |

| source | text | webapp, sms, manual |

| created\_at | timestamptz |

| processed | boolean | default false |



Rules:

\- Never update raw\_data.

\- Only update processed flag.



This ensures audit integrity.



---



\# 4. PEOPLE (Core Contact Records)



Table: people



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) |

| first\_name | text |

| last\_name | text |

| email | text |

| phone | text |

| created\_at | timestamptz |

| updated\_at | timestamptz |



Indexes:

\- index on email

\- index on phone



Future:

Add tags, engagement score, county, etc.



---



\# 5. ORGANIZATIONS



Table: organizations



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) |

| name | text |

| type | text | church, union, civic club, business |

| website | text |

| created\_at | timestamptz |



---



\# 6. LOCATIONS



Table: locations



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) |

| address\_line1 | text |

| address\_line2 | text |

| city | text |

| state | text |

| zip | text |

| latitude | numeric |

| longitude | numeric |

| created\_at | timestamptz |



Future:

Add PostGIS if turf mapping required.



---



\# 7. EVENTS



Table: events



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) |

| title | text |

| status | text | requested, confirmed, declined, completed |

| start\_time | timestamptz |

| end\_time | timestamptz |

| location\_id | uuid (FK) |

| host\_person\_id | uuid (FK) |

| organization\_id | uuid (FK) |

| submission\_id | uuid (FK) |

| created\_at | timestamptz |



This table connects intake to real campaign scheduling.



---



\# 8. TASKS



Table: tasks



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) |

| title | text |

| description | text |

| status | text | new, in\_progress, completed |

| priority | text | low, medium, high |

| due\_date | timestamptz |

| assigned\_to | uuid (FK profiles.id) |

| related\_person\_id | uuid |

| related\_event\_id | uuid |

| submission\_id | uuid |

| created\_at | timestamptz |



Purpose:

Creates workflow engine.



---



\# 9. INTERACTIONS



Table: interactions



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) |

| person\_id | uuid |

| type | text | call, text, door, email |

| notes | text |

| support\_level | text | strong\_support, lean\_support, undecided, oppose |

| created\_by | uuid |

| created\_at | timestamptz |



This powers canvassing + phone banking later.



---



\# 10. SHIFTS



Table: shifts



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) |

| volunteer\_id | uuid |

| start\_time | timestamptz |

| end\_time | timestamptz |

| checkin\_time | timestamptz |

| checkout\_time | timestamptz |

| related\_event\_id | uuid |

| created\_at | timestamptz |



Used for volunteer tracking and analytics.



---



\# 11. DONATIONS



Table: donations



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) |

| person\_id | uuid |

| amount | numeric |

| method | text | cash, check, online |

| event\_id | uuid |

| created\_at | timestamptz |



Compliance integration would be handled separately.



---



\# 12. TRAINING\_RECORDS



Table: training\_records



| Column | Type | Notes |

|--------|------|-------|

| id | uuid (PK) |

| person\_id | uuid |

| module\_name | text |

| completed\_at | timestamptz |

| badge\_awarded | text |



Supports long-term volunteer development.



---



\# Relationships Summary



\- submissions → events

\- submissions → tasks

\- people → events

\- people → interactions

\- people → donations

\- people → shifts

\- events → tasks

\- profiles → tasks



---



\# Row-Level Security Strategy (High-Level)



Profiles Role-Based Access:



Admin:

\- Full access



Manager:

\- Full read/write except role assignment



Scheduler:

\- events + tasks only



Captain:

\- Only assigned volunteers + related tasks



Volunteer:

\- Only own shifts + tasks



Public:

\- No direct DB access



---



\# Migration Plan from Phase 1



Phase 1:

Google Sheets + Calendar



Phase 2:

\- Introduce Supabase

\- Begin writing submissions to DB

\- Gradually replace Sheet logging

\- Keep Sheet as backup initially



Never remove submission logging until DB proven stable.



---



\# Architectural Guardrails



1\. Submissions are immutable.

2\. Do not mix raw intake with CRM objects.

3\. Use UUIDs everywhere.

4\. Enforce RLS before public launch.

5\. Always log created\_at timestamps.

6\. No business logic inside SQL triggers initially.



---



\# Future Expansion Considerations



\- PostGIS for turf mapping

\- Full-text search on people and interactions

\- Event RSVP table

\- Tagging system

\- Automation rules table

\- Audit trail for record edits



---



\# Change Log



(Track schema updates here.)





