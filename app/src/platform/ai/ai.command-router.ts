import {
    AIRegistry,
    type AIActionDefinition,
    type AIToolDefinition
  } from "@platform/ai/ai.registry"
  
  import { Services, hasService } from "@platform/services/service.registry"
  
  import { runPlatformGenerator } from "./ai.generator.executor"
  import { runSystemArchitect } from "./ai.system.architect"
  import { runSystemExecutor } from "./ai.system.executor"
  import { buildPlatformSummary } from "./ai.platform.summary"
  import { buildPlatformMapSummary } from "./ai.platform.map.summary"
  import { buildPlatformState } from "./ai.platform.state"
  
  /* ------------------------------------------------
  TYPES
  ------------------------------------------------ */
  
  export type AICommandMatch = {
    kind: "action" | "tool"
    score: number
    action?: AIActionDefinition
    tool?: AIToolDefinition
  }
  
  export type AICommandPreviewResult = {
    ok: boolean
    prompt: string
    kind?: "action" | "tool" | "generator" | "system"
    matchedKey?: string
    moduleKey?: string
    requiresApproval?: boolean
    score?: number
    preview: string
    data?: unknown
  }
  
  /* ------------------------------------------------
  UTILS
  ------------------------------------------------ */
  
  function normalize(text: string) {
    return text.trim().toLowerCase()
  }
  
  function tokenize(text: string) {
    return normalize(text)
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
  }
  
  function scoreText(prompt: string, values: Array<string | undefined>) {
    const promptTerms = tokenize(prompt)
    const haystack = values.filter(Boolean).join(" ").toLowerCase()
  
    let score = 0
  
    for (const term of promptTerms) {
      if (haystack.includes(term)) {
        score += 1
      }
    }
  
    return score
  }
  
  function isPlatformStateCommand(prompt: string) {
    return [
      "state platform",
      "platform state",
      "what is missing",
      "platform health",
      "system health",
      "what should we build next"
    ].includes(prompt)
  }
  
  /* ------------------------------------------------
  GENERATOR COMMAND PARSER
  ------------------------------------------------ */
  
  function parseGeneratorCommand(prompt: string) {
    const clean = prompt.trim()
  
    const match = clean.match(
      /^create\s+(module|card|service|ai|dashboard)\s+([a-zA-Z0-9\-_]+)(?:\s+([a-zA-Z0-9\-_]+))?$/i
    )
  
    if (!match) return null
  
    return {
      type: (match?.[1] ?? "").toLowerCase() as
        | "module"
        | "card"
        | "service"
        | "ai"
        | "dashboard",
      name: match?.[2] ?? "",
      arg: match?.[3]
    }
  }
  
  /* ------------------------------------------------
  REGISTRY MATCHING
  ------------------------------------------------ */
  
  export function matchAICommand(prompt: string): AICommandMatch | null {
    const tools = AIRegistry.getAllTools()
    const actions = AIRegistry.getAllActions()
  
    const candidates: AICommandMatch[] = [
      ...tools.map((tool) => ({
        kind: "tool" as const,
        tool,
        score: scoreText(prompt, [
          tool.key,
          tool.moduleKey,
          tool.title,
          tool.description,
          ...(tool.keywords ?? [])
        ])
      })),
      ...actions.map((action) => ({
        kind: "action" as const,
        action,
        score: scoreText(prompt, [
          action.key,
          action.moduleKey,
          action.title,
          action.description,
          ...(action.keywords ?? [])
        ])
      }))
    ].filter((candidate) => candidate.score > 0)
  
    if (!candidates.length) return null
  
    candidates.sort((a, b) => b.score - a.score)
  
    return candidates[0] ?? null
  }
  
  /* ------------------------------------------------
  SERVICE DISCOVERY
  ------------------------------------------------ */
  
  function inferServiceName(moduleKey?: string) {
    if (!moduleKey) return null
  
    const candidates = [
      moduleKey,
      moduleKey.replace(/module$/i, ""),
      moduleKey.replace(/s$/i, ""),
      moduleKey === "liveContact" ? "contacts" : moduleKey,
      moduleKey === "eventRequests" ? "followups" : moduleKey
    ]
  
    for (const candidate of candidates) {
      if (candidate && hasService(candidate)) {
        return candidate
      }
    }
  
    return null
  }
  
  async function tryServicePreview(moduleKey?: string) {
    const serviceName = inferServiceName(moduleKey)
  
    if (!serviceName) {
      return {
        serviceName: null,
        methods: []
      }
    }
  
    const service = Services[serviceName]
  
    if (!service) {
      return {
        serviceName,
        methods: []
      }
    }
  
    const methods = Object.keys(service).filter(
      (key) => typeof (service as Record<string, unknown>)[key] === "function"
    )
  
    return {
      serviceName,
      methods
    }
  }
  
  /* ------------------------------------------------
  AI COMMAND ROUTER
  ------------------------------------------------ */
  
  export async function routeAICommand(
    prompt: string
  ): Promise<AICommandPreviewResult> {
    const cleanPrompt = normalize(prompt)
  
    if (!cleanPrompt) {
      return {
        ok: false,
        prompt,
        preview: "No command provided."
      }
    }
  
    /* ------------------------------------------------
    PLATFORM SCANNER
    ------------------------------------------------ */
  
    if (cleanPrompt === "scan platform") {
      const summary = buildPlatformSummary()
  
      return {
        ok: true,
        prompt,
        kind: "tool",
        preview: summary,
        data: {
          scanner: true
        }
      }
    }
  
    if (cleanPrompt === "map platform" || cleanPrompt === "scan architecture") {
      const summary = buildPlatformMapSummary()
  
      return {
        ok: true,
        prompt,
        kind: "tool",
        preview: summary,
        data: {
          scanner: true,
          architectureMap: true
        }
      }
    }
  
    if (isPlatformStateCommand(cleanPrompt)) {
      const state = buildPlatformState()
  
      return {
        ok: state.ok,
        prompt,
        kind: "tool",
        preview: state.preview,
        data: state
      }
    }
  
    /* ------------------------------------------------
    SYSTEM EXECUTOR
    ------------------------------------------------ */
  
    const systemExecution = await runSystemExecutor(prompt)
  
    if (systemExecution) {
      return {
        ok: systemExecution.ok,
        prompt,
        kind: "system",
        preview: systemExecution.preview,
        data: systemExecution
      }
    }
  
    /* ------------------------------------------------
    SYSTEM ARCHITECT
    ------------------------------------------------ */
  
    const architect = await runSystemArchitect(cleanPrompt)
  
    if (architect) {
      return {
        ok: architect.ok,
        prompt,
        kind: "generator",
        preview: architect.output,
        data: {
          architect: true
        }
      }
    }
  
    /* ------------------------------------------------
    GENERATOR COMMANDS
    ------------------------------------------------ */
  
    const generatorCommand = parseGeneratorCommand(cleanPrompt)
  
    if (generatorCommand) {
      const result = await runPlatformGenerator(
        generatorCommand.type,
        generatorCommand.name,
        generatorCommand.arg
      )
  
      return {
        ok: result.ok,
        prompt,
        kind: "generator",
        matchedKey: `${generatorCommand.type}:${generatorCommand.name}`,
        preview: result.output,
        data: {
          generatorType: generatorCommand.type,
          name: generatorCommand.name,
          arg: generatorCommand.arg
        }
      }
    }
  
    /* ------------------------------------------------
    REGISTRY MATCHING
    ------------------------------------------------ */
  
    const match = matchAICommand(cleanPrompt)
  
    if (!match) {
      return {
        ok: false,
        prompt,
        preview: "No registered AI tool or action matched this command."
      }
    }
  
    const definition = match.kind === "tool" ? match.tool : match.action
  
    if (!definition) {
      return {
        ok: false,
        prompt,
        preview: "Matched an invalid AI definition."
      }
    }
  
    const servicePreview = await tryServicePreview(definition.moduleKey)
  
    return {
      ok: true,
      prompt,
      kind: match.kind,
      matchedKey: definition.key,
      moduleKey: definition.moduleKey,
      requiresApproval: definition.requiresApproval ?? false,
      score: match.score,
      preview: [
        `Matched ${match.kind}: ${definition.title}`,
        `Key: ${definition.key}`,
        `Module: ${definition.moduleKey}`,
        `Action Type: ${definition.actionType}`,
        `Requires Approval: ${definition.requiresApproval ? "yes" : "no"}`,
        servicePreview.serviceName
          ? `Candidate Service: ${servicePreview.serviceName}`
          : "Candidate Service: none",
        servicePreview.methods.length
          ? `Available Methods: ${servicePreview.methods.join(", ")}`
          : "Available Methods: none"
      ].join("\n"),
      data: {
        match,
        servicePreview
      }
    }
  }
  