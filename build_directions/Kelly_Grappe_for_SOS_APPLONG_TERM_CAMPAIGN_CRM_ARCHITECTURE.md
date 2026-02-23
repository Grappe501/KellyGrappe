\# Kelly Grappe for Secretary of State  

\# Long-Term Campaign CRM Architecture Plan



\*\*Document Status:\*\* Living Document  

\*\*Purpose:\*\* Strategic roadmap for building a scalable Campaign Operations Platform  

\*\*Version:\*\* 1.0  

\*\*Last Updated:\*\* (Update as we go)



---



\# Overview



This document outlines the long-term architecture vision for the Kelly Grappe Campaign App.



The goal is not just to build forms.



The goal is to build a \*\*Campaign Operations Platform\*\* that can:



\- Capture supporter and volunteer activity

\- Coordinate scheduling and events

\- Manage field operations

\- Track fundraising

\- Power communications

\- Scale without re-architecture



This document will evolve as the system grows.



---



\# North Star Vision



A single mobile-first Campaign Operations Platform that supports:



\- Public intake (event requests, volunteer signups, yard sign requests, issue reporting)

\- Volunteer management and assignments

\- Scheduling and confirmations

\- Fundraising tracking

\- Communications workflows

\- Field operations (canvassing, shifts, turf)

\- Campaign analytics



We start simple.



We scale intentionally.



---



\# System Architecture (Long-Term)



\## 1. Frontend: Campaign Ops PWA



One Progressive Web App with two operational modes:



\### Public Mode

\- Event Request

\- Volunteer Signup

\- Yard Sign Request

\- Issue Reporting

\- RSVP forms



No login required.



\### Staff / Volunteer Mode (Phase 2+)

\- Dashboards

\- Task assignments

\- Shift management

\- Turf maps

\- Communication tools



Requires authentication and role permissions.



---



\## 2. API Layer: Universal Submit + Workflow Engine



All modules submit to a single endpoint:



POST /.netlify/functions/api/submit



Payload:


{
"moduleId": "MODULE_001_EVENT_REQUEST",
"data": { ... }
}


Backend flow:

1. Validate submission
2. Store raw Submission record
3. Execute defined module actions
4. Optionally spawn CRM objects (tasks, events, people)
5. Return response

This allows exponential expansion without rewriting architecture.

---

## 3. Data Layer Evolution

### Phase 1: No Database
- Google Sheets logging
- Email notifications
- Google Calendar integration

Goal: Validate usage and move fast.

---

### Phase 2: CRM Database (Recommended: Supabase Postgres)

When needed:
- User accounts
- Dashboards
- Task tracking
- Volunteer roles
- Analytics

Core database tables (planned):

- people
- organizations
- locations
- submissions (immutable intake log)
- tasks
- events
- interactions
- shifts
- training_records
- donations
- pledges

Design principle:
Submissions remain immutable.
CRM records are structured and relational.

---

# Campaign Object Model (What We Track)

## Core Entities

### People
Supporters, volunteers, donors, staff.

### Organizations
Churches, unions, businesses, civic clubs.

### Submissions
Raw intake from modules (never edited).

### Tasks
Assignable work units generated from submissions.

### Events
Requested, confirmed, completed appearances.

### Interactions
Calls, texts, canvass contacts, emails.

### Shifts
Volunteer time blocks.

### Donations / Pledges
Fundraising tracking.

---

# Workflow Pipelines

## Event Request Pipeline
1. Requested
2. Needs Follow-up
3. Under Review
4. Confirmed
5. Declined
6. Completed
7. Converted (host becomes volunteer/donor)

---

## Volunteer Pipeline
1. New
2. Contacted
3. Scheduled for orientation
4. Trained
5. Active
6. Leader Track

---

## Yard Sign Pipeline
1. Requested
2. Routed
3. Delivered
4. Verified

---

## Issue Intake Pipeline
1. Submitted
2. Categorized
3. Needs response
4. Resolved
5. Policy insight logged

---

# Permissions & Roles (Future)

Planned roles:

- Admin
- Campaign Manager
- Scheduler
- Field Director
- Volunteer Captain
- Volunteer
- Public user

Security model:

- Volunteers only see assigned tasks
- Captains see their team
- Staff see campaign-wide data

Row-level security to be implemented in database phase.

---

# Communications System (Future Phase)

- Email templates
- SMS confirmations
- Automated follow-ups
- Segmentation by geography and interest
- Opt-in compliance tracking

Planned integrations:
- SendGrid / Postmark
- Twilio
- CRM-driven automation rules

---

# Field Operations Suite (Advanced Phase)

- Turf management (precinct/ward)
- Walk lists / drive lists
- Script prompts
- Quick contact logging
- Offline PWA support
- Photo and note uploads
- Follow-up task generation

---

# Analytics & KPIs

Future dashboard metrics:

- New contacts per week
- Volunteer funnel conversion
- Active volunteers by county
- Doors knocked / calls made
- Event requests to confirmations
- Host conversion rate
- Yard signs delivered
- Issue trends by geography

---

# Phased Growth Plan

## Phase 1 – Intake Engine (Current Build)
- Module-based forms
- Email notifications
- Google Calendar integration
- Google Sheets logging
- No login system

---

## Phase 2 – CRM Core
- Supabase database
- Authentication
- Staff dashboard
- Task management
- Structured people records

---

## Phase 3 – Volunteer & Field Ops
- Shift scheduling
- Turf assignments
- Captain hierarchy
- Canvassing tools
- Interaction logging

---

## Phase 4 – Fundraising & Automation
- Donation tracking
- Event ticketing
- Automated communications
- Segmentation
- Advanced analytics

---

# Architectural Guiding Principle

Every module must follow this pattern:

Validate → Store Submission → Execute Actions → Spawn CRM Objects

This ensures:

- Phase 1 remains lightweight
- Phase 2 can plug in database without rewriting frontend
- New modules can be added indefinitely

---

# Why This Matters

Campaigns fail when they:

- Overengineer too early
- Rebuild systems mid-campaign
- Lose data continuity

This architecture prevents that.

We are building:

A scalable Campaign Operations Platform — not just a form.

---

# Change Log

(Record major architectural decisions here as the system evolves.)


