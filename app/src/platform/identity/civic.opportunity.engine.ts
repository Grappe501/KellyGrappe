/**
 * civic.opportunity.engine.ts
 *
 * Civic Opportunity Engine
 *
 * Purpose:
 * - match people to relevant civic opportunities
 * - prioritize opportunities by geography, interests, readiness, and role
 * - support activation across neighborhood / precinct / city / county / state
 *
 * Future integrations:
 * - organizer progression engine
 * - training completion / certification
 * - identity graph
 * - private civic signals
 * - reputation system
 * - community feed and alerts
 */

import type { GeographicIdentity, CommunityScope } from "@platform/identity/community.footprint.engine"

export type CivicOpportunityType =
  | "volunteer"
  | "event"
  | "training"
  | "leadership"
  | "community_project"
  | "public_comment"
  | "mutual_aid"
  | "campaign_action"

export type CivicEngagementStyle =
  | "observer"
  | "supporter"
  | "volunteer"
  | "organizer"

export interface CivicOpportunity {
  id: string
  title: string
  description: string
  type: CivicOpportunityType

  organizationId?: string
  organizationName?: string

  neighborhood?: string
  precinct?: string
  city?: string
  county?: string
  state?: string
  scope?: CommunityScope

  tags?: string[]

  /**
   * Optional minimum readiness / advancement info
   */
  minimumReadinessPercent?: number
  minimumEngagementStyle?: CivicEngagementStyle

  /**
   * Optional urgency and demand signals
   */
  urgency?: number
  neededCount?: number

  startsAt?: string
  createdAt: string
}

export interface OpportunityMatchContext {
  userId: string
  identity: GeographicIdentity

  interests?: string[]
  engagementStyle?: CivicEngagementStyle
  readinessPercent?: number
  reputationScore?: number
}

export interface CivicOpportunityMatch {
  opportunity: CivicOpportunity
  score: number
  reasons: string[]
  matchedTags: string[]
}

export interface CivicOpportunityResult {
  matches: CivicOpportunityMatch[]
  includedCount: number
  excludedCount: number
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function normalize(value: unknown): string | undefined {
  const text = String(value ?? "").trim()
  return text ? text.toLowerCase() : undefined
}

function same(left: unknown, right: unknown): boolean {
  const a = normalize(left)
  const b = normalize(right)

  if (!a || !b) return false
  return a === b
}

function scoreScope(scope?: CommunityScope): number {
  switch (scope) {
    case "neighborhood":
      return 100
    case "precinct":
      return 92
    case "city":
      return 84
    case "county":
      return 76
    case "state":
      return 68
    case "national":
      return 60
    default:
      return 50
  }
}

function scoreOpportunityType(type: CivicOpportunityType): number {
  switch (type) {
    case "leadership":
      return 22
    case "campaign_action":
      return 20
    case "community_project":
      return 18
    case "volunteer":
      return 16
    case "event":
      return 14
    case "public_comment":
      return 13
    case "training":
      return 12
    case "mutual_aid":
      return 17
    default:
      return 10
  }
}

function scoreUrgency(value?: number): number {
  if (typeof value !== "number") return 0
  return Math.max(0, Math.min(value, 10)) * 2
}

function scoreNeededCount(value?: number): number {
  if (typeof value !== "number") return 0
  if (value >= 25) return 8
  if (value >= 10) return 5
  if (value >= 5) return 3
  if (value >= 1) return 1
  return 0
}

function scoreTagMatch(
  opportunityTags: string[] | undefined,
  userTags: string[] | undefined
): {
  score: number
  matchedTags: string[]
} {
  if (!opportunityTags?.length || !userTags?.length) {
    return {
      score: 0,
      matchedTags: []
    }
  }

  const normalizedOpportunityTags = opportunityTags
    .map((tag) => normalize(tag))
    .filter(Boolean) as string[]

  const normalizedUserTags = userTags
    .map((tag) => normalize(tag))
    .filter(Boolean) as string[]

  const matchedTags = normalizedOpportunityTags.filter((tag) =>
    normalizedUserTags.includes(tag)
  )

  return {
    score: matchedTags.length * 10,
    matchedTags
  }
}

function compareDateDescending(
  left: CivicOpportunityMatch,
  right: CivicOpportunityMatch
): number {
  return (
    new Date(right.opportunity.createdAt).getTime() -
    new Date(left.opportunity.createdAt).getTime()
  )
}

function engagementRank(style?: CivicEngagementStyle): number {
  switch (style) {
    case "observer":
      return 1
    case "supporter":
      return 2
    case "volunteer":
      return 3
    case "organizer":
      return 4
    default:
      return 0
  }
}

function isEngagementEligible(
  currentStyle?: CivicEngagementStyle,
  minimumStyle?: CivicEngagementStyle
): boolean {
  if (!minimumStyle) return true
  return engagementRank(currentStyle) >= engagementRank(minimumStyle)
}

function isReadinessEligible(
  readinessPercent?: number,
  minimumReadinessPercent?: number
): boolean {
  if (typeof minimumReadinessPercent !== "number") return true
  return (readinessPercent ?? 0) >= minimumReadinessPercent
}

function isGeographicallyEligible(
  identity: GeographicIdentity,
  opportunity: CivicOpportunity
): boolean {
  if (opportunity.scope === "national") {
    return true
  }

  if (opportunity.neighborhood) {
    return same(identity.neighborhood, opportunity.neighborhood)
  }

  if (opportunity.precinct) {
    return same(identity.precinct, opportunity.precinct)
  }

  if (opportunity.city) {
    return same(identity.city, opportunity.city)
  }

  if (opportunity.county) {
    return same(identity.county, opportunity.county)
  }

  if (opportunity.state) {
    return same(identity.state, opportunity.state)
  }

  return true
}

function buildGeographicReason(
  identity: GeographicIdentity,
  opportunity: CivicOpportunity
): string | null {
  if (opportunity.neighborhood && same(identity.neighborhood, opportunity.neighborhood)) {
    return "Located in your neighborhood"
  }

  if (opportunity.precinct && same(identity.precinct, opportunity.precinct)) {
    return "Located in your precinct"
  }

  if (opportunity.city && same(identity.city, opportunity.city)) {
    return "Located in your city"
  }

  if (opportunity.county && same(identity.county, opportunity.county)) {
    return "Located in your county"
  }

  if (opportunity.state && same(identity.state, opportunity.state)) {
    return "Located in your state"
  }

  if (opportunity.scope === "national") {
    return "Available nationally"
  }

  return null
}

function scoreOpportunity(
  context: OpportunityMatchContext,
  opportunity: CivicOpportunity
): CivicOpportunityMatch {
  const reasons: string[] = []
  let score = 0

  score += scoreScope(opportunity.scope)
  score += scoreOpportunityType(opportunity.type)
  score += scoreUrgency(opportunity.urgency)
  score += scoreNeededCount(opportunity.neededCount)

  const geographicReason = buildGeographicReason(context.identity, opportunity)
  if (geographicReason) {
    reasons.push(geographicReason)
    score += 12
  }

  const tagMatch = scoreTagMatch(opportunity.tags, context.interests)
  if (tagMatch.matchedTags.length > 0) {
    reasons.push("Matches your civic interests")
    score += tagMatch.score
  }

  if (
    typeof opportunity.minimumReadinessPercent === "number" &&
    typeof context.readinessPercent === "number" &&
    context.readinessPercent >= opportunity.minimumReadinessPercent
  ) {
    reasons.push("Matches your readiness level")
    score += 8
  }

  if (
    opportunity.minimumEngagementStyle &&
    isEngagementEligible(context.engagementStyle, opportunity.minimumEngagementStyle)
  ) {
    reasons.push("Matches your engagement style")
    score += 6
  }

  if ((context.reputationScore ?? 0) >= 70) {
    score += 3
  }

  return {
    opportunity,
    score,
    reasons,
    matchedTags: tagMatch.matchedTags
  }
}

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

export function buildCivicOpportunityMatches(
  context: OpportunityMatchContext,
  opportunities: CivicOpportunity[],
  limit = 25
): CivicOpportunityResult {
  const matches: CivicOpportunityMatch[] = []
  let excludedCount = 0

  for (const opportunity of opportunities) {
    if (!isGeographicallyEligible(context.identity, opportunity)) {
      excludedCount += 1
      continue
    }

    if (
      !isReadinessEligible(
        context.readinessPercent,
        opportunity.minimumReadinessPercent
      )
    ) {
      excludedCount += 1
      continue
    }

    if (
      !isEngagementEligible(
        context.engagementStyle,
        opportunity.minimumEngagementStyle
      )
    ) {
      excludedCount += 1
      continue
    }

    matches.push(scoreOpportunity(context, opportunity))
  }

  const sorted = matches
    .sort((a, b) => {
      const scoreDiff = b.score - a.score

      if (scoreDiff !== 0) {
        return scoreDiff
      }

      return compareDateDescending(a, b)
    })
    .slice(0, limit)

  return {
    matches: sorted,
    includedCount: sorted.length,
    excludedCount
  }
}

export function getOpportunitiesByType(
  opportunities: CivicOpportunityMatch[],
  type: CivicOpportunityType
): CivicOpportunityMatch[] {
  return opportunities.filter((item) => item.opportunity.type === type)
}

export function getLeadershipOpportunities(
  opportunities: CivicOpportunityMatch[]
): CivicOpportunityMatch[] {
  return opportunities.filter(
    (item) =>
      item.opportunity.type === "leadership" ||
      item.opportunity.type === "campaign_action"
  )
}

export function getTrainingOpportunities(
  opportunities: CivicOpportunityMatch[]
): CivicOpportunityMatch[] {
  return opportunities.filter(
    (item) => item.opportunity.type === "training"
  )
}

export function getUrgentOpportunities(
  opportunities: CivicOpportunityMatch[]
): CivicOpportunityMatch[] {
  return opportunities.filter(
    (item) => (item.opportunity.urgency ?? 0) >= 7
  )
}
