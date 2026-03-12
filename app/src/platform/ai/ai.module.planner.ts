export type PlannedGeneratorCommand = {
    type: "module" | "card" | "service" | "ai" | "dashboard"
    name: string
    arg?: string
    circle?: string
  }
  
  export type SystemPlan = {
    ok: boolean
    title: string
    summary: string
    circles: string[]
    commands: PlannedGeneratorCommand[]
  }
  
  /* ------------------------------------------------
  UTILITIES
  ------------------------------------------------ */
  
  function normalize(text: string) {
    return text.trim().toLowerCase()
  }
  
  function includesAny(text: string, words: string[]) {
    return words.some((w) => text.includes(w))
  }
  
  function uniqueCommands(commands: PlannedGeneratorCommand[]) {
    const seen = new Set<string>()
    const result: PlannedGeneratorCommand[] = []
  
    for (const command of commands) {
      const key = `${command.type}::${command.name}::${command.arg ?? ""}`
  
      if (!seen.has(key)) {
        seen.add(key)
        result.push(command)
      }
    }
  
    return result
  }
  
  /*
  Sort commands so generation happens in correct order
  modules → services → cards → dashboards → ai
  */
  
  function sortCommands(commands: PlannedGeneratorCommand[]) {
    const order = ["module", "service", "card", "dashboard", "ai"]
  
    return [...commands].sort(
      (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
    )
  }
  
  /*
  Extract circle list
  */
  
  function extractCircles(commands: PlannedGeneratorCommand[]): string[] {
    return Array.from(
      new Set(commands.map((c) => c.circle).filter(Boolean))
    ) as string[]
  }
  
  /* ------------------------------------------------
  SYSTEM BUILDERS
  ------------------------------------------------ */
  
  function buildVolunteerSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "volunteer-recruitment", circle: "people" },
      { type: "module", name: "volunteer-onboarding", circle: "training" },
      { type: "service", name: "volunteer-outreach", circle: "communication" },
      { type: "card", name: "volunteer-leaderboard", arg: "metrics", circle: "intelligence" },
      { type: "card", name: "volunteer-funnel", arg: "metrics", circle: "intelligence" },
      { type: "dashboard", name: "volunteer-command", circle: "operations" },
      { type: "ai", name: "volunteer-intelligence", arg: "volunteer", circle: "ai" }
    ]
  }
  
  function buildDonorSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "donor-management", circle: "finance" },
      { type: "module", name: "fundraising-pipeline", circle: "finance" },
      { type: "service", name: "donor-sync", circle: "finance" },
      { type: "card", name: "donor-leaderboard", arg: "metrics", circle: "intelligence" },
      { type: "card", name: "fundraising-velocity", arg: "metrics", circle: "intelligence" },
      { type: "dashboard", name: "fundraising-command", circle: "finance" },
      { type: "ai", name: "donor-insights", arg: "donors", circle: "ai" }
    ]
  }
  
  function buildFieldSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "field-operations", circle: "field" },
      { type: "module", name: "canvassing", circle: "field" },
      { type: "service", name: "canvassing-sync", circle: "field" },
      { type: "card", name: "canvass-progress", arg: "metrics", circle: "intelligence" },
      { type: "card", name: "field-coverage", arg: "metrics", circle: "intelligence" },
      { type: "dashboard", name: "field-command", circle: "field" },
      { type: "ai", name: "field-intelligence", arg: "field", circle: "ai" }
    ]
  }
  
  function buildMessagingSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "messaging-center", circle: "communication" },
      { type: "module", name: "outreach-automation", circle: "communication" },
      { type: "service", name: "sms", circle: "communication" },
      { type: "service", name: "email", circle: "communication" },
      { type: "card", name: "message-activity", arg: "metrics", circle: "intelligence" },
      { type: "card", name: "outreach-queue", arg: "command", circle: "operations" },
      { type: "dashboard", name: "messaging-command", circle: "communication" },
      { type: "ai", name: "messaging-assistant", arg: "messaging", circle: "ai" }
    ]
  }
  
  function buildEventSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "event-operations", circle: "operations" },
      { type: "module", name: "event-requests", circle: "operations" },
      { type: "service", name: "event-sync", circle: "operations" },
      { type: "card", name: "event-pipeline", arg: "metrics", circle: "intelligence" },
      { type: "card", name: "event-readiness", arg: "command", circle: "operations" },
      { type: "dashboard", name: "event-command", circle: "operations" },
      { type: "ai", name: "event-intelligence", arg: "events", circle: "ai" }
    ]
  }
  
  function buildTrainingSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "training-programs", circle: "training" },
      { type: "module", name: "training-tracks", circle: "training" },
      { type: "module", name: "training-modules", circle: "training" },
      { type: "module", name: "training-lessons", circle: "training" },
      { type: "service", name: "training-sync", circle: "training" },
      { type: "card", name: "training-progress", arg: "metrics", circle: "training" },
      { type: "card", name: "training-dropoff", arg: "metrics", circle: "intelligence" },
      { type: "dashboard", name: "training-command", circle: "training" },
      { type: "ai", name: "training-architect", arg: "training", circle: "ai" }
    ]
  }
  
  function buildAnalyticsSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "analytics-hub", circle: "intelligence" },
      { type: "service", name: "analytics-sync", circle: "intelligence" },
      { type: "card", name: "performance-summary", arg: "metrics", circle: "intelligence" },
      { type: "card", name: "trend-monitor", arg: "metrics", circle: "intelligence" },
      { type: "dashboard", name: "analytics-command", circle: "intelligence" },
      { type: "ai", name: "analytics-assistant", arg: "analytics", circle: "ai" }
    ]
  }
  
  /*
  Spreadsheet + counter-intelligence infrastructure stub
  */
  
  function buildDataInfrastructure(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "spreadsheet-ingestion", circle: "intelligence" },
      { type: "module", name: "data-schema-mapper", circle: "intelligence" },
      { type: "module", name: "data-normalization", circle: "intelligence" },
      { type: "module", name: "county-operations", circle: "operations" },
      { type: "module", name: "counter-intelligence", circle: "ai" },
      { type: "card", name: "data-quality", arg: "metrics", circle: "intelligence" },
      { type: "card", name: "security-alerts", arg: "command", circle: "ai" },
      { type: "dashboard", name: "data-command", circle: "intelligence" },
      { type: "ai", name: "data-architect", arg: "data", circle: "ai" }
    ]
  }
  
  /* ------------------------------------------------
  INFRASTRUCTURE SYSTEMS
  ------------------------------------------------ */
  
  function buildCampaignInfrastructure(): PlannedGeneratorCommand[] {
    return [
      ...buildVolunteerSystem(),
      ...buildDonorSystem(),
      ...buildFieldSystem(),
      ...buildMessagingSystem(),
      ...buildEventSystem(),
      ...buildTrainingSystem(),
      ...buildAnalyticsSystem(),
      ...buildDataInfrastructure(),
      { type: "dashboard", name: "campaign-war-room", circle: "operations" },
      { type: "ai", name: "campaign-architect", arg: "campaign", circle: "ai" }
    ]
  }
  
  /* ------------------------------------------------
  PLAN DESCRIPTION
  ------------------------------------------------ */
  
  function describePlan(title: string, commands: PlannedGeneratorCommand[]): SystemPlan {
  
    const deduped = uniqueCommands(commands)
    const sorted = sortCommands(deduped)
    const circles = extractCircles(sorted)
  
    return {
      ok: true,
      title,
      summary: `${title} plan created with ${sorted.length} generator commands.`,
      circles,
      commands: sorted
    }
  }
  
  /* ------------------------------------------------
  PLANNER
  ------------------------------------------------ */
  
  export function planSystem(prompt: string): SystemPlan | null {
  
    const text = normalize(prompt)
  
    if (
      includesAny(text, [
        "full campaign infrastructure",
        "campaign operating system",
        "campaign infrastructure",
        "build a campaign system"
      ])
    ) {
      return describePlan("Campaign Infrastructure", buildCampaignInfrastructure())
    }
  
    if (includesAny(text, ["volunteer system", "volunteer recruitment"])) {
      return describePlan("Volunteer System", buildVolunteerSystem())
    }
  
    if (includesAny(text, ["donor system", "fundraising system"])) {
      return describePlan("Donor System", buildDonorSystem())
    }
  
    if (includesAny(text, ["field organizing", "canvassing system", "field system"])) {
      return describePlan("Field System", buildFieldSystem())
    }
  
    if (includesAny(text, ["messaging system", "sms system", "text messaging"])) {
      return describePlan("Messaging System", buildMessagingSystem())
    }
  
    if (includesAny(text, ["event system", "event operations"])) {
      return describePlan("Event System", buildEventSystem())
    }
  
    if (includesAny(text, ["training system", "learning system"])) {
      return describePlan("Training System", buildTrainingSystem())
    }
  
    if (includesAny(text, ["analytics system", "analytics infrastructure"])) {
      return describePlan("Analytics System", buildAnalyticsSystem())
    }
  
    if (includesAny(text, ["spreadsheet system", "data infrastructure"])) {
      return describePlan("Data Infrastructure", buildDataInfrastructure())
    }
  
    return null
  }
  