import { runPlatformGenerator } from "./ai.generator.executor"

export type ArchitectResult = {
  ok: boolean
  previewOnly?: boolean
  output: string
}

export type GeneratorType =
  | "module"
  | "card"
  | "service"
  | "ai"
  | "dashboard"

export type GeneratorCommand = [
  type: GeneratorType,
  name: string,
  arg?: string
]

export type SystemPlan = {
  title: string
  summary: string
  commands: GeneratorCommand[]
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

function includesAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w))
}

function parseMode(prompt: string) {
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

function uniqueCommands(commands: GeneratorCommand[]) {

  const seen = new Set<string>()
  const result: GeneratorCommand[] = []

  for (const command of commands) {

    const key = command.join("::")

    if (!seen.has(key)) {
      seen.add(key)
      result.push(command)
    }

  }

  return result
}

function buildPlan(title: string, commands: GeneratorCommand[]): SystemPlan {

  const deduped = uniqueCommands(commands)

  return {
    title,
    summary: `${title} plan created with ${deduped.length} generator commands.`,
    commands: deduped
  }

}

function previewPlan(plan: SystemPlan): ArchitectResult {

  const lines: string[] = []

  lines.push(`Plan Preview: ${plan.title}`)
  lines.push(plan.summary)
  lines.push("")
  lines.push("Planned generators:")
  lines.push("")

  for (const [type, name, arg] of plan.commands) {
    lines.push(`${type} ${name}${arg ? ` ${arg}` : ""}`)
  }

  return {
    ok: true,
    previewOnly: true,
    output: lines.join("\n")
  }

}

async function runBatch(plan: SystemPlan): Promise<ArchitectResult> {

  const output: string[] = []

  output.push(`Plan: ${plan.title}`)
  output.push(plan.summary)
  output.push("")

  for (const [type, name, arg] of plan.commands) {

    const result = await runPlatformGenerator(type, name, arg)

    output.push(
      `${type} ${name}${arg ? ` ${arg}` : ""} → ${
        result.ok ? "created" : "failed"
      }`
    )

    if (!result.ok && result.output) {
      output.push(result.output.trim())
    }

  }

  return {
    ok: true,
    previewOnly: false,
    output: output.join("\n")
  }

}

/* -------------------------------------------------------------------------- */
/* SYSTEM BUILDERS */
/* -------------------------------------------------------------------------- */

function buildVolunteerSystem(): GeneratorCommand[] {

  return [
    ["module","volunteer-recruitment"],
    ["module","volunteer-onboarding"],
    ["service","volunteer-outreach"],
    ["card","volunteer-leaderboard","metrics"],
    ["card","volunteer-funnel","metrics"],
    ["dashboard","volunteer-command"],
    ["ai","volunteer-intelligence","volunteer"]
  ]

}

function buildDonorSystem(): GeneratorCommand[] {

  return [
    ["module","donor-management"],
    ["module","fundraising-pipeline"],
    ["service","donor-sync"],
    ["card","donor-leaderboard","metrics"],
    ["card","fundraising-velocity","metrics"],
    ["dashboard","fundraising-command"],
    ["ai","donor-insights","donors"]
  ]

}

function buildFieldSystem(): GeneratorCommand[] {

  return [
    ["module","field-operations"],
    ["module","canvassing"],
    ["service","canvassing-sync"],
    ["card","canvass-progress","metrics"],
    ["card","field-coverage","metrics"],
    ["dashboard","field-command"],
    ["ai","field-intelligence","field"]
  ]

}

function buildMessagingSystem(): GeneratorCommand[] {

  return [
    ["module","messaging-center"],
    ["module","outreach-automation"],
    ["service","sms"],
    ["service","email"],
    ["card","message-activity","metrics"],
    ["card","outreach-queue","command"],
    ["dashboard","messaging-command"],
    ["ai","messaging-assistant","messaging"]
  ]

}

function buildCampaignInfrastructure(): GeneratorCommand[] {

  return [
    ...buildVolunteerSystem(),
    ...buildDonorSystem(),
    ...buildFieldSystem(),
    ...buildMessagingSystem(),
    ["dashboard","campaign-war-room"],
    ["ai","campaign-architect","campaign"]
  ]

}

/* -------------------------------------------------------------------------- */
/* PLANNER */
/* -------------------------------------------------------------------------- */

function planSystem(prompt: string): SystemPlan | null {

  const text = normalize(prompt)

  if (
    includesAny(text, [
      "campaign infrastructure",
      "campaign operating system",
      "build a campaign system"
    ])
  ) {
    return buildPlan("Campaign Infrastructure", buildCampaignInfrastructure())
  }

  if (includesAny(text, ["volunteer system","volunteer recruitment"])) {
    return buildPlan("Volunteer System", buildVolunteerSystem())
  }

  if (includesAny(text, ["donor system","fundraising system"])) {
    return buildPlan("Donor System", buildDonorSystem())
  }

  if (includesAny(text, ["field organizing","canvassing system"])) {
    return buildPlan("Field System", buildFieldSystem())
  }

  if (includesAny(text, ["messaging system","sms system"])) {
    return buildPlan("Messaging System", buildMessagingSystem())
  }

  return null
}

/* -------------------------------------------------------------------------- */
/* ARCHITECT ENTRY */
/* -------------------------------------------------------------------------- */

export async function runSystemArchitect(
  prompt: string
): Promise<ArchitectResult | null> {

  const { mode, text } = parseMode(prompt)

  const plan = planSystem(text)

  if (!plan) return null

  if (mode === "plan") {
    return previewPlan(plan)
  }

  return runBatch(plan)

}
