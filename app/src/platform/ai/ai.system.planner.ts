export type PlannedGeneratorCommand = {
    type: "module" | "card" | "service" | "ai" | "dashboard"
    name: string
    arg?: string
  }
  
  export type SystemPlan = {
    ok: boolean
    title: string
    summary: string
    commands: PlannedGeneratorCommand[]
  }
  
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
  
  function buildVolunteerSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "volunteer-recruitment" },
      { type: "module", name: "volunteer-onboarding" },
      { type: "service", name: "volunteer-outreach" },
      { type: "card", name: "volunteer-leaderboard", arg: "metrics" },
      { type: "card", name: "volunteer-funnel", arg: "metrics" },
      { type: "dashboard", name: "volunteer-command" },
      { type: "ai", name: "volunteer-intelligence", arg: "volunteer" }
    ]
  }
  
  function buildDonorSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "donor-management" },
      { type: "module", name: "fundraising-pipeline" },
      { type: "service", name: "donor-sync" },
      { type: "card", name: "donor-leaderboard", arg: "metrics" },
      { type: "card", name: "fundraising-velocity", arg: "metrics" },
      { type: "dashboard", name: "fundraising-command" },
      { type: "ai", name: "donor-insights", arg: "donors" }
    ]
  }
  
  function buildFieldSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "field-operations" },
      { type: "module", name: "canvassing" },
      { type: "service", name: "canvassing-sync" },
      { type: "card", name: "canvass-progress", arg: "metrics" },
      { type: "card", name: "field-coverage", arg: "metrics" },
      { type: "dashboard", name: "field-command" },
      { type: "ai", name: "field-intelligence", arg: "field" }
    ]
  }
  
  function buildMessagingSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "messaging-center" },
      { type: "module", name: "outreach-automation" },
      { type: "service", name: "sms" },
      { type: "service", name: "email" },
      { type: "card", name: "message-activity", arg: "metrics" },
      { type: "card", name: "outreach-queue", arg: "command" },
      { type: "dashboard", name: "messaging-command" },
      { type: "ai", name: "messaging-assistant", arg: "messaging" }
    ]
  }
  
  function buildEventSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "event-operations" },
      { type: "module", name: "event-requests" },
      { type: "service", name: "event-sync" },
      { type: "card", name: "event-pipeline", arg: "metrics" },
      { type: "card", name: "event-readiness", arg: "command" },
      { type: "dashboard", name: "event-command" },
      { type: "ai", name: "event-intelligence", arg: "events" }
    ]
  }
  
  function buildCoalitionSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "coalition-management" },
      { type: "module", name: "partner-onboarding" },
      { type: "service", name: "coalition-sync" },
      { type: "card", name: "partner-network", arg: "metrics" },
      { type: "card", name: "coalition-activity", arg: "metrics" },
      { type: "dashboard", name: "coalition-command" },
      { type: "ai", name: "coalition-intelligence", arg: "coalition" }
    ]
  }
  
  function buildVoterSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "voter-targeting" },
      { type: "module", name: "turnout-operations" },
      { type: "service", name: "voter-sync" },
      { type: "card", name: "turnout-goal", arg: "metrics" },
      { type: "card", name: "target-universe", arg: "metrics" },
      { type: "dashboard", name: "turnout-command" },
      { type: "ai", name: "voter-intelligence", arg: "voters" }
    ]
  }
  
  function buildAnalyticsSystem(): PlannedGeneratorCommand[] {
    return [
      { type: "module", name: "analytics-hub" },
      { type: "service", name: "analytics-sync" },
      { type: "card", name: "performance-summary", arg: "metrics" },
      { type: "card", name: "trend-monitor", arg: "metrics" },
      { type: "dashboard", name: "analytics-command" },
      { type: "ai", name: "analytics-assistant", arg: "analytics" }
    ]
  }
  
  function buildCampaignInfrastructure(): PlannedGeneratorCommand[] {
    return [
      ...buildVolunteerSystem(),
      ...buildDonorSystem(),
      ...buildFieldSystem(),
      ...buildMessagingSystem(),
      ...buildEventSystem(),
      ...buildCoalitionSystem(),
      ...buildVoterSystem(),
      ...buildAnalyticsSystem(),
      { type: "dashboard", name: "campaign-war-room" },
      { type: "ai", name: "campaign-architect", arg: "campaign" }
    ]
  }
  
  function buildNonprofitInfrastructure(): PlannedGeneratorCommand[] {
    return [
      ...buildVolunteerSystem(),
      ...buildMessagingSystem(),
      ...buildEventSystem(),
      ...buildCoalitionSystem(),
      ...buildAnalyticsSystem(),
      { type: "module", name: "program-operations" },
      { type: "service", name: "program-sync" },
      { type: "card", name: "program-health", arg: "metrics" },
      { type: "dashboard", name: "nonprofit-command" },
      { type: "ai", name: "nonprofit-architect", arg: "nonprofit" }
    ]
  }
  
  function buildChurchInfrastructure(): PlannedGeneratorCommand[] {
    return [
      ...buildVolunteerSystem(),
      ...buildMessagingSystem(),
      ...buildEventSystem(),
      { type: "module", name: "care-team" },
      { type: "module", name: "ministry-operations" },
      { type: "service", name: "care-sync" },
      { type: "card", name: "care-queue", arg: "command" },
      { type: "card", name: "ministry-health", arg: "metrics" },
      { type: "dashboard", name: "church-command" },
      { type: "ai", name: "church-architect", arg: "church" }
    ]
  }
  
  function buildStudentInfrastructure(): PlannedGeneratorCommand[] {
    return [
      ...buildVolunteerSystem(),
      ...buildMessagingSystem(),
      ...buildEventSystem(),
      { type: "module", name: "campus-organizing" },
      { type: "module", name: "chapter-operations" },
      { type: "service", name: "chapter-sync" },
      { type: "card", name: "chapter-growth", arg: "metrics" },
      { type: "card", name: "campus-activity", arg: "metrics" },
      { type: "dashboard", name: "student-command" },
      { type: "ai", name: "student-architect", arg: "student" }
    ]
  }
  
  function buildBallotInitiativeInfrastructure(): PlannedGeneratorCommand[] {
    return [
      ...buildVolunteerSystem(),
      ...buildFieldSystem(),
      ...buildMessagingSystem(),
      ...buildVoterSystem(),
      { type: "module", name: "petition-operations" },
      { type: "service", name: "petition-sync" },
      { type: "card", name: "signature-progress", arg: "metrics" },
      { type: "card", name: "petition-coverage", arg: "metrics" },
      { type: "dashboard", name: "initiative-command" },
      { type: "ai", name: "initiative-architect", arg: "initiative" }
    ]
  }
  
  function describePlan(title: string, commands: PlannedGeneratorCommand[]): SystemPlan {
    const deduped = uniqueCommands(commands)
  
    return {
      ok: true,
      title,
      summary: `${title} plan created with ${deduped.length} generator commands.`,
      commands: deduped
    }
  }
  
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
  
    if (
      includesAny(text, [
        "nonprofit infrastructure",
        "nonprofit organizing system",
        "build a nonprofit system"
      ])
    ) {
      return describePlan("Nonprofit Infrastructure", buildNonprofitInfrastructure())
    }
  
    if (
      includesAny(text, [
        "church infrastructure",
        "church outreach platform",
        "build a church system"
      ])
    ) {
      return describePlan("Church Infrastructure", buildChurchInfrastructure())
    }
  
    if (
      includesAny(text, [
        "student organizing system",
        "student infrastructure",
        "build a student system"
      ])
    ) {
      return describePlan("Student Infrastructure", buildStudentInfrastructure())
    }
  
    if (
      includesAny(text, [
        "ballot initiative operation",
        "ballot initiative system",
        "initiative infrastructure"
      ])
    ) {
      return describePlan(
        "Ballot Initiative Infrastructure",
        buildBallotInitiativeInfrastructure()
      )
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
  
    if (includesAny(text, ["text messaging system", "sms system", "messaging system"])) {
      return describePlan("Messaging System", buildMessagingSystem())
    }
  
    if (includesAny(text, ["event system", "event operations", "event infrastructure"])) {
      return describePlan("Event System", buildEventSystem())
    }
  
    if (includesAny(text, ["coalition system", "partner network", "coalition infrastructure"])) {
      return describePlan("Coalition System", buildCoalitionSystem())
    }
  
    if (includesAny(text, ["voter system", "turnout system", "voter targeting"])) {
      return describePlan("Voter System", buildVoterSystem())
    }
  
    if (includesAny(text, ["analytics system", "analytics infrastructure"])) {
      return describePlan("Analytics System", buildAnalyticsSystem())
    }
  
    return null
  }
  