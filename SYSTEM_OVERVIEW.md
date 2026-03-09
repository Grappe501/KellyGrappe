# Campaign Operations Platform
# System Overview

This document provides a **high-level overview of the Campaign Operations Platform**.

It is designed so that a new developer, contributor, or AI agent can understand:

• what the system does  
• how it is structured  
• how development is organized  
• where to add new features  

This platform functions as a **Civic Operations Operating System** capable of powering:

- political campaigns
- nonprofit organizations
- civic engagement programs
- youth leadership initiatives
- churches and faith networks
- advocacy coalitions
- grassroots movements

The system is **modular, scalable, AI-assisted, and multi-tenant**.

---

# 1. Core Concept

The platform is built as a **Card-Driven Command System**.

Every capability in the system becomes a **card**.

Cards assemble into dashboards.

Dashboards power roles.

Roles operate inside organizations.

Architecture flow:


cards
↓
dashboards
↓
roles
↓
micro-rooms
↓
organizations
↓
platform


This allows the system to scale cleanly without creating massive monolithic pages.

---

# 2. What the Platform Does

The platform manages the full operational lifecycle of a civic organization or campaign.

Core capabilities include:

### Contact Management

- contact intake
- voter matching
- supporter categorization
- relationship tracking
- geographic mapping

### Volunteer Management

- recruitment
- assignment
- follow-ups
- leadership ladder tracking
- organizer tree

### Messaging

- SMS communication
- email broadcasting
- message templates
- conversation tracking
- outreach automation

### Field Operations

- precinct management
- event staffing
- volunteer coverage
- canvassing coordination
- task tracking

### Fundraising

- grassroots donations
- donor pipelines
- call time management
- recurring donor tracking
- GoodChange integration

### Social Media

- multi-platform publishing
- engagement tracking
- rapid response messaging
- TikTok priority launch

### AI Assistance

- message drafting
- strategic recommendations
- volunteer task suggestions
- analytics interpretation
- dashboard generation

---

# 3. Root Project Structure


Kelly_Grappe_for_SOS_APP/

.env
netlify.toml
package.json

MASTER_BUILD_PATH.md
ARCHITECTURE_MAP.md
DEVELOPER_RULES.md
SYSTEM_OVERVIEW.md

app/
supabase/
docs/
build_directions/


---

# 4. Application Architecture

The operational system lives inside:


app/


Structure:


app/

src/
netlify/functions/
dist/


---

# 5. Source Architecture


app/src/

assets/
cards/
components/
modules/
shared/
pages/
theme/
ai/
integrations/
roles/
microrooms/
dashboards/
admin/


Each directory represents a **platform layer**.

---

# 6. The Card System

Cards are the **core functional unit** of the platform.

Cards live in:


app/src/cards/


Examples of cards:


VoteGoalCard
ContactsCard
FollowUpsCard
PowerOf5Card
ActionQueueCard
CommandSearchCard
MessagingCenterCard
AICommandCard


Cards are registered in:


cards/registry.ts


Cards must follow the shared contract in:


cards/types.ts


---

# 7. Dashboards

Dashboards assemble cards into command environments.

Example dashboards:


WarRoomDashboard
MessagingDashboard
FundraisingDashboard
FieldDashboard
VolunteerDashboard
AdminDashboard


Dashboards live in:


app/src/dashboards/


Dashboards should only arrange cards — not implement business logic.

---

# 8. Modules

Modules implement full workflows.

Modules live in:


app/src/modules/


Current modules include:


businessCardScan
contacts
CONTACT_IMPORT
dashboard
eventRequests
intake
liveContact
organizerTree
teamSignup
voterImport


Modules usually contain:


components/
hooks/
services/
types/
utils/


---

# 9. Shared Infrastructure

Reusable infrastructure lives in:


app/src/shared/


This includes:


shared/components/
shared/utils/
shared/utils/db/
shared/utils/db/services/


Important database services include:


contacts.service.ts
followups.service.ts
origins.service.ts
media.service.ts
relationships.service.ts
voterMatching.service.ts


---

# 10. Database Layer

The current system uses IndexedDB for local storage.

Database core files:


shared/utils/db/

contactsDb.core.ts
contactsDb.ts
contactsDb.types.ts


Future support may include:

- Supabase
- PostgreSQL
- external voter datasets

---

# 11. Serverless Backend

Server-side tasks run through Netlify functions.


app/netlify/functions/


Examples:


scan-card.ts
followup-ai.ts
event-assist.ts
ai-command.ts


These functions handle:

- AI tasks
- OCR processing
- integrations
- automation

---

# 12. Theme System

The platform supports multiple organizations through themes.

Themes live in:


app/src/theme/


Example themes:


kelly_campaign
naacp
church_coalition
student_movement


Themes control:

- colors
- typography
- logos
- card styling

Cards must use theme variables.

---

# 13. AI System

AI tools assist with campaign operations.

AI code lives in:


app/src/ai/


Examples:


interactionLogger.ts
modelRouter.ts
promptRegistry.ts


AI capabilities include:

- drafting messages
- suggesting strategies
- generating dashboards
- analyzing campaign data

All AI usage must be logged.

---

# 14. Roles

Role dashboards define what users see.

Roles live in:


app/src/roles/


Examples:


candidate
campaign_manager
field_director
county_captain
precinct_captain
volunteer
admin


---

# 15. Micro-Rooms

Micro-rooms are specialized workspaces for focused operations.


app/src/microrooms/


Examples:


precinct_room
event_room
fundraising_push_room
rapid_response_room
campus_room
church_room
petition_room


Each micro-room loads a dashboard template.

---

# 16. Integration Layer

External integrations live in:


app/src/integrations/


Planned integrations include:


Twilio
SendGrid
GoodChange
Social APIs
Calendar systems
Voter data


---

# 17. Development Workflow

When building new functionality, follow this order:

1. Create or extend a **service**
2. Create a **card**
3. Register the card in `cards/registry.ts`
4. Add the card to a **dashboard**
5. Connect the dashboard to roles or micro-rooms

Avoid creating standalone pages.

---

# 18. Key System Documents

Four root documents govern the platform:


MASTER_BUILD_PATH.md
ARCHITECTURE_MAP.md
DEVELOPER_RULES.md
SYSTEM_OVERVIEW.md


These files define:

• the roadmap  
• architecture  
• developer rules  
• system orientation  

Developers should read these before contributing code.

---

# 19. Long-Term Vision

The platform evolves into a **complete civic operating system** capable of managing:

- campaigns
- nonprofits
- advocacy organizations
- youth movements
- community coalitions

All through a unified command console.

The goal is to make it possible for **small teams to operate like large professional organizations** using modern technology and AI assistance.

---

# End of System Overview

ADDENDUM — Civic Network Expansion

The platform architecture is expanding beyond a traditional campaign operations system.

The system is evolving into a bottom-up civic organizing platform that allows individuals to build networks and leadership structures organically.

The original command architecture remains valid and continues to operate as the operations layer.

This addendum introduces new layers that expand the platform’s mission.

A1. Civic Network Layer

The Civic Network Layer is the foundation of the platform.

Every user begins as a citizen profile rather than a campaign volunteer.

From there they may participate in:

training programs

local organizing

group formation

issue advocacy

campaign support

community leadership

This model allows the platform to support grassroots civic participation outside formal campaigns.

Campaigns and organizations can later plug into the network.

A2. Organizing Progression Ladder

Users progress through a leadership development ladder.

Example progression:

Citizen
↓
Power of 5 Organizer
↓
Neighborhood Organizer
↓
Precinct Organizer
↓
Precinct Captain
↓
County Organizer
↓
Regional Organizer
↓
State Organizer

Progression may unlock additional platform capabilities.

Unlock criteria may include:

training completion

group size

leadership nominations

event participation

network activity

This creates a self-expanding organizing ecosystem.

A3. Personal Civic Dashboard

Every user may eventually have a personal civic dashboard.

This dashboard provides tools for organizing, training, and participation.

Example cards include:

MyCivicProfileCard
MyIssuesCard
MyTrainingsCard
MyGroupsCard
MyInvitationsCard
MyActionFeedCard
MyVolunteerPathCard

This dashboard allows individuals to manage their participation across organizations.

A4. Power of 5 Organizing Model

The entry point for organizing is the Power of 5 system.

Each user is encouraged to recruit a small organizing group.

Example structure:

Organizer
├─ Member
├─ Member
├─ Member
├─ Member
└─ Member

These small groups create an expanding network.

When replicated across thousands of users, the network grows exponentially.

A5. Group Federation

Groups created within the platform can connect with other groups.

Possible group types include:

neighborhood teams

precinct teams

campus groups

faith networks

advocacy coalitions

youth movements

Groups may share:

workspaces

messaging channels

events

training resources

This allows organizations to build coalition networks without centralized control.

A6. Volunteer Social Amplification

Volunteers may optionally connect personal social media accounts.

Possible cards include:

VolunteerSocialWorkspaceCard
ConnectedAccountsCard
SuggestedPostsCard
ContentQueueCard
DistributedEngagementCard

This allows organizations to distribute approved messaging that volunteers can share through their own networks.

This creates a distributed messaging amplification system.

A7. Call Time and Phone Banking Systems

The platform will support integrated communications operations.

Possible cards include:

CallTimeCommandCard
LiveDialerCard
CallScriptCard
CallDispositionCard
PhoneBankQueueCard
FollowUpOutcomeCard

These systems connect to:

fundraising pipelines

volunteer operations

contact databases

messaging systems

A8. AI Organizing Assistance

AI tools will expand beyond operational assistance.

Future AI capabilities may include:

organizing guidance

group growth suggestions

message strategy recommendations

campaign analytics interpretation

network growth analysis

automated dashboard creation

All AI interactions must follow the logging requirements described in Section 13.

A9. Quantum Lazy Architecture

To maintain performance while expanding features, the platform follows a lazy activation architecture.

Principle:

Nothing loads until observed.

Implications:

cards load dynamically

dashboards render only when accessed

modules remain dormant until used

features unlock progressively

registries activate functionality on demand

This allows the platform to support large feature sets while maintaining performance.

A10. Development Automation Tools

Several automation scripts support development and architecture maintenance.

Examples:

tools/migration_repo_analyzer.py
tools/platform_stub_generator.py
tools/card_auto_registrar.py
tools/visual_dashboard_manifest_builder.py
tools/ai_dashboard_prompt_builder.py
tools/platform_update_generator.py

These tools help:

audit architecture consistency

generate platform scaffolding

build dashboard manifests

assist AI development workflows

A11. Expanded Long-Term Vision

The long-term goal is for the platform to function as a Civic Operating System.

This system allows communities to:

organize leadership pipelines

coordinate civic engagement

support campaigns and advocacy

manage volunteer networks

develop grassroots movements

The system enables individuals and communities to organize upward from the grassroots level rather than relying on traditional top-down campaign structures.

End Addendum