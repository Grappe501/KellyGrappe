/**
 * identity.graph.engine.ts
 *
 * Identity Graph Engine
 *
 * Responsibilities:
 * - normalize incoming identity fragments
 * - score similarity between records
 * - detect likely matches
 * - merge identity fragments into unified profiles
 * - provide graph links between related identities
 *
 * This engine is intentionally database-agnostic at first.
 * It can be used by ingestion, messaging, Discord, social,
 * volunteer systems, donor systems, and website conversion systems.
 */

export type IdentitySource =
  | "contact"
  | "voter"
  | "donor"
  | "discord"
  | "social"
  | "substack"
  | "website"
  | "ingestion"
  | "manual"

export interface IdentityFragment {
  source: IdentitySource
  sourceRecordId: string

  firstName?: string
  lastName?: string
  fullName?: string

  email?: string
  phone?: string

  discordUsername?: string
  discordDisplayName?: string

  socialHandle?: string
  socialPlatform?: string

  addressLine1?: string
  city?: string
  state?: string
  zip?: string

  organizationName?: string
  county?: string
  precinct?: string

  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface NormalizedIdentityFragment {
  source: IdentitySource
  sourceRecordId: string

  firstName?: string
  lastName?: string
  fullName?: string

  email?: string
  phone?: string

  discordUsername?: string
  discordDisplayName?: string

  socialHandle?: string
  socialPlatform?: string

  addressLine1?: string
  city?: string
  state?: string
  zip?: string

  organizationName?: string
  county?: string
  precinct?: string

  tags: string[]
  metadata: Record<string, unknown>
}

export interface IdentitySocialHandle {
  platform?: string
  handle: string
}

export interface IdentityProfile {
  id: string
  primaryName: string
  emails: string[]
  phones: string[]
  discordUsernames: string[]
  socialHandles: IdentitySocialHandle[]
  organizations: string[]
  counties: string[]
  precincts: string[]
  tags: string[]
  fragments: NormalizedIdentityFragment[]
}

export interface IdentityMatchResult {
  leftSourceRecordId: string
  rightSourceRecordId: string
  confidence: number
  reasons: string[]
  shouldMerge: boolean
}

export interface IdentityGraphBuildResult {
  profiles: IdentityProfile[]
  matches: IdentityMatchResult[]
  unmerged: NormalizedIdentityFragment[]
}

/* -------------------------------------------------------------------------- */
/* NORMALIZATION HELPERS                                                      */
/* -------------------------------------------------------------------------- */

function safeTrim(value: unknown): string {
  return String(value ?? "").trim()
}

function normalizeLower(value: unknown): string {
  return safeTrim(value).toLowerCase()
}

function normalizeName(value: unknown): string {
  return safeTrim(value)
    .replace(/\s+/g, " ")
    .trim()
}

function splitFullName(fullName?: string): {
  firstName?: string
  lastName?: string
} {
  const clean = normalizeName(fullName)

  if (!clean) return {}

  const parts = clean.split(" ")

  if (parts.length === 1) {
    return {
      firstName: parts[0]
    }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  }
}

function normalizeEmail(value: unknown): string | undefined {
  const email = normalizeLower(value)
  if (!email || !email.includes("@")) return undefined
  return email
}

function normalizePhone(value: unknown): string | undefined {
  const digits = safeTrim(value).replace(/\D/g, "")
  if (digits.length < 10) return undefined
  return digits
}

function normalizeHandle(value: unknown): string | undefined {
  const handle = safeTrim(value).replace(/^@+/, "").toLowerCase()
  return handle || undefined
}

function normalizeText(value: unknown): string | undefined {
  const clean = normalizeName(value)
  return clean || undefined
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))]
}

function makeProfileId(index: number): string {
  return `identity-profile-${index + 1}`
}

/* -------------------------------------------------------------------------- */
/* FRAGMENT NORMALIZATION                                                     */
/* -------------------------------------------------------------------------- */

export function normalizeIdentityFragment(
  fragment: IdentityFragment
): NormalizedIdentityFragment {
  const derivedName = normalizeName(fragment.fullName)
  const split = splitFullName(derivedName)

  return {
    source: fragment.source,
    sourceRecordId: fragment.sourceRecordId,

    firstName: normalizeText(fragment.firstName) ?? split.firstName,
    lastName: normalizeText(fragment.lastName) ?? split.lastName,
    fullName: derivedName || undefined,

    email: normalizeEmail(fragment.email),
    phone: normalizePhone(fragment.phone),

    discordUsername: normalizeHandle(fragment.discordUsername),
    discordDisplayName: normalizeText(fragment.discordDisplayName),

    socialHandle: normalizeHandle(fragment.socialHandle),
    socialPlatform: normalizeLower(fragment.socialPlatform) || undefined,

    addressLine1: normalizeText(fragment.addressLine1),
    city: normalizeText(fragment.city),
    state: normalizeText(fragment.state),
    zip: normalizeText(fragment.zip),

    organizationName: normalizeText(fragment.organizationName),
    county: normalizeText(fragment.county),
    precinct: normalizeText(fragment.precinct),

    tags: uniqueStrings(fragment.tags ?? []),
    metadata: fragment.metadata ?? {}
  }
}

/* -------------------------------------------------------------------------- */
/* MATCH SCORING                                                              */
/* -------------------------------------------------------------------------- */

export function scoreIdentityMatch(
  left: NormalizedIdentityFragment,
  right: NormalizedIdentityFragment
): IdentityMatchResult {
  let score = 0
  const reasons: string[] = []

  if (left.email && right.email && left.email === right.email) {
    score += 0.55
    reasons.push("matching email")
  }

  if (left.phone && right.phone && left.phone === right.phone) {
    score += 0.45
    reasons.push("matching phone")
  }

  if (
    left.discordUsername &&
    right.discordUsername &&
    left.discordUsername === right.discordUsername
  ) {
    score += 0.45
    reasons.push("matching discord username")
  }

  if (
    left.socialHandle &&
    right.socialHandle &&
    left.socialHandle === right.socialHandle &&
    left.socialPlatform === right.socialPlatform
  ) {
    score += 0.4
    reasons.push("matching social handle")
  }

  if (
    left.fullName &&
    right.fullName &&
    normalizeLower(left.fullName) === normalizeLower(right.fullName)
  ) {
    score += 0.2
    reasons.push("matching full name")
  }

  if (
    left.firstName &&
    right.firstName &&
    normalizeLower(left.firstName) === normalizeLower(right.firstName)
  ) {
    score += 0.08
    reasons.push("matching first name")
  }

  if (
    left.lastName &&
    right.lastName &&
    normalizeLower(left.lastName) === normalizeLower(right.lastName)
  ) {
    score += 0.1
    reasons.push("matching last name")
  }

  if (
    left.organizationName &&
    right.organizationName &&
    normalizeLower(left.organizationName) === normalizeLower(right.organizationName)
  ) {
    score += 0.05
    reasons.push("matching organization")
  }

  if (
    left.county &&
    right.county &&
    normalizeLower(left.county) === normalizeLower(right.county)
  ) {
    score += 0.03
    reasons.push("matching county")
  }

  if (
    left.zip &&
    right.zip &&
    normalizeLower(left.zip) === normalizeLower(right.zip)
  ) {
    score += 0.05
    reasons.push("matching zip")
  }

  const confidence = Math.min(1, Number(score.toFixed(2)))
  const shouldMerge = confidence >= 0.65

  return {
    leftSourceRecordId: left.sourceRecordId,
    rightSourceRecordId: right.sourceRecordId,
    confidence,
    reasons,
    shouldMerge
  }
}

/* -------------------------------------------------------------------------- */
/* PROFILE BUILDING                                                           */
/* -------------------------------------------------------------------------- */

function choosePrimaryName(fragments: NormalizedIdentityFragment[]): string {
  const names = fragments
    .map((fragment) => fragment.fullName)
    .filter((name): name is string => Boolean(name && name.trim()))

  if (names.length > 0) {
    return names.sort((a, b) => b.length - a.length)[0] ?? "Unknown Identity"
  }

  const fallback = fragments[0]
  return fallback?.sourceRecordId || "Unknown Identity"
}

function buildProfile(
  fragments: NormalizedIdentityFragment[],
  index: number
): IdentityProfile {
  const socialHandles: IdentitySocialHandle[] = fragments.flatMap((fragment) =>
    fragment.socialHandle
      ? [
          {
            platform: fragment.socialPlatform,
            handle: fragment.socialHandle
          }
        ]
      : []
  )

  return {
    id: makeProfileId(index),
    primaryName: choosePrimaryName(fragments),
    emails: uniqueStrings(fragments.map((fragment) => fragment.email)),
    phones: uniqueStrings(fragments.map((fragment) => fragment.phone)),
    discordUsernames: uniqueStrings(
      fragments.map((fragment) => fragment.discordUsername)
    ),
    socialHandles,
    organizations: uniqueStrings(
      fragments.map((fragment) => fragment.organizationName)
    ),
    counties: uniqueStrings(fragments.map((fragment) => fragment.county)),
    precincts: uniqueStrings(fragments.map((fragment) => fragment.precinct)),
    tags: uniqueStrings(fragments.flatMap((fragment) => fragment.tags)),
    fragments
  }
}

/* -------------------------------------------------------------------------- */
/* GRAPH BUILD                                                                */
/* -------------------------------------------------------------------------- */

export function buildIdentityGraph(
  rawFragments: IdentityFragment[]
): IdentityGraphBuildResult {
  const fragments = rawFragments.map(normalizeIdentityFragment)

  const matches: IdentityMatchResult[] = []
  const groups: NormalizedIdentityFragment[][] = []
  const used = new Set<string>()

  for (let i = 0; i < fragments.length; i += 1) {
    const current = fragments[i]

    if (!current) {
      continue
    }

    if (used.has(current.sourceRecordId)) {
      continue
    }

    const group: NormalizedIdentityFragment[] = [current]
    used.add(current.sourceRecordId)

    for (let j = i + 1; j < fragments.length; j += 1) {
      const candidate = fragments[j]

      if (!candidate) {
        continue
      }

      if (used.has(candidate.sourceRecordId)) {
        continue
      }

      const result = scoreIdentityMatch(current, candidate)
      matches.push(result)

      if (result.shouldMerge) {
        group.push(candidate)
        used.add(candidate.sourceRecordId)
      }
    }

    groups.push(group)
  }

  const profiles = groups.map((group, index) => buildProfile(group, index))

  const unmerged = fragments.filter(
    (fragment) =>
      !matches.some(
        (match) =>
          match.shouldMerge &&
          (match.leftSourceRecordId === fragment.sourceRecordId ||
            match.rightSourceRecordId === fragment.sourceRecordId)
      )
  )

  return {
    profiles,
    matches,
    unmerged
  }
}

/* -------------------------------------------------------------------------- */
/* PROFILE LOOKUP                                                             */
/* -------------------------------------------------------------------------- */

export function findBestIdentityProfile(
  profiles: IdentityProfile[],
  fragment: IdentityFragment
): {
  profile: IdentityProfile | null
  confidence: number
  reasons: string[]
} {
  const normalized = normalizeIdentityFragment(fragment)

  let bestProfile: IdentityProfile | null = null
  let bestScore = 0
  let bestReasons: string[] = []

  for (const profile of profiles) {
    for (const existing of profile.fragments) {
      const result = scoreIdentityMatch(normalized, existing)

      if (result.confidence > bestScore) {
        bestScore = result.confidence
        bestReasons = result.reasons
        bestProfile = profile
      }
    }
  }

  return {
    profile: bestProfile,
    confidence: bestScore,
    reasons: bestReasons
  }
}

/* -------------------------------------------------------------------------- */
/* PROFILE ENRICHMENT                                                         */
/* -------------------------------------------------------------------------- */

export function mergeFragmentIntoProfile(
  profile: IdentityProfile,
  fragment: IdentityFragment
): IdentityProfile {
  const normalized = normalizeIdentityFragment(fragment)
  const fragments = [...profile.fragments, normalized]

  return buildProfile(fragments, 0)
}
