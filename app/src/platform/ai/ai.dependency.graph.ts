import type {
    PlannedGeneratorCommand,
    SystemPlan
  } from "./ai.module.planner"
  
  export type DependencyRule = {
    when: {
      type?: PlannedGeneratorCommand["type"]
      name: string
    }
    requires: PlannedGeneratorCommand[]
  }
  
  function commandKey(command: PlannedGeneratorCommand) {
    return `${command.type}::${command.name}::${command.arg ?? ""}`
  }
  
  function uniqueCommands(commands: PlannedGeneratorCommand[]) {
    const seen = new Set<string>()
    const result: PlannedGeneratorCommand[] = []
  
    for (const command of commands) {
      const key = commandKey(command)
  
      if (!seen.has(key)) {
        seen.add(key)
        result.push(command)
      }
    }
  
    return result
  }
  
  function sortCommands(commands: PlannedGeneratorCommand[]) {
    const order: PlannedGeneratorCommand["type"][] = [
      "module",
      "service",
      "card",
      "dashboard",
      "ai"
    ]
  
    return [...commands].sort(
      (a, b) => order.indexOf(a.type) - order.indexOf(b.type)
    )
  }
  
  function buildDependencyRules(): DependencyRule[] {
    return [
      {
        when: { type: "module", name: "training-programs" },
        requires: [
          { type: "module", name: "analytics-hub", circle: "intelligence" },
          { type: "module", name: "spreadsheet-ingestion", circle: "intelligence" },
          { type: "service", name: "training-sync", circle: "training" }
        ]
      },
      {
        when: { type: "module", name: "training-tracks" },
        requires: [
          { type: "module", name: "analytics-hub", circle: "intelligence" }
        ]
      },
      {
        when: { type: "module", name: "training-modules" },
        requires: [
          { type: "module", name: "spreadsheet-ingestion", circle: "intelligence" }
        ]
      },
      {
        when: { type: "module", name: "field-operations" },
        requires: [
          { type: "module", name: "analytics-hub", circle: "intelligence" },
          { type: "service", name: "canvassing-sync", circle: "field" }
        ]
      },
      {
        when: { type: "module", name: "volunteer-recruitment" },
        requires: [
          { type: "module", name: "messaging-center", circle: "communication" },
          { type: "module", name: "analytics-hub", circle: "intelligence" },
          { type: "service", name: "volunteer-outreach", circle: "communication" }
        ]
      },
      {
        when: { type: "module", name: "donor-management" },
        requires: [
          { type: "module", name: "analytics-hub", circle: "intelligence" },
          { type: "service", name: "donor-sync", circle: "finance" }
        ]
      },
      {
        when: { type: "module", name: "messaging-center" },
        requires: [
          { type: "service", name: "sms", circle: "communication" },
          { type: "service", name: "email", circle: "communication" }
        ]
      },
      {
        when: { type: "module", name: "event-operations" },
        requires: [
          { type: "module", name: "analytics-hub", circle: "intelligence" },
          { type: "service", name: "event-sync", circle: "operations" }
        ]
      },
      {
        when: { type: "module", name: "spreadsheet-ingestion" },
        requires: [
          { type: "module", name: "data-schema-mapper", circle: "intelligence" },
          { type: "module", name: "data-normalization", circle: "intelligence" }
        ]
      },
      {
        when: { type: "module", name: "county-operations" },
        requires: [
          { type: "module", name: "spreadsheet-ingestion", circle: "intelligence" },
          { type: "module", name: "counter-intelligence", circle: "ai" }
        ]
      },
      {
        when: { type: "dashboard", name: "campaign-war-room" },
        requires: [
          { type: "dashboard", name: "analytics-command", circle: "intelligence" },
          { type: "dashboard", name: "messaging-command", circle: "communication" },
          { type: "dashboard", name: "training-command", circle: "training" }
        ]
      }
    ]
  }
  
  function matchesRule(
    command: PlannedGeneratorCommand,
    rule: DependencyRule
  ) {
    if (rule.when.type && command.type !== rule.when.type) {
      return false
    }
  
    return command.name === rule.when.name
  }
  
  function collectDependencies(
    commands: PlannedGeneratorCommand[],
    rules: DependencyRule[]
  ) {
    const result: PlannedGeneratorCommand[] = [...commands]
    const seen = new Set(result.map(commandKey))
  
    let changed = true
  
    while (changed) {
      changed = false
  
      for (const command of [...result]) {
        for (const rule of rules) {
          if (!matchesRule(command, rule)) continue
  
          for (const dependency of rule.requires) {
            const key = commandKey(dependency)
  
            if (!seen.has(key)) {
              seen.add(key)
              result.push(dependency)
              changed = true
            }
          }
        }
      }
    }
  
    return result
  }
  
  function extractCircles(commands: PlannedGeneratorCommand[]) {
    return Array.from(
      new Set(commands.map((command) => command.circle).filter(Boolean))
    ) as string[]
  }
  
  export function expandPlanWithDependencies(plan: SystemPlan): SystemPlan {
    const rules = buildDependencyRules()
    const expanded = collectDependencies(plan.commands, rules)
    const deduped = uniqueCommands(expanded)
    const sorted = sortCommands(deduped)
    const circles = extractCircles(sorted)
  
    return {
      ...plan,
      summary: `${plan.title} plan expanded to ${sorted.length} generator commands after dependency resolution.`,
      circles,
      commands: sorted
    }
  }
  