import { buildPlatformMap } from "./ai.platform.map"
import { planSystem, type PlannedGeneratorCommand } from "./ai.module.planner"

export type DevOpsEngineerResult = {
  ok: boolean
  preview: string
  data?: unknown
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

function includesAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase))
}

/* ------------------------------------------------
ARCHITECTURE SUMMARY
------------------------------------------------ */

function summarizeArchitecture() {

  const map = buildPlatformMap()

  const lines: string[] = []

  lines.push("DevOps Architecture Summary")
  lines.push("")

  lines.push(`Modules: ${map.modules.length}`)
  lines.push(`Cards: ${map.cards.length}`)
  lines.push(`Services: ${map.services.length}`)
  lines.push(`Dashboards: ${map.dashboards.length}`)
  lines.push(`AI Files: ${map.aiFiles.length}`)

  lines.push("")

  const missing: string[] = []

  if (map.modules.length === 0) missing.push("No modules detected.")
  if (map.cards.length === 0) missing.push("No cards detected.")
  if (map.services.length === 0) missing.push("No services detected.")
  if (map.dashboards.length === 0) missing.push("No dashboard templates detected.")

  if (missing.length) {

    lines.push("Gaps:")
    for (const item of missing) {
      lines.push(`- ${item}`)
    }

  } else {

    lines.push("Core platform layers are present.")

  }

  return {
    preview: lines.join("\n"),
    data: {
      map,
      missing
    }
  }

}

/* ------------------------------------------------
NEXT BUILD RECOMMENDATIONS
------------------------------------------------ */

function recommendNextBuildSteps() {

  const map = buildPlatformMap()

  const steps: string[] = []

  steps.push("Recommended Next Build Steps")
  steps.push("")

  if (!map.modules.find((m) => m.name === "onboarding")) {
    steps.push("1. Add organization/campaign onboarding module.")
  } else {
    steps.push("1. Extend onboarding to capture doctrine, tone, goals, and approvals.")
  }

  if (!map.modules.find((m) => m.name.includes("training"))) {
    steps.push("2. Add training system template module.")
  } else {
    steps.push("2. Connect training templates to spreadsheet-backed data sources.")
  }

  if (!map.services.find((s) => s.name === "sms")) {
    steps.push("3. Add messaging service scaffolds.")
  } else {
    steps.push("3. Connect messaging services to execution workflows.")
  }

  steps.push("4. Add organization profile registry and campaign profile schema.")
  steps.push("5. Add AI context layer so generators respect campaign doctrine.")
  steps.push("6. Add template packs for campaign, nonprofit, church, and student builds.")
  steps.push("7. Add spreadsheet import/export bridges for training and operations.")
  steps.push("8. Add approval workflow engine for sensitive actions.")
  steps.push("9. Add platform diff/scaffold safety checks before generation.")
  steps.push("10. Add system planner preview UI.")

  return {
    preview: steps.join("\n"),
    data: {
      steps
    }
  }

}

/* ------------------------------------------------
SYSTEM PLAN REVIEW
------------------------------------------------ */

function formatCommand(command: PlannedGeneratorCommand) {

  return `${command.type} ${command.name}${command.arg ? ` ${command.arg}` : ""}`

}

function reviewSystemPrompt(prompt: string) {

  const plan = planSystem(prompt)

  if (!plan) {
    return {
      preview: "No known system plan matched this request.",
      data: null
    }
  }

  const lines: string[] = []

  lines.push(`Planned System Review: ${plan.title}`)
  lines.push(plan.summary)

  lines.push("")
  lines.push("Planned generator commands:")
  lines.push("")

  for (const command of plan.commands) {

    lines.push(`- ${formatCommand(command)}${command.circle ? ` [${command.circle}]` : ""}`)

  }

  return {
    preview: lines.join("\n"),
    data: {
      plan
    }
  }

}

/* ------------------------------------------------
DEVOPS ENGINEER ROUTER
------------------------------------------------ */

export async function runDevOpsEngineer(
  prompt: string
): Promise<DevOpsEngineerResult | null> {

  const text = normalize(prompt)

  if (
    includesAny(text, [
      "devops summary",
      "architecture summary",
      "summarize architecture",
      "review platform architecture"
    ])
  ) {

    const result = summarizeArchitecture()

    return {
      ok: true,
      preview: result.preview,
      data: result.data
    }

  }

  if (
    includesAny(text, [
      "next build steps",
      "recommend next steps",
      "what should we build next",
      "devops recommendations"
    ])
  ) {

    const result = recommendNextBuildSteps()

    return {
      ok: true,
      preview: result.preview,
      data: result.data
    }

  }

  if (
    includesAny(text, [
      "review this system plan",
      "review system build",
      "analyze this system build"
    ])
  ) {

    const result = reviewSystemPrompt(prompt)

    return {
      ok: true,
      preview: result.preview,
      data: result.data
    }

  }

  return null

}
