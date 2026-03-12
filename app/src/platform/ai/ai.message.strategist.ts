/**
 * ai.message.strategist.ts
 *
 * AI Messaging Strategist
 *
 * Responsibilities:
 * - Generate campaign messaging by channel
 * - Produce multiple variants
 * - Recommend audience, CTA, and follow-up strategy
 * - Return structured output for templates, campaigns, and cards
 *
 * This file is platform-facing AI infrastructure and contains no UI.
 */

import OpenAI from "openai"

/* -------------------------------------------------------------------------- */
/* OPENAI CLIENT                                                              */
/* -------------------------------------------------------------------------- */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type MessagingChannel =
  | "email"
  | "sms"
  | "phonebank"
  | "social"
  | "substack"
  | "direct_mail"
  | "discord"

export type MessagingObjective =
  | "volunteer_recruitment"
  | "donation_ask"
  | "event_invite"
  | "event_reminder"
  | "persuasion"
  | "turnout"
  | "leadership_development"
  | "community_update"
  | "fundraising_followup"
  | "rapid_response"

export type MessagingTone =
  | "urgent"
  | "hopeful"
  | "professional"
  | "grassroots"
  | "friendly"
  | "persuasive"
  | "firm"
  | "inspirational"

export interface MessageAudienceProfile {
  label?: string
  county?: string
  precinct?: string
  role?: string
  issueInterest?: string
  volunteerStatus?: string
  donorStatus?: string
  supportLevel?: string
  ageRange?: string
  notes?: string
}

export interface MessageStrategistRequest {
  channel: MessagingChannel
  objective: MessagingObjective
  tone: MessagingTone
  campaignName?: string
  candidateName?: string
  organizationName?: string
  audience?: MessageAudienceProfile
  issue?: string
  location?: string
  eventName?: string
  eventDate?: string
  callToAction?: string
  additionalInstructions?: string
  variantCount?: number
}

export interface MessageVariant {
  title: string
  subject?: string
  previewText?: string
  body: string
  cta: string
  suggestedVariables: string[]
}

export interface MessagingStrategyOutput {
  summary: string
  recommendedAudience: string
  recommendedFollowup: string
  channelNotes: string
  variants: MessageVariant[]
}

export interface MessagingStrategyResult {
  ok: boolean
  request: MessageStrategistRequest
  output?: MessagingStrategyOutput
  error?: string
  model: string
}

/* -------------------------------------------------------------------------- */
/* CONFIG                                                                     */
/* -------------------------------------------------------------------------- */

const MODEL = "gpt-4o"
const DEFAULT_VARIANT_COUNT = 3
const MAX_VARIANTS = 5

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function clampVariantCount(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return DEFAULT_VARIANT_COUNT
  return Math.max(1, Math.min(MAX_VARIANTS, value))
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function buildAudienceSummary(audience?: MessageAudienceProfile): string {
  if (!audience) return "General campaign audience"

  const parts = [
    audience.label,
    audience.county ? `County: ${audience.county}` : null,
    audience.precinct ? `Precinct: ${audience.precinct}` : null,
    audience.role ? `Role: ${audience.role}` : null,
    audience.issueInterest ? `Issue Interest: ${audience.issueInterest}` : null,
    audience.volunteerStatus ? `Volunteer Status: ${audience.volunteerStatus}` : null,
    audience.donorStatus ? `Donor Status: ${audience.donorStatus}` : null,
    audience.supportLevel ? `Support Level: ${audience.supportLevel}` : null,
    audience.ageRange ? `Age Range: ${audience.ageRange}` : null,
    audience.notes ? `Notes: ${audience.notes}` : null
  ].filter(Boolean)

  return parts.length ? parts.join(" | ") : "General campaign audience"
}

function normalizeVariant(raw: any, fallbackIndex: number): MessageVariant {
  return {
    title:
      typeof raw?.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : `Variant ${fallbackIndex + 1}`,
    subject:
      typeof raw?.subject === "string" && raw.subject.trim()
        ? raw.subject.trim()
        : undefined,
    previewText:
      typeof raw?.previewText === "string" && raw.previewText.trim()
        ? raw.previewText.trim()
        : undefined,
    body:
      typeof raw?.body === "string" && raw.body.trim()
        ? raw.body.trim()
        : "",
    cta:
      typeof raw?.cta === "string" && raw.cta.trim()
        ? raw.cta.trim()
        : "",
    suggestedVariables: Array.isArray(raw?.suggestedVariables)
      ? raw.suggestedVariables.filter((v: unknown) => typeof v === "string")
      : []
  }
}

/* -------------------------------------------------------------------------- */
/* PROMPT                                                                     */
/* -------------------------------------------------------------------------- */

function buildStrategistPrompt(
  request: MessageStrategistRequest
): string {
  const variantCount = clampVariantCount(request.variantCount)

  return `
You are an elite political messaging strategist for a modern civic operations platform.

Your job:
- write high-performing campaign communications
- adapt messaging to the selected channel
- match tone and objective
- recommend audience targeting and follow-up strategy
- produce structured output only

Return valid JSON in exactly this structure:

{
  "summary": "short summary of the overall messaging strategy",
  "recommendedAudience": "who this message is best for",
  "recommendedFollowup": "what should happen after this message is sent",
  "channelNotes": "channel-specific delivery advice",
  "variants": [
    {
      "title": "internal title for this variant",
      "subject": "email or substack subject if relevant",
      "previewText": "preview text if relevant",
      "body": "full message body",
      "cta": "primary call to action",
      "suggestedVariables": ["first_name", "county", "event_name"]
    }
  ]
}

Rules:
- JSON only
- No markdown
- No commentary outside JSON
- Write as a real strategist, not a generic assistant
- Keep channel constraints in mind:
  - SMS must be short
  - Email should have a subject and strong body
  - Phonebank should read like a spoken script
  - Social should be concise and engaging
  - Discord should feel community-driven
  - Substack should support longer-form narrative
  - Direct mail should be punchy and persuasive

Request:
Channel: ${request.channel}
Objective: ${request.objective}
Tone: ${request.tone}
Campaign Name: ${request.campaignName ?? ""}
Candidate Name: ${request.candidateName ?? ""}
Organization Name: ${request.organizationName ?? ""}
Audience: ${buildAudienceSummary(request.audience)}
Issue: ${request.issue ?? ""}
Location: ${request.location ?? ""}
Event Name: ${request.eventName ?? ""}
Event Date: ${request.eventDate ?? ""}
Call To Action: ${request.callToAction ?? ""}
Additional Instructions: ${request.additionalInstructions ?? ""}
Variant Count: ${variantCount}
`
}

/* -------------------------------------------------------------------------- */
/* MAIN STRATEGIST                                                            */
/* -------------------------------------------------------------------------- */

export async function runMessageStrategist(
  request: MessageStrategistRequest
): Promise<MessagingStrategyResult> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a campaign messaging strategist inside a civic operations platform. Return only valid JSON."
        },
        {
          role: "user",
          content: buildStrategistPrompt(request)
        }
      ],
      response_format: { type: "json_object" }
    })

    const content = response.choices?.[0]?.message?.content

    if (!content) {
      return {
        ok: false,
        request,
        error: "No content returned from AI strategist",
        model: MODEL
      }
    }

    const parsed = safeJsonParse(content) as any

    if (!parsed || typeof parsed !== "object") {
      return {
        ok: false,
        request,
        error: "AI strategist returned invalid JSON",
        model: MODEL
      }
    }

    const rawVariants = Array.isArray(parsed.variants) ? parsed.variants : []
    const variants = rawVariants
      .slice(0, clampVariantCount(request.variantCount))
      .map((variant, index) => normalizeVariant(variant, index))
      .filter((variant) => variant.body.trim().length > 0)

    return {
      ok: true,
      request,
      output: {
        summary:
          typeof parsed.summary === "string" ? parsed.summary : "",
        recommendedAudience:
          typeof parsed.recommendedAudience === "string"
            ? parsed.recommendedAudience
            : "",
        recommendedFollowup:
          typeof parsed.recommendedFollowup === "string"
            ? parsed.recommendedFollowup
            : "",
        channelNotes:
          typeof parsed.channelNotes === "string"
            ? parsed.channelNotes
            : "",
        variants
      },
      model: MODEL
    }
  } catch (error) {
    console.error("AI messaging strategist failed:", error)

    return {
      ok: false,
      request,
      error:
        error instanceof Error
          ? error.message
          : "Unknown AI messaging strategist error",
      model: MODEL
    }
  }
}

/* -------------------------------------------------------------------------- */
/* TEMPLATE CONVERTER                                                         */
/* -------------------------------------------------------------------------- */

export interface MessageTemplateDraft {
  name: string
  channel: MessagingChannel
  subject?: string
  body: string
  description: string
  variables: string[]
}

export function convertStrategyToTemplateDrafts(
  request: MessageStrategistRequest,
  result: MessagingStrategyResult
): MessageTemplateDraft[] {
  if (!result.ok || !result.output) return []

  return result.output.variants.map((variant, index) => ({
    name: `${request.objective}_${request.channel}_variant_${index + 1}`,
    channel: request.channel,
    subject: variant.subject,
    body: variant.body,
    description: variant.title,
    variables: variant.suggestedVariables
  }))
}
