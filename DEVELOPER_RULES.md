# Campaign Operations Platform
# Developer Rules & Engineering Standards

This document defines the **development rules, architecture guardrails, and engineering standards** for the Campaign Operations Platform.

These rules exist to ensure the system remains:

- stable
- scalable
- modular
- AI-assisted
- multi-tenant
- production-grade

This platform is intended to power:

• political campaigns  
• nonprofits  
• advocacy groups  
• civic engagement programs  
• youth movements  
• churches  
• community coalitions  

Developers must follow these rules when adding or modifying code.

---

# 1. Core Development Philosophy

The system is designed as a **Card-Driven Operations Platform**.

Everything in the system should follow this hierarchy:


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


Pages should be **thin shells**.

Cards should contain **functional capability**.

Services should contain **business logic**.

---

# 2. Architecture Layers

The platform is organized into several architectural layers.


UI Layer
Card System
Dashboard System
Module System
Service Layer
Database Layer
Integration Layer
AI Layer
Theme Layer
Admin Layer


Each layer has a specific responsibility.

Developers must **not mix responsibilities across layers**.

---

# 3. Card System Rules

Cards are the **primary building block of the platform**.

Every new capability should become a card.

Cards live in:


app/src/cards/


Example structure:


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


Rules:

• Cards must follow the contract defined in `cards/types.ts`.  
• Cards must be registered in `cards/registry.ts`.  
• Cards must be reusable across dashboards.  
• Cards must not contain database access code directly.

---

# 4. Dashboard Rules

Dashboards assemble cards into command environments.

Dashboards live in:


app/src/dashboards/


Rules:

• Dashboards should only arrange cards.  
• Dashboards should not contain business logic.  
• Dashboards should not call database services directly.  
• Dashboards should import cards from the registry.

---

# 5. Module Rules

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


Modules typically contain:


components
hooks
services
types
utils


Rules:

• Modules handle workflow logic.  
• Modules should not duplicate functionality found in cards or services.  
• Modules may expose components used by cards.

---

# 6. Service Layer Rules

All database access must go through services.

Services live in:


app/src/shared/utils/db/services/


Examples:


contacts.service.ts
followups.service.ts
origins.service.ts
media.service.ts
relationships.service.ts
voterMatching.service.ts


Rules:

• Cards must not access IndexedDB directly.  
• Cards must call service functions.  
• Services must return typed data structures.  
• Services must not depend on UI components.

---

# 7. Database Layer

Local storage currently uses IndexedDB.

Database core files:


shared/utils/db/

contactsDb.core.ts
contactsDb.ts
contactsDb.types.ts


Rules:

• Database schema must remain backward compatible.  
• All writes must go through services.  
• Do not duplicate schema logic across modules.

Future database support may include:

- Supabase
- PostgreSQL
- external voter databases

---

# 8. AI Development Rules

AI capabilities exist throughout the platform.

AI components live in:


app/src/ai/


Examples:


interactionLogger.ts
promptRegistry.ts
modelRouter.ts


Rules:

• Every AI interaction must be logged.  
• AI responses must never modify the database directly.  
• AI should generate recommendations, not final decisions.

---

# 9. AI Logging Requirements

Every AI request must log:


timestamp
workspace
organization
dashboard
card
user
session
ip address
browser
device
model
tokens
latency
success/error
prompt
response


These logs support:

- analytics
- auditing
- legal protection
- model optimization

---

# 10. Theme System Rules

The platform supports multiple organizations.

Themes live in:


app/src/theme/


Example files:


ThemeProvider.tsx
theme.types.ts
themes/


Rules:

• Cards must use theme variables.  
• No hard-coded branding.  
• Colors must come from CSS variables.

Example tokens:


--color-primary
--color-secondary
--color-accent
--color-background
--color-card
--font-heading
--font-body


This allows the platform to support:

• Kelly for SOS  
• NAACP  
• church coalitions  
• youth programs  

with the same system.

---

# 11. Integration Rules

External integrations live in:


app/src/integrations/


Examples:


twilio
sendgrid
goodchange
social_apis
calendar
voter_data


Rules:

• Integration logic must not appear inside cards.  
• Integration adapters should exist in the integration layer.

---

# 12. Netlify Function Rules

Server-side automation runs in:


app/netlify/functions/


Example functions:


scan-card.ts
followup-ai.ts
event-assist.ts
ai-command.ts


Rules:

• Serverless functions must validate inputs.  
• Sensitive keys must remain in environment variables.

---

# 13. Role System

Role dashboards determine what users see.

Roles live in:


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


Rules:

• Roles should control dashboard templates.  
• Roles should define permission boundaries.

---

# 14. Micro-Room Rules

Micro-rooms are focused workspaces.

Micro-rooms live in:


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


Rules:

• Micro-rooms should load dashboard templates.  
• Micro-rooms should not duplicate dashboards.

---

# 15. Feature Development Rules

Before adding a feature ask:


Is this a card?
Is this a dashboard?
Is this a module?
Is this a service?
Is this an integration?
Is this an admin control?


Avoid creating:

• one-off pages  
• duplicated logic  
• hard-coded UI systems

---

# 16. Error Handling Rules

All service functions must:

- throw meaningful errors
- handle database transaction failures
- log failures where appropriate

UI components should display **user-friendly messages**.

---

# 17. Code Style Standards

The codebase follows:

• TypeScript strict mode  
• functional React components  
• hooks for state logic  
• service-based data access  

Rules:

• avoid `any` types  
• prefer strongly typed interfaces  
• use clear variable names  
• avoid deep nested logic

---

# 18. File Size Guidelines

Files should generally stay under:


500 lines


If larger:

• split into modules  
• extract hooks  
• extract services

---

# 19. Security Guidelines

Never expose:

• API keys  
• AI provider secrets  
• SMS credentials  
• email credentials

Secrets must exist in:


.env
Netlify environment variables


---

# 20. Long-Term Platform Vision

The system is intended to evolve into a **complete civic operations operating system** capable of managing:

- campaigns
- volunteers
- fundraising
- messaging
- social media
- events
- voter outreach
- leadership training
- analytics

All through a unified command console.
# End of Developer Rules

ADDENDUM — Platform Spine & Registry Engineering Rules

This addendum defines additional rules required for the registry-driven platform architecture and the evolving Civic Network Operating System.

These rules extend the existing engineering standards without modifying earlier sections.

A1. Platform Bootstrap Requirement

The platform must initialize its runtime environment through a bootstrap layer before any dashboard or card renders.

Bootstrap file:

app/src/platform/PlatformBootstrap.ts

Bootstrap responsibilities include:

• loading the Card Registry
• loading Dashboard Templates
• loading Role Registry
• loading Micro-Room Registry
• loading Feature Flags
• loading Brand Definitions

Example structure:

import "@/cards/registry";
import "@/dashboards/templates/warRoom.template";

import "@/platform/defaults/default.roles";
import "@/platform/defaults/default.features";
import "@/platform/defaults/default.microrooms";
import "@/platform/defaults/default.brands";

export function bootstrapPlatform() {
  console.log("Platform bootstrap complete");
}

Rules:

• Bootstrap must run before dashboard rendering.
• Bootstrap must load all registries.
• Registries must not depend on UI rendering order.

A2. Registry Architecture Rules

The platform uses registries to dynamically assemble the system.

Registry location:

app/src/platform/registry/

Expected registry files:

card.registry.ts
dashboard.registry.ts
role.registry.ts
microroom.registry.ts
feature.registry.ts
brand.registry.ts

Rules:

• Registries must contain configuration only.
• Registries must not contain business logic.
• Registries must export typed structures.
• Registries must be loaded during bootstrap.

A3. Card Type Contract Expansion

Cards must follow the expanded type system.

Location:

app/src/cards/types/

Expected files include:

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

Rules:

• Cards must implement the card definition contract.
• Card types must remain backward compatible.
• Card metadata must support AI dashboard generation.

A4. Lazy Loading Requirements

The platform must follow a lazy activation architecture.

Principle:

Nothing loads until observed.

Implications:

• Cards should be lazy loaded.
• Dashboards should render dynamically.
• Features should activate via feature flags.
• Registries should enable modular loading.

This ensures performance as the platform scales.

A5. Card Auto-Registration

To prevent registry drift, card registration may be automated.

Tool:

tools/card_auto_registrar.py

Rules:

• Card components should follow naming conventions.
• Cards must live inside app/src/cards/.
• Auto-registration scripts may generate registry entries.

Manual registry edits should be minimized.

A6. Development Automation Tools

Several development automation scripts assist the architecture.

Examples:

tools/migration_repo_analyzer.py
tools/platform_stub_generator.py
tools/card_auto_registrar.py
tools/visual_dashboard_manifest_builder.py
tools/ai_dashboard_prompt_builder.py
tools/platform_update_generator.py

Rules:

• Scripts should never overwrite production code without confirmation.
• Scripts should produce analysis reports when possible.
• Scripts should assist architecture consistency.

A7. Civic Network Layer Rules

The platform supports a bottom-up civic organizing model.

Future capabilities include:

• Power of 5 organizing
• neighborhood teams
• precinct leadership
• coalition networks
• leadership pipelines

These features should remain modular and optional so that organizations can enable them selectively.

A8. Capability Unlock System

Future platform capabilities may unlock based on:

• training completion
• group size
• leadership nomination
• participation metrics

Rules:

• Capability unlocks must be configurable.
• Unlock logic must remain in services or capability modules.
• Cards should check capability flags before enabling advanced features.

A9. Volunteer Social Amplification Rules

Future cards may support volunteer social media publishing.

Rules:

• Social integrations must remain optional.
• Personal account connections must use OAuth authentication.
• Volunteers must retain full control of their accounts.

No automatic posting without explicit user authorization.

A10. Call Time and Phone Banking Systems

Future communications tools may include:

CallTimeCommandCard
LiveDialerCard
CallScriptCard
CallDispositionCard
PhoneBankQueueCard
FollowUpOutcomeCard

Rules:

• Dialing systems must comply with communications regulations.
• Contact consent status must be respected.
• Messaging rate limits must be enforced.

A11. AI Development Guardrails

AI tools must remain assistive rather than autonomous.

Rules:

• AI must not perform irreversible actions automatically.
• AI must not directly modify core data without user confirmation.
• AI actions must remain auditable.

A12. Architecture Stability Principle

The platform must maintain the following design rule:

Pages are shells.
Cards are capabilities.
Dashboards assemble cards.
Registries control configuration.
Services handle logic.

Any new feature should fit within this model.

End Developer Rules Addendum