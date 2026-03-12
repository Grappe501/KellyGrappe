/**
 * ai.messaging.orchestrator.ts
 *
 * AI Messaging Orchestrator
 *
 * Responsibilities:
 * - turn campaign intent into executable messaging actions
 * - build an audience
 * - generate message variants with the AI strategist
 * - choose the best variant
 * - optionally queue delivery through the messaging engine
 *
 * This is the top-level orchestration layer for the Communication Circle.
 */

import { buildAudience, type AudienceFilter } from "@platform/audience/audience.builder.engine"
import {
  runMessageStrategist,
  type MessagingChannel,
  type MessagingObjective,
  type MessagingTone,
  type MessageStrategistRequest,
  type MessagingStrategyResult
} from "@platform/ai/ai.message.strategist"
import {
  sendMessageToAudience,
  type AudienceMember,
  type MessageSendResult
} from "@platform/messaging/messaging.delivery.engine"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface MessagingOrchestratorRequest {
  channel: MessagingChannel
  objective: MessagingObjective
  tone: MessagingTone

  audienceFilters: AudienceFilter

  campaignName?: string
  candidateName?: string
  organizationName?: string

  audienceLabel?: string
  issue?: string
  location?: string
  eventName?: string
  eventDate?: string
  callToAction?: string
  additionalInstructions?: string

  variantCount?: number
  selectedVariantIndex?: number

  variables?: Record<string, string>
  dryRun?: boolean
}

export interface MessagingOrchestratorPreview {
  audienceCount: number
  selectedChannel: MessagingChannel
  selectedObjective: MessagingObjective
  selectedTone: MessagingTone
  selectedVariantIndex: number
  selectedMessageSubject?: string
  selectedMessageBody: string
  recommendedAudience: string
  recommendedFollowup: string
  channelNotes: string
}

export interface MessagingOrchestratorResult {
  ok: boolean
  preview?: MessagingOrchestratorPreview
  strategy?: MessagingStrategyResult
  delivery?: MessageSendResult
  error?: string
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function clampVariantIndex(index: number | undefined, max: number): number {
  if (max <= 0) return 0
  if (typeof index !== "number" || Number.isNaN(index)) return 0
  return Math.max(0, Math.min(index, max - 1))
}

function toAudienceMembers(
  members: Awaited<ReturnType<typeof buildAudience>>["members"]
): AudienceMember[] {
  return members.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    email: member.email,
    phone: member.phone
  }))
}

/* -------------------------------------------------------------------------- */
/* MAIN ORCHESTRATOR                                                          */
/* -------------------------------------------------------------------------- */

export async function runMessagingOrchestrator(
  request: MessagingOrchestratorRequest
): Promise<MessagingOrchestratorResult> {
  try {
    const audienceResult = await buildAudience(request.audienceFilters)

    const strategistRequest: MessageStrategistRequest = {
      channel: request.channel,
      objective: request.objective,
      tone: request.tone,
      campaignName: request.campaignName,
      candidateName: request.candidateName,
      organizationName: request.organizationName,
      audience: {
        label: request.audienceLabel,
        county: request.audienceFilters.county,
        precinct: request.audienceFilters.precinct,
        issueInterest: request.issue
      },
      issue: request.issue,
      location: request.location,
      eventName: request.eventName,
      eventDate: request.eventDate,
      callToAction: request.callToAction,
      additionalInstructions: request.additionalInstructions,
      variantCount: request.variantCount
    }

    const strategy = await runMessageStrategist(strategistRequest)

    if (!strategy.ok || !strategy.output || strategy.output.variants.length === 0) {
      return {
        ok: false,
        strategy,
        error: strategy.error || "AI strategist did not produce usable variants"
      }
    }

    const selectedVariantIndex = clampVariantIndex(
      request.selectedVariantIndex,
      strategy.output.variants.length
    )

    const selectedVariant = strategy.output.variants[selectedVariantIndex]

    const preview: MessagingOrchestratorPreview = {
      audienceCount: audienceResult.count,
      selectedChannel: request.channel,
      selectedObjective: request.objective,
      selectedTone: request.tone,
      selectedVariantIndex,
      selectedMessageSubject: selectedVariant.subject,
      selectedMessageBody: selectedVariant.body,
      recommendedAudience: strategy.output.recommendedAudience,
      recommendedFollowup: strategy.output.recommendedFollowup,
      channelNotes: strategy.output.channelNotes
    }

    if (request.dryRun) {
      return {
        ok: true,
        preview,
        strategy
      }
    }

    const audienceMembers = toAudienceMembers(audienceResult.members)

    const delivery = await sendMessageToAudience(
      audienceMembers,
      {
        subject: selectedVariant.subject,
        body: selectedVariant.body
      },
      {
        channel: request.channel,
        variables: request.variables
      }
    )

    return {
      ok: true,
      preview,
      strategy,
      delivery
    }
  } catch (error) {
    console.error("AI Messaging Orchestrator failed:", error)

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown AI messaging orchestrator error"
    }
  }
}
