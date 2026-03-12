import {
    planSystem,
    type PlannedGeneratorCommand,
    type SystemPlan
  } from "./ai.module.planner"
  import { runPlatformGenerator } from "./ai.generator.executor"
  import { expandPlanWithDependencies } from "./ai.dependency.graph"
  
  export type SystemExecutionMode = "plan" | "build"
  
  export type ExecutedGeneratorStep = {
    type: PlannedGeneratorCommand["type"]
    name: string
    arg?: string
    circle?: string
    ok: boolean
    output: string
  }
  
  export type SystemExecutionResult = {
    ok: boolean
    mode: SystemExecutionMode
    title: string
    summary: string
    circles: string[]
    totalSteps: number
    succeeded: number
    failed: number
    steps: ExecutedGeneratorStep[]
    preview: string
  }
  
  export type SystemExecutionOptions = {
    mode?: SystemExecutionMode
    stopOnError?: boolean
  }
  
  function normalize(text: string) {
    return text.trim().toLowerCase()
  }
  
  function parseExecutionMode(prompt: string): {
    mode: SystemExecutionMode
    text: string
  } {
    const text = normalize(prompt)
  
    if (text.startsWith("plan ")) {
      return {
        mode: "plan",
        text: text.replace(/^plan\s+/, "")
      }
    }
  
    if (text.startsWith("build ")) {
      return {
        mode: "build",
        text: text.replace(/^build\s+/, "")
      }
    }
  
    return {
      mode: "build",
      text
    }
  }
  
  function formatCommand(command: PlannedGeneratorCommand) {
    return `${command.type} ${command.name}${command.arg ? ` ${command.arg}` : ""}`
  }
  
  function buildPreview(plan: SystemPlan, mode: SystemExecutionMode) {
    const lines: string[] = []
  
    lines.push(`${mode === "plan" ? "Plan Preview" : "Execution Plan"}: ${plan.title}`)
    lines.push(plan.summary)
    lines.push("")
  
    if (plan.circles.length) {
      lines.push(`Circles: ${plan.circles.join(", ")}`)
      lines.push("")
    }
  
    lines.push("Commands:")
    lines.push("")
  
    for (const command of plan.commands) {
      lines.push(`- ${formatCommand(command)}${command.circle ? ` [${command.circle}]` : ""}`)
    }
  
    return lines.join("\n")
  }
  
  function buildExecutionPreview(
    plan: SystemPlan,
    mode: SystemExecutionMode,
    steps: ExecutedGeneratorStep[]
  ) {
    const lines: string[] = []
  
    const succeeded = steps.filter((step) => step.ok).length
    const failed = steps.filter((step) => !step.ok).length
  
    lines.push(`Execution Result: ${plan.title}`)
    lines.push(plan.summary)
    lines.push("")
  
    if (plan.circles.length) {
      lines.push(`Circles: ${plan.circles.join(", ")}`)
      lines.push("")
    }
  
    lines.push(`Mode: ${mode}`)
    lines.push(`Total Steps: ${steps.length}`)
    lines.push(`Succeeded: ${succeeded}`)
    lines.push(`Failed: ${failed}`)
    lines.push("")
  
    lines.push("Steps:")
    lines.push("")
  
    for (const step of steps) {
      lines.push(
        `- ${step.ok ? "OK" : "FAILED"}: ${step.type} ${step.name}${step.arg ? ` ${step.arg}` : ""}${step.circle ? ` [${step.circle}]` : ""}`
      )
  
      if (step.output?.trim()) {
        lines.push(`  ${step.output.trim()}`)
      }
    }
  
    return lines.join("\n")
  }
  
  async function executePlan(
    plan: SystemPlan,
    options: Required<SystemExecutionOptions>
  ): Promise<SystemExecutionResult> {
    const steps: ExecutedGeneratorStep[] = []
  
    for (const command of plan.commands) {
      const result = await runPlatformGenerator(
        command.type,
        command.name,
        command.arg
      )
  
      const executedStep: ExecutedGeneratorStep = {
        type: command.type,
        name: command.name,
        arg: command.arg,
        circle: command.circle,
        ok: result.ok,
        output: result.output
      }
  
      steps.push(executedStep)
  
      if (!result.ok && options.stopOnError) {
        break
      }
    }
  
    const succeeded = steps.filter((step) => step.ok).length
    const failed = steps.filter((step) => !step.ok).length
    const ok = failed === 0
  
    return {
      ok,
      mode: options.mode,
      title: plan.title,
      summary: plan.summary,
      circles: plan.circles,
      totalSteps: steps.length,
      succeeded,
      failed,
      steps,
      preview: buildExecutionPreview(plan, options.mode, steps)
    }
  }
  
  export async function runSystemExecutor(
    prompt: string,
    options: SystemExecutionOptions = {}
  ): Promise<SystemExecutionResult | null> {
    const parsed = parseExecutionMode(prompt)
  
    const mode = options.mode ?? parsed.mode
    const stopOnError = options.stopOnError ?? false
  
    const basePlan = planSystem(parsed.text)
  
    if (!basePlan) {
      return null
    }
  
    const expandedPlan = expandPlanWithDependencies(basePlan)
  
    if (mode === "plan") {
      return {
        ok: true,
        mode,
        title: expandedPlan.title,
        summary: expandedPlan.summary,
        circles: expandedPlan.circles,
        totalSteps: expandedPlan.commands.length,
        succeeded: 0,
        failed: 0,
        steps: [],
        preview: buildPreview(expandedPlan, mode)
      }
    }
  
    return executePlan(expandedPlan, {
      mode,
      stopOnError
    })
  }
  