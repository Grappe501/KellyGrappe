# Campaign Operations Platform
# System Architecture Map

This document maps the **entire platform architecture** for the Campaign Operations Platform.

It serves as the **developer map** for navigating the system and understanding how every layer connects.

This platform is designed to function as a **Civic Operations Operating System** capable of running:

- political campaigns
- nonprofit coalitions
- civic engagement programs
- youth movements
- faith networks
- advocacy organizations

The system is modular, AI-enabled, multi-tenant, and card-driven.

---

# 1. Root Project Structure
# Campaign Operations Platform
# System Architecture Map

This document maps the **entire platform architecture** for the Campaign Operations Platform.

It serves as the **developer map** for navigating the system and understanding how every layer connects.

This platform is designed to function as a **Civic Operations Operating System** capable of running:

- political campaigns
- nonprofit coalitions
- civic engagement programs
- youth movements
- faith networks
- advocacy organizations

The system is modular, AI-enabled, multi-tenant, and card-driven.

---

# 1. Root Project Structure

---

# 2. Application Layer

The `app/` directory contains the entire operational system.

---

# 2. Application Layer

The `app/` directory contains the entire operational system.

---

# 3. Source Architecture

---

# 3. Source Architecture

Each of these directories represents a **platform layer**.

---

# 4. Card System (Core UI Architecture)

Cards are the **primary building blocks** of the system.

All dashboards, roles, and micro-rooms are composed from cards.

Each of these directories represents a **platform layer**.

---

# 4. Card System (Core UI Architecture)

Cards are the **primary building blocks** of the system.

All dashboards, roles, and micro-rooms are composed from cards.


Expected structure:

Expected structure:
cards/

command/
metrics/
messaging/
operations/
fundraising/
social/
intake/
ai/

registry.ts
types.ts

---

# 5. Card Registry

---

# 5. Card Registry

The registry maps card identifiers to React components.

Example:

The registry maps card identifiers to React components.

Example:

The registry allows dashboards to dynamically assemble card layouts.

---

# 6. Dashboard System

Dashboards assemble cards into operational environments.

The registry allows dashboards to dynamically assemble card layouts.

---

# 6. Dashboard System

Dashboards assemble cards into operational environments.

Example dashboards:

Example dashboards:

---

# 7. Modules (Workflow Systems)

Modules implement full workflows that power cards.

---

# 7. Modules (Workflow Systems)

Modules implement full workflows that power cards.

Current modules include:

Current modules include:

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

Modules typically include:
components
hooks
services
types
utils
components
hooks
services
types
utils

---

# 8. Shared Platform Layer
app/src/shared/

Contains reusable infrastructure.

Contains reusable infrastructure.
shared/components/
shared/utils/
shared/utils/db/
shared/utils/db/services/

Important services include:

Important services include:
contacts.service.ts
followups.service.ts
origins.service.ts
media.service.ts
relationships.service.ts
voterMatching.service.ts

These services form the **data access layer**.

---

# 9. Database Layer

Local data is currently managed via IndexedDB.
shared/utils/db/

Files include:

Files include:

Future versions may support:

- Supabase
- Postgres
- external voter files

---

# 10. Netlify Serverless Layer

Future versions may support:

- Supabase
- Postgres
- external voter files

---

# 10. Netlify Serverless Layer

Used for:

- AI operations
- business card OCR
- integrations
- automation tasks

Expected functions include:

Used for:

- AI operations
- business card OCR
- integrations
- automation tasks

Expected functions include:

---

# 11. Theme System

Themes allow the platform to support **multiple organizations**.

---

# 11. Theme System

Themes allow the platform to support **multiple organizations**.


app/src/theme/

Expected files:

ThemeProvider.tsx
theme.types.ts
themes/

Example themes:

kelly_campaign
naacp
church_coalition
student_movement

Themes control:

- colors
- typography
- logos
- spacing
- card appearance

Cards must inherit theme variables.

---

# 12. AI System

AI tools assist campaign operations.
app/src/ai/

Core components:

interactionLogger.ts
modelRouter.ts
promptRegistry.ts


AI can assist with:

- messaging generation
- strategy suggestions
- dashboard building
- volunteer tasks
- analytics summaries

All AI interactions must be logged.

---

# 13. AI Logging Requirements

Every AI request must record:

timestamp
workspace
organization
dashboard
card
user
ip
browser
device
session
model
tokens
latency
success
error
prompt
response


---

# 14. Integration Layer

External systems connect here.


---
app/src/integrations/


Planned integrations:


twilio
sendgrid
goodchange
social_apis
calendar
voter_data


---

# 15. Role System

Role dashboards control user capabilities.


app/src/roles/


Example roles:


candidate
campaign_manager
field_director
county_captain
precinct_captain
volunteer
data_director
communications_director
admin


Each role loads a specific dashboard template.

---

# 16. Micro-Room System

Micro-rooms are task-focused workspaces.


app/src/microrooms/


Examples:


event_room
precinct_room
county_room
fundraising_push_room
rapid_response_room
campus_room
church_room
petition_room
candidate_briefing_room


Each micro-room loads a dashboard configuration.

---

# 17. Messaging System

Messaging is central to campaign operations.

Core capabilities include:


SMS messaging
email broadcasting
message templates
conversation history
follow-up automation


Messaging cards include:


MessagingCenterCard
SMSCard
EmailCard
MessageTemplatesCard
MessageActivityCard


---

# 18. Social Media Command Center

Planned cards:


SocialMediaCard
TikTokCard
FacebookCard
InstagramCard
TwitterXCard
YouTubeCard
SubstackEditorCard


TikTok is prioritized at launch.

---

# 19. Fundraising System

Fundraising capabilities include:


GrassrootsFundraisingCard
CallTimeCard
RecurringDonorCard
GoodChangeStatusCard


Integration planned with:


GoodChange


---

# 20. Field Operations

Field cards will include:


FieldCoverageCard
VolunteerQueueCard
CanvassTrackingCard
EventStaffingCard


These cards drive:

- turf coverage
- volunteer assignment
- event staffing

---

# 21. Intake Systems

Entry pipelines include:


BusinessCardScannerCard
ContactImportCard
LiveContactCard
EventRequestCard


These feed the contact database.

---

# 22. War Room Dashboard

The War Room is the **primary command center**.

It typically includes:


VoteGoalCard
ContactsCard
FollowUpsCard
PowerOf5Card
ActionQueueCard
CommandSearchCard
CommandSummaryCard
MessagingCenterCard


---

# 23. Platform Expansion

Future expansion includes:


AI dashboard generation
role-based dashboards
multi-tenant workspaces
custom organization themes
advanced analytics
training modules


---

# 24. Security Model

Security layers include:


workspace isolation
role-based access control
AI audit logging
admin feature toggles
secure API endpoints


---

# 25. Long-Term Vision

The platform becomes a **full civic operations system** capable of running:

- campaigns
- nonprofit organizations
- grassroots movements
- youth leadership structures
- civic engagement programs

All through a unified **command console interface**.

---

# END OF ARCHITECTURE MAP
ADDENDUM — Platform Registry Architecture

The platform architecture is expanding to include a registry-driven platform spine.

This architecture allows the platform to dynamically assemble dashboards, capabilities, and environments using registries rather than static page logic.

The goal is to transform the application into a modular Civic Operating System capable of large-scale expansion.

A1. Platform Bootstrap Layer

The platform now includes a Platform Bootstrap system responsible for initializing all registries before any dashboards render.

Location:

app/src/platform/PlatformBootstrap.ts

Example:

import "@/cards/registry";

import "@/dashboards/templates/warRoom.template";

import "@/platform/defaults/default.roles";
import "@/platform/defaults/default.features";
import "@/platform/defaults/default.microrooms";
import "@/platform/defaults/default.brands";

export function bootstrapPlatform() {
  console.log("Platform bootstrap complete");
}

Bootstrap responsibilities include:

loading card registry

loading dashboard templates

loading role registry

loading feature flags

loading micro-room registry

loading brand definitions

This ensures that the platform runtime is initialized before dashboards render.

A2. Platform Registry Layer

The platform now includes multiple registries responsible for dynamic configuration.

Location:

app/src/platform/registry/

Expected registry files:

card.registry.ts
dashboard.registry.ts
role.registry.ts
microroom.registry.ts
feature.registry.ts
brand.registry.ts

Responsibilities:

Card Registry

Maps card identifiers to React components.

Used by dashboards to dynamically render card layouts.

Dashboard Registry

Registers dashboard templates and layouts.

Role Registry

Defines which dashboards are available for specific roles.

Micro-Room Registry

Defines specialized workspace environments.

Feature Registry

Controls feature flags and capability activation.

Brand Registry

Defines organization themes and workspace branding.

A3. Card Type System

The card system now includes an expanded type architecture.

Location:

app/src/cards/types/

Expected type modules:

primitives.types.ts
featureFlags.types.ts
workspace.types.ts
cardLayout.types.ts
cardAI.types.ts
cardData.types.ts
cardDefinition.types.ts
dashboard.types.ts
microroom.types.ts
roles.types.ts
registry.types.ts
analytics.types.ts
theme.types.ts
helpers.types.ts
index.ts

These files define the contract for the entire card-driven platform.

A4. Card Auto-Registration

To reduce manual errors, the platform supports automatic card registration.

Tool:

tools/card_auto_registrar.py

This script scans:

app/src/cards/

and generates a synchronized registry mapping card identifiers to components.

Benefits include:

preventing missing registry entries

reducing developer errors

keeping dashboards dynamically discoverable

A5. Dashboard Template System

Dashboards are defined through templates rather than static pages.

Location:

app/src/dashboards/templates/

Example templates:

warRoom.template.ts
messaging.template.ts
fundraising.template.ts
field.template.ts
volunteer.template.ts
admin.template.ts

Templates define:

card layout

card configuration

data bindings

workspace context

A6. Visual Dashboard Manifest Builder

To assist dashboard generation, the platform includes a visualization tool.

Tool:

tools/visual_dashboard_manifest_builder.py

This tool can:

scan available cards

generate dashboard manifests

produce visual representations of dashboard layouts

assist AI agents in constructing dashboards

A7. AI Dashboard Prompt Builder

AI-assisted dashboard generation is supported through prompt builders.

Tool:

tools/ai_dashboard_prompt_builder.py

This script generates structured prompts describing:

available cards

data connections

dashboard templates

role environments

AI can use these prompts to generate new dashboards dynamically.

A8. Platform Migration Analyzer

To assist architecture verification, the repository includes a migration analyzer.

Tool:

tools/migration_repo_analyzer.py

This script performs automated analysis of the repository.

Outputs include:

architecture verification report

platform spine detection

registry validation

card system detection

legacy module detection

recommended next files

Generated reports include:

analysis/migration_repo_report.json
analysis/migration_repo_report.md
A9. Platform Stub Generator

To accelerate development, the platform includes a stub generator.

Tool:

tools/platform_stub_generator.py

This script can generate placeholder files for missing platform components including:

registries

card types

dashboards

services

This allows rapid architecture completion.

A10. Quantum Lazy Architecture

To maintain performance as the platform grows, the system follows a lazy activation model.

Principle:

Nothing loads until observed.

Implications:

cards are lazy-loaded

dashboards load dynamically

features unlock progressively

unused modules remain dormant

registries activate components only when required

This architecture allows the platform to scale without loading unnecessary functionality.

A11. Future Civic Network Layer

Future platform layers will support bottom-up civic organization.

These systems include:

Personal Civic Dashboards
MyCivicProfileCard
MyIssuesCard
MyTrainingsCard
MyGroupsCard
MyInvitationsCard
MyActionFeedCard
Organizing Growth System
PowerOf5BuilderCard
NeighborhoodOrganizerCard
PrecinctBuilderCard
CaptainToolsCard
Distributed Messaging Network
VolunteerSocialWorkspaceCard
SuggestedPostsCard
ContentQueueCard
DistributedEngagementCard

These systems will allow communities to organize themselves inside the platform.

A12. Architecture Stability Principle

The platform architecture follows the principle:

Pages are shells.
Cards are capabilities.
Dashboards assemble cards.
Registries control the system.

This ensures the platform remains:

modular

maintainable

scalable

AI-compatible

End Architecture Map Addendum