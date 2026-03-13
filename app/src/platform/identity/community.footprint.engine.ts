/**
 * community.footprint.engine.ts
 *
 * Community Footprint Engine
 *
 * Purpose:
 * - define geographic footprint rules for organizations and community groups
 * - evaluate whether a person or organization belongs within a footprint
 * - support civic, business, church, school, and community network models
 *
 * Future integrations:
 * - voter / resident identity verification
 * - GIS boundary layers
 * - neighborhood / precinct / district tables
 * - community feed access control
 * - AI recommendation engine
 */

export type CommunityScope =
  | "neighborhood"
  | "precinct"
  | "city"
  | "county"
  | "state"
  | "national"

export type CommunityEntityType =
  | "campaign"
  | "church"
  | "nonprofit"
  | "business"
  | "school"
  | "community_group"
  | "media_org"
  | "custom"

export interface GeographicIdentity {
  voterId?: string
  residentId?: string

  neighborhood?: string
  precinct?: string
  city?: string
  county?: string
  state?: string
  zip?: string

  latitude?: number
  longitude?: number
}

export interface CommunityFootprintDefinition {
  id: string
  entityType: CommunityEntityType
  entityId: string
  entityName: string

  scope: CommunityScope

  neighborhood?: string
  precinct?: string
  city?: string
  county?: string
  state?: string

  /**
   * Optional admin-controlled tags for issue / mission / community matching
   */
  tags?: string[]

  /**
   * Whether membership requires physical presence in the footprint.
   * Default true for local civic/community use.
   */
  requiresPhysicalPresence?: boolean
}

export interface CommunityMembershipEvaluation {
  isEligible: boolean
  matchedScope: CommunityScope | null
  matchedFields: string[]
  missingFields: string[]
  reasons: string[]
}

export interface CommunityFootprintSummary {
  id: string
  entityType: CommunityEntityType
  entityId: string
  entityName: string
  scope: CommunityScope
  label: string
  requiresPhysicalPresence: boolean
  tags: string[]
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function normalize(value: unknown): string | undefined {
  const text = String(value ?? "").trim()
  return text ? text.toLowerCase() : undefined
}

function buildLabel(footprint: CommunityFootprintDefinition): string {
  const parts = [
    footprint.neighborhood,
    footprint.precinct,
    footprint.city,
    footprint.county,
    footprint.state
  ].filter(Boolean)

  return parts.join(" • ") || footprint.scope
}

function includesNormalized(
  left: unknown,
  right: unknown
): boolean {
  const a = normalize(left)
  const b = normalize(right)

  if (!a || !b) return false
  return a === b
}

/* -------------------------------------------------------------------------- */
/* CORE EVALUATION                                                            */
/* -------------------------------------------------------------------------- */

export function evaluateCommunityMembership(
  identity: GeographicIdentity,
  footprint: CommunityFootprintDefinition
): CommunityMembershipEvaluation {
  const matchedFields: string[] = []
  const missingFields: string[] = []
  const reasons: string[] = []

  switch (footprint.scope) {
    case "neighborhood": {
      if (includesNormalized(identity.neighborhood, footprint.neighborhood)) {
        matchedFields.push("neighborhood")
      } else {
        missingFields.push("neighborhood")
      }

      if (includesNormalized(identity.city, footprint.city)) {
        matchedFields.push("city")
      } else if (footprint.city) {
        missingFields.push("city")
      }

      if (includesNormalized(identity.state, footprint.state)) {
        matchedFields.push("state")
      } else if (footprint.state) {
        missingFields.push("state")
      }

      break
    }

    case "precinct": {
      if (includesNormalized(identity.precinct, footprint.precinct)) {
        matchedFields.push("precinct")
      } else {
        missingFields.push("precinct")
      }

      if (includesNormalized(identity.county, footprint.county)) {
        matchedFields.push("county")
      } else if (footprint.county) {
        missingFields.push("county")
      }

      if (includesNormalized(identity.state, footprint.state)) {
        matchedFields.push("state")
      } else if (footprint.state) {
        missingFields.push("state")
      }

      break
    }

    case "city": {
      if (includesNormalized(identity.city, footprint.city)) {
        matchedFields.push("city")
      } else {
        missingFields.push("city")
      }

      if (includesNormalized(identity.state, footprint.state)) {
        matchedFields.push("state")
      } else if (footprint.state) {
        missingFields.push("state")
      }

      break
    }

    case "county": {
      if (includesNormalized(identity.county, footprint.county)) {
        matchedFields.push("county")
      } else {
        missingFields.push("county")
      }

      if (includesNormalized(identity.state, footprint.state)) {
        matchedFields.push("state")
      } else if (footprint.state) {
        missingFields.push("state")
      }

      break
    }

    case "state": {
      if (includesNormalized(identity.state, footprint.state)) {
        matchedFields.push("state")
      } else {
        missingFields.push("state")
      }

      break
    }

    case "national": {
      matchedFields.push("national")
      reasons.push("National footprint allows broad participation.")
      break
    }

    default:
      break
  }

  const isEligible =
    footprint.scope === "national" || missingFields.length === 0

  if (isEligible && reasons.length === 0) {
    reasons.push("Identity matches the organization footprint.")
  }

  if (!isEligible) {
    reasons.push("Identity does not match required geographic footprint.")
  }

  return {
    isEligible,
    matchedScope: isEligible ? footprint.scope : null,
    matchedFields,
    missingFields,
    reasons
  }
}

/* -------------------------------------------------------------------------- */
/* BULK MATCHING                                                              */
/* -------------------------------------------------------------------------- */

export function filterEligibleFootprints(
  identity: GeographicIdentity,
  footprints: CommunityFootprintDefinition[]
): CommunityFootprintDefinition[] {
  return footprints.filter((footprint) => {
    const result = evaluateCommunityMembership(identity, footprint)
    return result.isEligible
  })
}

export function buildFootprintSummaries(
  footprints: CommunityFootprintDefinition[]
): CommunityFootprintSummary[] {
  return footprints.map((footprint) => ({
    id: footprint.id,
    entityType: footprint.entityType,
    entityId: footprint.entityId,
    entityName: footprint.entityName,
    scope: footprint.scope,
    label: buildLabel(footprint),
    requiresPhysicalPresence: footprint.requiresPhysicalPresence ?? true,
    tags: footprint.tags ?? []
  }))
}

/* -------------------------------------------------------------------------- */
/* ORGANIZATION / COMMUNITY RECOMMENDATION SUPPORT                            */
/* -------------------------------------------------------------------------- */

export interface CommunityRecommendationInput {
  identity: GeographicIdentity
  footprints: CommunityFootprintDefinition[]
  issueTags?: string[]
}

export interface CommunityRecommendation {
  footprintId: string
  entityId: string
  entityType: CommunityEntityType
  entityName: string
  score: number
  matchedTags: string[]
  scope: CommunityScope
  label: string
}

export function recommendCommunityConnections(
  input: CommunityRecommendationInput
): CommunityRecommendation[] {
  const eligible = filterEligibleFootprints(input.identity, input.footprints)

  return eligible
    .map((footprint) => {
      const footprintTags = (footprint.tags ?? []).map((tag) => normalize(tag)).filter(Boolean) as string[]
      const desiredTags = (input.issueTags ?? []).map((tag) => normalize(tag)).filter(Boolean) as string[]

      const matchedTags = footprintTags.filter((tag) => desiredTags.includes(tag))

      let score = 50

      if (footprint.scope === "neighborhood") score += 25
      else if (footprint.scope === "precinct") score += 20
      else if (footprint.scope === "city") score += 15
      else if (footprint.scope === "county") score += 10
      else if (footprint.scope === "state") score += 5

      score += matchedTags.length * 10

      return {
        footprintId: footprint.id,
        entityId: footprint.entityId,
        entityType: footprint.entityType,
        entityName: footprint.entityName,
        score,
        matchedTags,
        scope: footprint.scope,
        label: buildLabel(footprint)
      }
    })
    .sort((a, b) => b.score - a.score)
}
