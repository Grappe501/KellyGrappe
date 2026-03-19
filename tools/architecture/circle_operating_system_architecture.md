# Circle Operating System Architecture

## Core idea

The platform is a **Circle Operating System**:

```text
Platform
 ├─ Kernel
 ├─ Shared Contracts
 ├─ AI Copilot Layer
 ├─ Data / Event Bus
 ├─ Registry System
 └─ Circles
      ├─ Engines
      ├─ Services
      ├─ AI Roles
      ├─ Cards
      ├─ Dashboards
      ├─ Wizards
      ├─ Simulators
      ├─ Monitoring
      └─ Generators
```

Each **Circle** is a plug-in operational domain with the same internal shape.

## Universal Circle Diagram

```text
Organization / Workspace
  ↓
Room
  ↓
Circle
  ├─ config/
  ├─ types/
  ├─ engines/
  ├─ services/
  ├─ ai/
  ├─ generators/
  ├─ simulators/
  ├─ monitoring/
  ├─ cards/
  ├─ dashboards/
  ├─ wizards/
  └─ adapters/
```

## Circle-to-Card Diagram

```text
Circle
  ↓
Capabilities
  ↓
Engines
  ↓
Cards
  ↓
Dashboards
  ↓
Rooms
```

## Generator Stack

```text
Suite Generator
  ↓
Circle Generator
  ↓
Subsystem Generator
  ↓
Card Generator
  ↓
Dashboard Generator
  ↓
AI Role Generator
  ↓
Monitoring / Drift Reports
```

## AI Optimization Loop

```text
Inputs / Telemetry / Survey / CRM / Campaign Data
  ↓
Strategy + Simulation Engines
  ↓
Recommendations
  ↓
Human or automated execution
  ↓
Monitoring / forecast-vs-reality
  ↓
Model adjustments
  ↓
Improved simulations and planning
```

## Universal rules

1. Every circle must be reusable across civic and business contexts.
2. Every circle must support AI roles as attachable capabilities.
3. Every circle must expose cards, dashboards, services, and monitoring.
4. Every circle should be scaffoldable by Python tooling.
5. Every circle should be testable for drift against a build map.
6. Every circle should support future generators at the next layer down.

## Top 10 circles scaffolded in this suite

1. Strategy Circle
2. Data Circle
3. Communications Circle
4. Field Circle
5. Budget Circle
6. Fundraising Circle
7. Volunteer Circle
8. Surveys Circle
9. CRM Circle
10. Training Circle

## Shared AI roles

- Explainer
- Builder
- Auditor
- Simulator
- Forecaster
- Optimizer
- Researcher
- Monitoring Analyst
- Recommendation Assistant
- Workflow Composer

## Suggested development order

1. Strategy
2. Data
3. Communications
4. Field
5. Budget
6. CRM
7. Surveys
8. Volunteer
9. Fundraising
10. Training

## Why Python suite first

A Python suite gives you:

- repeatable scaffolding
- package generation
- drift detection
- architecture enforcement
- fast expansion of circles and cards
- a path toward AI-assisted code generation inside safe boundaries
