/**
 * local.civic.feed.engine.ts
 *
 * Local Civic Feed Engine
 *
 * Purpose:
 * - generate geographically relevant civic feeds
 * - determine which civic items belong in a user's local feed
 * - support neighborhoods, precincts, cities, counties, and states
 * - support organization-specific civic content within valid footprints
 *
 * Future integrations:
 * - moderation engine
 * - reputation engine
 * - private matching signals
 * - event urgency scoring
 * - public/private visibility rules
 */

import type { GeographicIdentity } from "@platform/identity/community.footprint.engine"
import type {
  CommunityFootprintDefinition,
  CommunityScope
} from "@platform/identity/community.footprint.engine"
import { evaluateCommunityMembership } from "@platform/identity/community.footprint.engine"

export type CivicFeedItemType =
  | "announcement"
  | "event"
  | "opportunity"
  | "discussion"
  | "training"
  | "alert"
  | "organization_update"

export type CivicFeedVisibility =
  | "public"
  | "community"
  | "organization"
  | "private"

export interface CivicFeedItem {
  id: string
  type: CivicFeedItemType
  title: string
  body: string

  createdById?: string
  organizationId?: string
  organizationName?: string

  visibility: CivicFeedVisibility

  /**
   * Geographic targeting
   */
  neighborhood?: string
  precinct?: string
  city?: string
  county?: string
  state?: string
  scope?: CommunityScope

  /**
   * Optional tags for issue / opportunity matching
   */
  tags?: string[]

  /**
   * Optional organization footprint binding
   */
  footprintId?: string

  /**
   * Future moderation / trust systems
   */
  moderationStatus?: "approved" | "pending" | "flagged"
  relevanceScore?: number

  createdAt: string
}

export interface LocalCivicFeedResult {
  items: CivicFeedItem[]
  includedCount: number
  excludedCount: number
}

export interface CivicFeedBuildOptions {
  includePublic?: boolean
  includeCommunity?: boolean
  includeOrganization?: boolean
  includePrivate?: boolean
  requiredTags?: string[]
  limit?: number
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

function scoreTagMatch(
  itemTags: string[] | undefined,
  requiredTags: string[] | undefined
): number {
  if (!itemTags?.length || !requiredTags?.length) {
    return 0
  }

  const normalizedItemTags = itemTags
    .map((tag) => normalize(tag))
    .filter(Boolean) as string[]

  const normalizedRequiredTags = requiredTags
    .map((tag) => normalize(tag))
    .filter(Boolean) as string[]

  let matches = 0

  for (const tag of normalizedItemTags) {
    if (normalizedRequiredTags.includes(tag)) {
      matches += 1
    }
  }

  return matches * 8
}

function compareDateDescending(left: CivicFeedItem, right: CivicFeedItem): number {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
}

function scoreFeedItem(
  identity: GeographicIdentity,
  item: CivicFeedItem,
  requiredTags?: string[]
): number {
  let score = 0

  score += scoreScope(item.scope)

  if (item.neighborhood && same(identity.neighborhood, item.neighborhood)) {
    score += 20
  } else if (item.precinct && same(identity.precinct, item.precinct)) {
    score += 16
  } else if (item.city && same(identity.city, item.city)) {
    score += 12
  } else if (item.county && same(identity.county, item.county)) {
    score += 8
  } else if (item.state && same(identity.state, item.state)) {
    score += 4
  }

  score += scoreTagMatch(item.tags, requiredTags)

  if (item.type === "event") score += 5
  if (item.type === "opportunity") score += 6
  if (item.type === "alert") score += 7
  if (item.type === "training") score += 4

  return score
}

function isVisibilityAllowed(
  item: CivicFeedItem,
  options: CivicFeedBuildOptions
): boolean {
  if (item.visibility === "public") {
    return options.includePublic ?? true
  }

  if (item.visibility === "community") {
    return options.includeCommunity ?? true
  }

  if (item.visibility === "organization") {
    return options.includeOrganization ?? true
  }

  if (item.visibility === "private") {
    return options.includePrivate ?? false
  }

  return false
}

function isGeographicallyRelevant(
  identity: GeographicIdentity,
  item: CivicFeedItem
): boolean {
  if (item.scope === "national") {
    return true
  }

  if (item.neighborhood) {
    return same(identity.neighborhood, item.neighborhood)
  }

  if (item.precinct) {
    return same(identity.precinct, item.precinct)
  }

  if (item.city) {
    return same(identity.city, item.city)
  }

  if (item.county) {
    return same(identity.county, item.county)
  }

  if (item.state) {
    return same(identity.state, item.state)
  }

  return item.visibility === "public"
}

function buildFootprintMap(
  footprints: CommunityFootprintDefinition[]
): Map<string, CommunityFootprintDefinition> {
  const map = new Map<string, CommunityFootprintDefinition>()

  for (const footprint of footprints) {
    map.set(footprint.id, footprint)
  }

  return map
}

function isAllowedByFootprint(
  identity: GeographicIdentity,
  item: CivicFeedItem,
  footprintMap: Map<string, CommunityFootprintDefinition>
): boolean {
  if (!item.footprintId) {
    return true
  }

  const footprint = footprintMap.get(item.footprintId)

  if (!footprint) {
    return false
  }

  return evaluateCommunityMembership(identity, footprint).isEligible
}

/* -------------------------------------------------------------------------- */
/* ENGINE                                                                     */
/* -------------------------------------------------------------------------- */

export function buildLocalCivicFeed(
  identity: GeographicIdentity,
  items: CivicFeedItem[],
  footprints: CommunityFootprintDefinition[] = [],
  options: CivicFeedBuildOptions = {}
): LocalCivicFeedResult {
  const footprintMap = buildFootprintMap(footprints)

  const included: CivicFeedItem[] = []
  let excludedCount = 0

  for (const item of items) {
    if (item.moderationStatus === "flagged") {
      excludedCount += 1
      continue
    }

    if (!isVisibilityAllowed(item, options)) {
      excludedCount += 1
      continue
    }

    if (!isGeographicallyRelevant(identity, item)) {
      excludedCount += 1
      continue
    }

    if (!isAllowedByFootprint(identity, item, footprintMap)) {
      excludedCount += 1
      continue
    }

    const relevanceScore = scoreFeedItem(identity, item, options.requiredTags)

    included.push({
      ...item,
      relevanceScore
    })
  }

  const sorted = included
    .sort((a, b) => {
      const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)

      if (scoreDiff !== 0) {
        return scoreDiff
      }

      return compareDateDescending(a, b)
    })
    .slice(0, options.limit ?? 50)

  return {
    items: sorted,
    includedCount: sorted.length,
    excludedCount
  }
}

export function getFeedItemsForScope(
  items: CivicFeedItem[],
  scope: CommunityScope
): CivicFeedItem[] {
  return items.filter((item) => item.scope === scope)
}

export function getFeedItemsForOrganization(
  items: CivicFeedItem[],
  organizationId: string
): CivicFeedItem[] {
  return items.filter((item) => item.organizationId === organizationId)
}

export function getUrgentFeedItems(
  items: CivicFeedItem[]
): CivicFeedItem[] {
  return items.filter(
    (item) => item.type === "alert" || item.type === "opportunity"
  )
}

export function getTrainingFeedItems(
  items: CivicFeedItem[]
): CivicFeedItem[] {
  return items.filter((item) => item.type === "training")
}
