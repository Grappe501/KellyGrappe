import type {
    AIActionDefinition,
    AIToolDefinition
  } from "@platform/ai/ai.registry"
  import { matchAICommand } from "@platform/ai/ai.command-router"
  import {
    Services,
    hasService,
    listServices
  } from "@platform/services/service.registry"
  
  export type AIExecutionContext = {
    payload?: unknown
    dryRun?: boolean
  }
  
  export type AIExecutionHandlerArgs = {
    prompt: string
    payload?: unknown
    match: {
      kind: "action" | "tool"
      definition: AIActionDefinition | AIToolDefinition
      score: number
    }
  }
  
  export type AIExecutionResult = {
    ok: boolean
    prompt: string
    kind?: "action" | "tool"
    matchedKey?: string
    moduleKey?: string
    serviceName?: string | null
    methodName?: string | null
    requiresApproval?: boolean
    mode: "handler" | "service" | "preview" | "none"
    preview: string
    data?: unknown
  }
  
  type AIExecutionHandler = (
    args: AIExecutionHandlerArgs
  ) => Promise<unknown> | unknown
  
  type ServiceMethodMap = Record<string, (...args: any[]) => unknown>
  
  const actionExecutors = new Map<string, AIExecutionHandler>()
  const toolExecutors = new Map<string, AIExecutionHandler>()
  
  export function registerAIActionExecutor(
    key: string,
    handler: AIExecutionHandler
  ) {
    actionExecutors.set(key, handler)
  }
  
  export function registerAIToolExecutor(
    key: string,
    handler: AIExecutionHandler
  ) {
    toolExecutors.set(key, handler)
  }
  
  function normalize(text: string) {
    return text.trim().toLowerCase()
  }
  
  function tokenize(text: string) {
    return normalize(text)
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
  }
  
  function inferServiceName(moduleKey?: string, prompt?: string) {
    const promptTerms = tokenize(prompt ?? "")
  
    const moduleCandidates = moduleKey
      ? [
          moduleKey,
          moduleKey.replace(/module$/i, ""),
          moduleKey.replace(/s$/i, ""),
          moduleKey === "liveContact" ? "contacts" : moduleKey,
          moduleKey === "eventRequests" ? "followups" : moduleKey
        ]
      : []
  
    for (const candidate of moduleCandidates) {
      if (candidate && hasService(candidate)) {
        return candidate
      }
    }
  
    const allServices = listServices()
  
    for (const serviceName of allServices) {
      if (promptTerms.includes(serviceName.toLowerCase())) {
        return serviceName
      }
    }
  
    return null
  }
  
  function inferMethodName(service: ServiceMethodMap, prompt: string) {
    const methods = Object.keys(service).filter(
      (key) => typeof service[key] === "function"
    )
  
    const promptTerms = tokenize(prompt)
  
    let bestMethod: string | null = null
    let bestScore = 0
  
    for (const method of methods) {
      const haystack = normalize(method)
      let score = 0
  
      for (const term of promptTerms) {
        if (haystack.includes(term)) {
          score += 1
        }
      }
  
      if (score > bestScore) {
        bestScore = score
        bestMethod = method
      }
    }
  
    return {
      methodName: bestMethod,
      methods
    }
  }
  
  async function runRegisteredHandler(
    prompt: string,
    payload: unknown,
    kind: "action" | "tool",
    definition: AIActionDefinition | AIToolDefinition,
    score: number
  ): Promise<AIExecutionResult | null> {
    const registry = kind === "action" ? actionExecutors : toolExecutors
  
    const handler = registry.get(definition.key)
  
    if (!handler) return null
  
    const data = await handler({
      prompt,
      payload,
      match: {
        kind,
        definition,
        score
      }
    })
  
    return {
      ok: true,
      prompt,
      kind,
      matchedKey: definition.key,
      moduleKey: definition.moduleKey,
      requiresApproval: definition.requiresApproval ?? false,
      mode: "handler",
      preview: [
        `Executed ${kind} handler`,
        `Key: ${definition.key}`,
        `Module: ${definition.moduleKey}`
      ].join("\n"),
      data
    }
  }
  
  async function runServiceMethod(
    prompt: string,
    payload: unknown,
    kind: "action" | "tool",
    definition: AIActionDefinition | AIToolDefinition,
    score: number,
    dryRun: boolean
  ): Promise<AIExecutionResult> {
    const serviceName = inferServiceName(definition.moduleKey, prompt)
  
    if (!serviceName) {
      return {
        ok: false,
        prompt,
        kind,
        matchedKey: definition.key,
        moduleKey: definition.moduleKey,
        requiresApproval: definition.requiresApproval ?? false,
        serviceName: null,
        methodName: null,
        mode: "preview",
        preview: [
          `Matched ${kind}: ${definition.title}`,
          `Key: ${definition.key}`,
          `Module: ${definition.moduleKey}`,
          "No candidate service could be inferred."
        ].join("\n")
      }
    }
  
    const rawService = Services[serviceName]
  
    if (!rawService) {
      return {
        ok: false,
        prompt,
        kind,
        matchedKey: definition.key,
        moduleKey: definition.moduleKey,
        requiresApproval: definition.requiresApproval ?? false,
        serviceName,
        methodName: null,
        mode: "preview",
        preview: [
          `Matched ${kind}: ${definition.title}`,
          `Candidate Service: ${serviceName}`,
          "Service was inferred but is not registered."
        ].join("\n")
      }
    }
  
    const service = rawService as ServiceMethodMap
    const { methodName, methods } = inferMethodName(service, prompt)
  
    if (!methodName) {
      return {
        ok: false,
        prompt,
        kind,
        matchedKey: definition.key,
        moduleKey: definition.moduleKey,
        requiresApproval: definition.requiresApproval ?? false,
        serviceName,
        methodName: null,
        mode: "preview",
        preview: [
          `Matched ${kind}: ${definition.title}`,
          `Candidate Service: ${serviceName}`,
          "No service method matched this prompt.",
          methods.length
            ? `Available Methods: ${methods.join(", ")}`
            : "Available Methods: none"
        ].join("\n")
      }
    }
  
    const method = service[methodName]
  
    if (typeof method !== "function") {
      return {
        ok: false,
        prompt,
        kind,
        matchedKey: definition.key,
        moduleKey: definition.moduleKey,
        requiresApproval: definition.requiresApproval ?? false,
        serviceName,
        methodName,
        mode: "preview",
        preview: `Matched method "${methodName}" is not callable.`
      }
    }
  
    if (dryRun) {
      return {
        ok: true,
        prompt,
        kind,
        matchedKey: definition.key,
        moduleKey: definition.moduleKey,
        requiresApproval: definition.requiresApproval ?? false,
        serviceName,
        methodName,
        mode: "preview",
        preview: [
          "Dry run",
          `Matched ${kind}: ${definition.title}`,
          `Service: ${serviceName}`,
          `Method: ${methodName}`
        ].join("\n")
      }
    }
  
    let data: unknown
  
    if (method.length === 0) {
      data = await method()
    } else if (payload !== undefined) {
      data = await method(payload)
    } else {
      return {
        ok: false,
        prompt,
        kind,
        matchedKey: definition.key,
        moduleKey: definition.moduleKey,
        requiresApproval: definition.requiresApproval ?? false,
        serviceName,
        methodName,
        mode: "preview",
        preview: [
          `Matched ${kind}: ${definition.title}`,
          `Service: ${serviceName}`,
          `Method: ${methodName}`,
          "This method appears to require input payload."
        ].join("\n")
      }
    }
  
    return {
      ok: true,
      prompt,
      kind,
      matchedKey: definition.key,
      moduleKey: definition.moduleKey,
      requiresApproval: definition.requiresApproval ?? false,
      serviceName,
      methodName,
      mode: "service",
      preview: [
        `Executed ${kind}`,
        `Key: ${definition.key}`,
        `Service: ${serviceName}`,
        `Method: ${methodName}`
      ].join("\n"),
      data
    }
  }
  
  export async function executeAICommand(
    prompt: string,
    context: AIExecutionContext = {}
  ): Promise<AIExecutionResult> {
    const cleanPrompt = prompt.trim()
  
    if (!cleanPrompt) {
      return {
        ok: false,
        prompt,
        mode: "none",
        preview: "No command provided."
      }
    }
  
    const match = matchAICommand(cleanPrompt)
  
    if (!match) {
      return {
        ok: false,
        prompt,
        mode: "none",
        preview: "No registered AI tool or action matched this command."
      }
    }
  
    const definition = match.kind === "tool" ? match.tool : match.action
  
    if (!definition) {
      return {
        ok: false,
        prompt,
        mode: "none",
        preview: "Matched an invalid AI definition."
      }
    }
  
    const handled = await runRegisteredHandler(
      cleanPrompt,
      context.payload,
      match.kind,
      definition,
      match.score
    )
  
    if (handled) {
      return handled
    }
  
    return runServiceMethod(
      cleanPrompt,
      context.payload,
      match.kind,
      definition,
      match.score,
      context.dryRun ?? false
    )
  }
  
  export function resetAIExecutors() {
    actionExecutors.clear()
    toolExecutors.clear()
  }
  