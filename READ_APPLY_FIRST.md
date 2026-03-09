IMPORTANT — READ BEFORE ANALYZING THIS REPOSITORY

This repository is in ACTIVE ARCHITECTURAL MIGRATION.

The system is transitioning from a module-centric campaign application to a registry-driven Civic Operations Operating System.

During this transition, legacy modules and the new platform architecture will coexist intentionally.

This is expected.

Do not assume the repository is incomplete or broken simply because both systems are present.

Step 1 — Run the Migration Analyzer

Before evaluating the repository structure, run the migration analyzer.

python tools/migration_repo_analyzer.py

This script generates a detailed architecture report.

Expected output files:

analysis/migration_repo_report.md
analysis/migration_repo_report.json
analysis/platform_diff_report.md

These reports explain:

• current architecture state
• migration progress
• platform spine detection
• registry system detection
• card system detection
• legacy module presence
• recommended next files

Always read the generated report before making architectural assumptions.

Step 2 — Read the Platform Governance Documents

After reviewing the analyzer report, read the platform governance documents located in the repository root.

These files define the platform architecture and development rules.

Required reading order:

MASTER_BUILD_PATH.md
SYSTEM_OVERVIEW.md
ARCHITECTURE_MAP.md
DEVELOPER_RULES.md

These documents define:

• system philosophy
• architectural layers
• platform roadmap
• engineering standards
• card-driven architecture rules

Do not modify platform architecture without referencing these documents.

Step 3 — Understand the Platform Architecture

The platform is designed as a Card-Driven Civic Operations System.

Core hierarchy:

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

Principles:

• Pages are shells.
• Cards contain functional capability.
• Dashboards assemble cards.
• Services contain business logic.
• Registries configure the platform.

Step 4 — Understand the Platform Spine

The new architecture introduces a platform spine.

This system dynamically assembles the platform through registries.

Core components include:

PlatformBootstrap
Card Registry
Dashboard Registry
Role Registry
Micro-Room Registry
Feature Registry
Brand Registry

Bootstrap file:

app/src/platform/PlatformBootstrap.ts

Bootstrap loads the platform registries before any dashboard renders.

Step 5 — Understand the Card System

Cards are the atomic functional unit of the platform.

Cards live in:

app/src/cards/

Cards must:

• follow the card type contract
• register in the card registry
• remain reusable across dashboards

Cards must not directly access the database.

All data access goes through services.

Step 6 — Understand the Lazy Architecture

The platform follows a lazy activation architecture.

Principle:

Nothing loads until observed.

Meaning:

• cards load dynamically
• dashboards render on demand
• modules activate only when needed
• registries enable modular loading

This design keeps the system performant as capabilities expand.

Step 7 — Understand the Automation Toolchain

The repository includes automation tools used to maintain architecture consistency.

Important tools:

tools/migration_repo_analyzer.py
tools/platform_stub_generator.py
tools/card_auto_registrar.py
tools/visual_dashboard_manifest_builder.py
tools/ai_dashboard_prompt_builder.py
tools/platform_update_generator.py

These tools assist with:

• repository architecture analysis
• automatic file scaffolding
• card registry maintenance
• dashboard generation
• AI development workflows

Developers and AI agents should use these tools before making structural changes.

Step 8 — Migration Reality

During migration you will see both:

Legacy structure:

app/src/modules/

and new platform architecture:

app/src/platform/
app/src/cards/
app/src/dashboards/

This coexistence is intentional.

Legacy modules will gradually migrate into:

• cards
• services
• dashboard templates

Step 9 — Development Rule

When adding new features ask:

Is this a card?
Is this a dashboard?
Is this a service?
Is this a module workflow?
Is this a registry configuration?

Avoid creating:

• one-off pages
• duplicated logic
• hard-coded UI

Follow the rules defined in DEVELOPER_RULES.md.

Step 10 — Platform Vision

The long-term goal of this system is to become a Civic Operating System capable of powering:

• campaigns
• nonprofits
• grassroots movements
• advocacy coalitions
• civic engagement networks
• leadership training systems

The architecture must remain modular, scalable, and AI-assisted.

Final Instruction

Before performing architectural analysis or writing new code:

Run the migration analyzer.

Read the generated report.

Read the platform governance documents.

Confirm the migration state.

Only then should development proceed.