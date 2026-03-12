import { buildPlatformMap, type PlatformMap } from "./ai.platform.map"

export type PlatformStateSystemStatus = {
  key: string
  title: string
  complete: boolean
  present: string[]
  missing: string[]
  coverage: number
  circle?: string
}

export type PlatformStateSummary = {
  ok: boolean
  generatedAt: string
  counts: {
    modules: number
    cards: number
    services: number
    dashboards: number
    aiFiles: number
  }
  systems: PlatformStateSystemStatus[]
  strongestSystems: PlatformStateSystemStatus[]
  weakestSystems: PlatformStateSystemStatus[]
  missingPriorities: string[]
  preview: string
}

type SystemDefinition = {
  key: string
  title: string
  circle?: string
  required: {
    modules?: string[]
    cards?: string[]
    services?: string[]
    dashboards?: string[]
    aiFiles?: string[]
  }
}

function nowIso() {
  return new Date().toISOString()
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function percent(part: number, total: number) {
  if (total <= 0) return 100
  return Math.round((part / total) * 100)
}

function buildSystemDefinitions(): SystemDefinition[] {
  return [
    {
      key: "volunteer",
      title: "Volunteer System",
      circle: "people",
      required: {
        modules: ["volunteer-recruitment", "volunteer-onboarding"],
        cards: ["volunteer-leaderboard", "volunteer-funnel"],
        services: ["volunteer-outreach"],
        dashboards: ["volunteer-command"],
        aiFiles: ["volunteer-intelligence.generated"]
      }
    },
    {
      key: "donor",
      title: "Donor / Fundraising System",
      circle: "finance",
      required: {
        modules: ["donor-management", "fundraising-pipeline"],
        cards: ["donor-leaderboard", "fundraising-velocity"],
        services: ["donor-sync"],
        dashboards: ["fundraising-command"],
        aiFiles: ["donor-insights.generated"]
      }
    },
    {
      key: "field",
      title: "Field System",
      circle: "field",
      required: {
        modules: ["field-operations", "canvassing"],
        cards: ["canvass-progress", "field-coverage"],
        services: ["canvassing-sync"],
        dashboards: ["field-command"],
        aiFiles: ["field-intelligence.generated"]
      }
    },
    {
      key: "messaging",
      title: "Messaging System",
      circle: "communication",
      required: {
        modules: ["messaging-center", "outreach-automation"],
        cards: ["message-activity", "outreach-queue"],
        services: ["sms", "email"],
        dashboards: ["messaging-command"],
        aiFiles: ["messaging-assistant.generated"]
      }
    },
    {
      key: "events",
      title: "Event System",
      circle: "operations",
      required: {
        modules: ["event-operations", "event-requests"],
        cards: ["event-pipeline", "event-readiness"],
        services: ["event-sync"],
        dashboards: ["event-command"],
        aiFiles: ["event-intelligence.generated"]
      }
    },
    {
      key: "training",
      title: "Training System",
      circle: "training",
      required: {
        modules: [
          "training-programs",
          "training-tracks",
          "training-modules",
          "training-lessons"
        ],
        cards: ["training-progress", "training-dropoff"],
        services: ["training-sync"],
        dashboards: ["training-command"],
        aiFiles: ["training-architect.generated"]
      }
    },
    {
      key: "analytics",
      title: "Analytics System",
      circle: "intelligence",
      required: {
        modules: ["analytics-hub"],
        cards: ["performance-summary", "trend-monitor"],
        services: ["analytics-sync"],
        dashboards: ["analytics-command"],
        aiFiles: ["analytics-assistant.generated"]
      }
    },
    {
      key: "data",
      title: "Spreadsheet / Data Infrastructure",
      circle: "intelligence",
      required: {
        modules: [
          "spreadsheet-ingestion",
          "data-schema-mapper",
          "data-normalization",
          "county-operations",
          "counter-intelligence"
        ],
        cards: ["data-quality", "security-alerts"],
        dashboards: ["data-command"],
        aiFiles: ["data-architect.generated"]
      }
    }
  ]
}

function toLookup(map: PlatformMap) {
  return {
    modules: new Set(map.modules.map((item) => normalize(item.name))),
    cards: new Set(map.cards.map((item) => normalize(item.name))),
    services: new Set(map.services.map((item) => normalize(item.name))),
    dashboards: new Set(map.dashboards.map((item) => normalize(item.name))),
    aiFiles: new Set(map.aiFiles.map((item) => normalize(item.name)))
  }
}

function evaluateRequiredGroup(
  requiredItems: string[] | undefined,
  actual: Set<string>,
  label: string
) {
  const present: string[] = []
  const missing: string[] = []

  for (const item of requiredItems ?? []) {
    const normalized = normalize(item)

    if (actual.has(normalized)) {
      present.push(`${label}:${item}`)
    } else {
      missing.push(`${label}:${item}`)
    }
  }

  return { present, missing }
}

function evaluateSystem(
  system: SystemDefinition,
  lookups: ReturnType<typeof toLookup>
): PlatformStateSystemStatus {
  const moduleStatus = evaluateRequiredGroup(system.required.modules, lookups.modules, "module")
  const cardStatus = evaluateRequiredGroup(system.required.cards, lookups.cards, "card")
  const serviceStatus = evaluateRequiredGroup(system.required.services, lookups.services, "service")
  const dashboardStatus = evaluateRequiredGroup(system.required.dashboards, lookups.dashboards, "dashboard")
  const aiStatus = evaluateRequiredGroup(system.required.aiFiles, lookups.aiFiles, "ai")

  const present = unique([
    ...moduleStatus.present,
    ...cardStatus.present,
    ...serviceStatus.present,
    ...dashboardStatus.present,
    ...aiStatus.present
  ])

  const missing = unique([
    ...moduleStatus.missing,
    ...cardStatus.missing,
    ...serviceStatus.missing,
    ...dashboardStatus.missing,
    ...aiStatus.missing
  ])

  const total = present.length + missing.length
  const coverage = percent(present.length, total)

  return {
    key: system.key,
    title: system.title,
    circle: system.circle,
    complete: missing.length === 0,
    present,
    missing,
    coverage
  }
}

function buildMissingPriorities(systems: PlatformStateSystemStatus[]) {
  const priorities: string[] = []

  const incomplete = systems
    .filter((system) => !system.complete)
    .sort((a, b) => a.coverage - b.coverage)

  for (const system of incomplete.slice(0, 5)) {
    if (system.missing.length > 0) {
      priorities.push(`${system.title}: ${system.missing[0]}`)
    }
  }

  return priorities
}

function buildPreview(
  map: PlatformMap,
  systems: PlatformStateSystemStatus[],
  missingPriorities: string[]
) {
  const strongest = [...systems].sort((a, b) => b.coverage - a.coverage).slice(0, 3)
  const weakest = [...systems].sort((a, b) => a.coverage - b.coverage).slice(0, 3)

  const lines: string[] = []

  lines.push("Platform State Summary")
  lines.push("")
  lines.push(`Modules: ${map.modules.length}`)
  lines.push(`Cards: ${map.cards.length}`)
  lines.push(`Services: ${map.services.length}`)
  lines.push(`Dashboards: ${map.dashboards.length}`)
  lines.push(`AI Files: ${map.aiFiles.length}`)
  lines.push("")

  lines.push("Strongest Systems:")
  for (const system of strongest) {
    lines.push(`- ${system.title} (${system.coverage}%)`)
  }

  lines.push("")
  lines.push("Weakest Systems:")
  for (const system of weakest) {
    lines.push(`- ${system.title} (${system.coverage}%)`)
  }

  lines.push("")
  lines.push("Top Missing Priorities:")
  if (missingPriorities.length === 0) {
    lines.push("- None")
  } else {
    for (const item of missingPriorities) {
      lines.push(`- ${item}`)
    }
  }

  return lines.join("\n")
}

export function buildPlatformState(): PlatformStateSummary {
  const map = buildPlatformMap()
  const definitions = buildSystemDefinitions()
  const lookups = toLookup(map)

  const systems = definitions.map((system) => evaluateSystem(system, lookups))
  const strongestSystems = [...systems].sort((a, b) => b.coverage - a.coverage).slice(0, 3)
  const weakestSystems = [...systems].sort((a, b) => a.coverage - b.coverage).slice(0, 3)
  const missingPriorities = buildMissingPriorities(systems)

  return {
    ok: true,
    generatedAt: nowIso(),
    counts: {
      modules: map.modules.length,
      cards: map.cards.length,
      services: map.services.length,
      dashboards: map.dashboards.length,
      aiFiles: map.aiFiles.length
    },
    systems,
    strongestSystems,
    weakestSystems,
    missingPriorities,
    preview: buildPreview(map, systems, missingPriorities)
  }
}
