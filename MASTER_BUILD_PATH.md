# Arkansas Campaign Intelligence Platform
# Master Platform Architecture + Build Path

This file defines the **authoritative architecture, development roadmap, and system philosophy** for the Campaign Operations Platform.

It exists so that:

• future developers understand the system instantly  
• AI development remains aligned with architecture  
• upgrades remain modular and predictable  
• the platform can scale to multiple organizations  

This file is **the canonical build map**.

---

# 1. Executive Summary

The current system is **already a functioning operations platform**.

It contains:

- Intake pipelines
- Contact database
- Follow-up management
- Contact import center
- Voter intelligence schema direction
- Netlify serverless backend
- A modular dashboard system

The next architectural shift is critical:

**The system must become a CARD-DRIVEN OPERATING SYSTEM.**

Pages become shells.  
Cards become functionality.  
Dashboards assemble cards.

This enables:

- reusable components
- role-based command centers
- AI-assisted dashboard generation
- workspace-level branding
- organization-level permissions
- large scale expansion

---

# 2. Platform Philosophy

Everything becomes a **card**.
# Arkansas Campaign Intelligence Platform
# Master Platform Architecture + Build Path

This file defines the **authoritative architecture, development roadmap, and system philosophy** for the Campaign Operations Platform.

It exists so that:

• future developers understand the system instantly  
• AI development remains aligned with architecture  
• upgrades remain modular and predictable  
• the platform can scale to multiple organizations  

This file is **the canonical build map**.

---

# 1. Executive Summary

The current system is **already a functioning operations platform**.

It contains:

- Intake pipelines
- Contact database
- Follow-up management
- Contact import center
- Voter intelligence schema direction
- Netlify serverless backend
- A modular dashboard system

The next architectural shift is critical:

**The system must become a CARD-DRIVEN OPERATING SYSTEM.**

Pages become shells.  
Cards become functionality.  
Dashboards assemble cards.

This enables:

- reusable components
- role-based command centers
- AI-assisted dashboard generation
- workspace-level branding
- organization-level permissions
- large scale expansion

---

# 2. Platform Philosophy

Everything becomes a **card**.

This architecture allows the system to become:
Campaign Operating System

usable by:

- political campaigns
- nonprofits
- civic coalitions
- churches
- youth movements
- ballot initiative teams
- advocacy organizations

---

# 3. Current Codebase Snapshot

Root scan summary:

- ~57 TypeScript files
- ~51 TSX React files
- SQL schemas for voter intelligence
- serverless Netlify functions
- modular feature modules
- reusable shared utilities

:contentReference[oaicite:1]{index=1}

---

# 4. Current Root Structure

usable by:

- political campaigns
- nonprofits
- civic coalitions
- churches
- youth movements
- ballot initiative teams
- advocacy organizations

---

# 3. Current Codebase Snapshot

Root scan summary:

- ~57 TypeScript files
- ~51 TSX React files
- SQL schemas for voter intelligence
- serverless Netlify functions
- modular feature modules
- reusable shared utilities

:contentReference[oaicite:1]{index=1}

---

# 4. Current Root Structure
    cards/
    dashboards/
    modules/
    shared/
    pages/

netlify/functions/
supabase/
docs/
build_directions/
backups/
supabase/
docs/
build_directions/
backups/

---

# 5. Application Source Layout

---

# 5. Application Source Layout

---

# 6. Module System (Current)

Modules represent full workflows.
modules/

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
modules/

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

Each module contains:

---

# 7. High Value Current Assets

| Asset | Location |
|------|------|
Core intake pipeline | intake/processIntake.ts |
Live contact entry | liveContact/ |
Business card scanning | businessCardScan/ |
Contact import center | CONTACT_IMPORT/ |
War Room dashboard shell | dashboard/ |
Database service layer | shared/utils/db/services |
Netlify functions | netlify/functions |
Voter intelligence schema | supabase |

---

# 8. The Card System

Cards are the **atomic UI + capability unit**.

Cards must follow a shared contract defined in:

---

# 7. High Value Current Assets

| Asset | Location |
|------|------|
Core intake pipeline | intake/processIntake.ts |
Live contact entry | liveContact/ |
Business card scanning | businessCardScan/ |
Contact import center | CONTACT_IMPORT/ |
War Room dashboard shell | dashboard/ |
Database service layer | shared/utils/db/services |
Netlify functions | netlify/functions |
Voter intelligence schema | supabase |

---

# 8. The Card System

Cards are the **atomic UI + capability unit**.

Cards must follow a shared contract defined in:

Cards are registered in:

Cards are registered in:

Cards are registered in:

Dashboards import cards through the registry.

---

# 9. Card Categories

## Command

Control interfaces.

Examples

- CommandSearchCard
- ActionQueueCard
- CommandSummaryCard
- AICommandCard

---

## Metrics

Real-time campaign intelligence.

Examples

- VoteGoalCard
- ContactsCard
- FollowUpsCard
- PowerOf5Card
- FollowUpBreakdownCard

---

## Messaging

Communication hub.

Examples

- MessagingCenterCard
- SMSCard
- EmailCard
- MessageTemplatesCard
- MessageActivityCard

---

## Social Media

Multi-account publishing.

Examples

- SocialMediaCard
- TikTokCard
- FacebookCard
- InstagramCard
- TwitterXCard
- YouTubeCard
- SubstackEditorCard

---

## Fundraising

Grassroots funding systems.

Examples

- GrassrootsFundraisingCard
- CallTimeCard
- RecurringDonorCard
- GoodChangeStatusCard

---

## Operations

Campaign logistics.

Examples

- VolunteerQueueCard
- FieldCoverageCard
- EventStaffingCard
- FollowUpBreakdownCard

---

## Intake

Entry pipelines.

Examples

- BusinessCardScannerCard
- ContactImportCard
- LiveContactCard
- EventRequestCard

---

# 10. Dashboards

Dashboards assemble cards.

Example:
WarRoomDashboard

Future dashboards:

Future dashboards:

---

# 11. Role Dashboards

Each role gets a tuned dashboard.

Examples:

---

# 11. Role Dashboards

Each role gets a tuned dashboard.

Examples:

---

# 12. Micro-Room Architecture

Micro-rooms are focused workspaces.

Examples:

---

# 12. Micro-Room Architecture

Micro-rooms are focused workspaces.

Examples:

Each loads a dashboard template.

---

# 13. AI Layer

AI can appear in any dashboard via:

Each loads a dashboard template.

---

# 13. AI Layer

AI can appear in any dashboard via:

AI capabilities include:

- strategy suggestions
- volunteer task generation
- dashboard creation
- data summarization
- rapid response messaging
- event planning
- analytics interpretation

---

# 14. AI Interaction Logging

Every AI call must record:

AI capabilities include:

- strategy suggestions
- volunteer task generation
- dashboard creation
- data summarization
- rapid response messaging
- event planning
- analytics interpretation

---

# 14. AI Interaction Logging

Every AI call must record:

This supports:

- analytics
- auditing
- legal defense
- model tuning

---

# 15. Branding + Themes

The platform supports **multi-organization themes**.

Examples:

- Kelly for SOS
- NAACP chapter
- church coalition
- youth movement

Themes are applied using:

This supports:

- analytics
- auditing
- legal defense
- model tuning

---

# 15. Branding + Themes

The platform supports **multi-organization themes**.

Examples:

- Kelly for SOS
- NAACP chapter
- church coalition
- youth movement

Themes are applied using:

Cards must use CSS variables.

Example tokens:

Cards must use CSS variables.

Example tokens:

---

# 16. Integration Layer

External services:

---

# 16. Integration Layer

External services:

---

# 17. Command Centers

Major command environments:

---

# 17. Command Centers

Major command environments:

---

# 18. System Admin Universe

Admin dashboard controls:

- card enablement
- feature toggles
- AI usage limits
- workspace setup
- theme configuration
- dashboard composition
- user roles
- tenant management

---

# 19. 25 Step Forward Roadmap

1 Stabilize War Room shell  
2 Fix contact search services  
3 Complete MessagingCenterCard  
4 Complete ActionQueueCard  
5 Complete CommandSearchCard  
6 Complete VoteGoalCard  
7 Complete ContactsCard  
8 Complete FollowUpsCard  
9 Complete PowerOf5Card  
10 Complete FollowUpBreakdownCard  
11 Complete CommandSummaryCard  
12 Assemble WarRoomDashboard  
13 Introduce card registry  
14 Add card type contracts  
15 Create theme provider  
16 Create dashboard template registry  
17 Create role registry  
18 Create micro-room registry  
19 Add AI interaction logging  
20 Build Messaging Command Center  
21 Build Social Command Center  
22 Build Fundraising Command Center  
23 Build Field Command Center  
24 Add training integration  
25 Enable AI-generated dashboards

---

# 20. Priority File Build Order

1 contacts.service.ts  
2 MessagingCenterCard.tsx  
3 ActionQueueCard.tsx  
4 CommandSearchCard.tsx  
5 VoteGoalCard.tsx  
6 ContactsCard.tsx  
7 FollowUpsCard.tsx  
8 PowerOf5Card.tsx  
9 FollowUpBreakdownCard.tsx  
10 CommandSummaryCard.tsx  
11 cards/registry.ts  
12 cards/types.ts  
13 dashboards/templates/warRoom.template.ts  
14 dashboards/WarRoomDashboardPage.tsx  
15 theme/ThemeProvider.tsx  
16 theme/theme.types.ts  
17 ai/interactionLogger.ts  
18 netlify/functions/ai-command.ts  
19 cards/ai/AICommandCard.tsx  
20 dashboards/templates/messaging.template.ts  
21 cards/social/SocialMediaCard.tsx  
22 cards/fundraising/GrassrootsFundraisingCard.tsx  
23 microrooms/registry.ts  
24 roles/registry.ts  
25 admin/SystemAdminDashboardPage.tsx

---

# 21. Platform Rules

1 Every capability must become a card.  
2 Cards must follow types.ts contract.  
3 Cards must register in CardRegistry.  
4 Dashboards contain no business logic.  
5 Services live in shared/utils/db/services.  
6 Styling must respect ThemeProvider tokens.  
7 AI interactions must be logged.  
8 Modules handle workflows.  
9 Cards remain reusable.  
10 Avoid one-off pages.

---

# 22. Long Term Vision

The system becomes a **complete civic operating system** capable of running:

- campaigns
- nonprofits
- advocacy groups
- churches
- youth movements
- civic coalitions

inside a unified **Command Console Platform**.

---
ADDENDUM — PLATFORM EXPANSION ARCHITECTURE (CIVIC NETWORK LAYER)

This addendum documents the next architectural evolution of the Campaign Intelligence Platform.

The platform is evolving from a campaign operations system into a bottom-up civic organizing operating system.

The existing architecture remains valid and continues to function as the campaign command layer.

This addendum introduces additional layers that operate above and below the existing system.

A1. Three Layer Platform Model

The platform now operates across three primary layers.

Layer 1 — Civic Network Layer

The foundational network of individuals organizing themselves.

Every user begins as a citizen profile.

Users can organize upward through capability unlocks.

Progression ladder:

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

This layer exists independently of campaigns.

Campaigns plug into this network rather than controlling it.

Layer 2 — Organization Layer

Organizations connect to the civic network.

Examples:

political campaigns

advocacy organizations

community coalitions

churches

youth movements

nonprofit groups

Organizations may:

invite network members

provide training

create workspaces

coordinate action

nominate leaders

Layer 3 — Command Layer

The command layer is the existing campaign operations system.

This includes:

dashboards

command centers

messaging

fundraising

volunteer operations

event planning

field organizing

analytics

These tools are implemented using the card system.

A2. Civic Growth System

The platform introduces a capability unlock system.

Capabilities unlock based on:

completed training

network size

participation

nominations

role approval

organizational membership

This enables organic leadership development.

Users progress through organizing tiers.

A3. Voter Self-Service Dashboard

Each user will eventually have a personal civic dashboard.

Possible cards include:

MyCivicProfileCard
MyIssuesCard
MyTrainingsCard
MyGroupsCard
MyInvitationsCard
MyActionFeedCard
MyVolunteerPathCard

These dashboards allow individuals to:

track their civic activity

organize groups

participate in campaigns

nominate leaders

complete training modules

A4. Power of 5 Organizing System

The Power of 5 model is the entry point for organizing.

Each user is encouraged to recruit a small circle.

Example structure:

User
├── Member
├── Member
├── Member
├── Member
└── Member

This creates a distributed organizing tree.

Growth becomes exponential when replicated across the network.

A5. Group Federation

Groups can connect upward through invitations.

Possible group types:

neighborhood groups

precinct teams

issue groups

campus groups

church coalitions

advocacy teams

Groups can share:

workspaces

messaging channels

event coordination

training materials

This allows a bottom-up coalition network.

A6. AI Command Layer

Artificial intelligence becomes a coordinator and assistant throughout the system.

AI capabilities include:

dashboard generation

strategy analysis

volunteer task creation

messaging assistance

event planning

organizing guidance

data summarization

network growth analysis

AI must follow logging rules described in Section 14.

A7. Call Time and Phone Banking Systems

The platform will include integrated communications operations.

Key cards:

CallTimeCommandCard
LiveDialerCard
CallScriptCard
CallDispositionCard
PhoneBankQueueCard
FollowUpOutcomeCard

These systems connect to:

fundraising dashboards

volunteer dashboards

contact database

messaging pipelines

A8. Volunteer Social Amplification

Volunteers may connect personal social media accounts.

Possible cards:

VolunteerSocialWorkspaceCard
ConnectedAccountsCard
SuggestedPostsCard
ContentQueueCard
DistributedEngagementCard

This creates a distributed messaging amplification network.

Volunteers can receive approved content and publish through their own accounts.

A9. Quantum Lazy Architecture

To maintain performance as the platform grows, the system follows a quantum lazy architecture model.

Principle:

Nothing loads until observed.

Implications:

cards load lazily

dashboards render dynamically

features unlock progressively

registries activate components

unused modules remain dormant

This allows the platform to support large feature sets while remaining fast.

A10. Platform Automation Toolchain

Several automation tools assist development.

Example tools:

tools/migration_repo_analyzer.py
tools/platform_stub_generator.py
tools/card_auto_registrar.py
tools/visual_dashboard_manifest_builder.py
tools/ai_dashboard_prompt_builder.py
tools/platform_update_generator.py

These scripts provide:

architecture verification

automatic file generation

dashboard manifest creation

AI development guidance

repository state comparison

A11. AI-Assisted Development

AI development workflows are supported by:

migration analyzer reports

architecture documents

registry scanning

dashboard manifest generation

AI agents should always read:

READ_APPLY_FIRST.md
MASTER_BUILD_PATH.md
ARCHITECTURE_MAP.md
DEVELOPER_RULES.md
SYSTEM_OVERVIEW.md

before making code changes.

A12. Platform Scalability Expectations

The system is designed for gradual scaling.

Approximate operational phases:

Early deployment
Hundreds to thousands of active users.

Expanded deployment
Thousands to tens of thousands.

Large scale network
Hundreds of thousands possible with infrastructure upgrades.

Performance depends on:

database indexing

serverless concurrency

caching strategies

message provider limits

AI usage controls

A13. Long-Term Platform Vision

The platform becomes a Civic Operating System capable of supporting:

democratic organizing

grassroots campaigns

coalition coordination

issue advocacy

community leadership development

This system allows citizens to organize upward from the grassroots level rather than relying on top-down campaign structures.

End Addendum

/*
PlatformBootstrap

Loads the platform registries so the system is ready
before dashboards render.

This is where:

cards
dashboards
roles
microrooms
brands
features

are initialized.
*/

import "@/cards/registry";

import "@/dashboards/templates/warRoom.template";

import "@/platform/defaults/default.roles";
import "@/platform/defaults/default.features";
import "@/platform/defaults/default.microrooms";
import "@/platform/defaults/default.brands";

export function bootstrapPlatform() {

  console.log("Platform bootstrap complete");

}

