/**
 * identity-resolution.service.ts
 *
 * Identity Resolution Service
 *
 * Responsibilities:
 * - load identity fragments from platform data sources
 * - build unified identity profiles
 * - find best profile matches for new fragments
 * - support ingestion/entity review workflows
 * - prepare for future persistence into identity graph tables
 *
 * Current design:
 * - reads from existing tables where available
 * - uses the identity graph engine for matching
 * - returns structured results for UI/services
 *
 * Future extensions:
 * - persist identity profiles to identity_profiles
 * - persist links to identity_profile_links
 * - attach confidence history / review workflow
 */

import { supabase } from "@shared/lib/supabase"
import {
  buildIdentityGraph,
  findBestIdentityProfile,
  mergeFragmentIntoProfile,
  normalizeIdentityFragment,
  type IdentityFragment,
  type IdentityGraphBuildResult,
  type IdentityProfile
} from "@platform/identity/identity.graph.engine"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type IdentityResolutionSource =
  | "contacts"
  | "ingestion_entities"
  | "discord_members"
  | "social_handles"
  | "website_submissions"
  | "manual"

export interface ResolveIdentityOptions {
  includeContacts?: boolean
  includeIngestionEntities?: boolean
  includeDiscordMembers?: boolean
  includeSocialHandles?: boolean
  includeWebsiteSubmissions?: boolean
  organizationId?: string
  jobId?: string
}

export interface IdentityResolutionSummary {
  totalFragments: number
  totalProfiles: number
  strongMatches: number
}

export interface ResolveIdentityGraphResult {
  ok: boolean
  summary: IdentityResolutionSummary
  graph?: IdentityGraphBuildResult
  error?: string
}

export interface FindIdentityMatchResult {
  ok: boolean
  profile: IdentityProfile | null
  confidence: number
  reasons: string[]
  error?: string
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function safeTrim(value: unknown): string {
  return String(value ?? "").trim()
}

function splitName(fullName?: string): { firstName?: string; lastName?: string } {
  const clean = safeTrim(fullName)
  if (!clean) return {}

  const parts = clean.split(/\s+/)

  if (parts.length === 1) {
    return { firstName: parts[0] }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  }
}

/* -------------------------------------------------------------------------- */
/* FRAGMENT LOADERS                                                           */
/* -------------------------------------------------------------------------- */

async function loadContactFragments(
  organizationId?: string
): Promise<IdentityFragment[]> {
  let query = supabase
    .from("contacts")
    .select("*")

  if (organizationId) {
    query = query.eq("organization_id", organizationId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message || "Failed to load contacts for identity resolution")
  }

  return (data ?? []).map((row: any) => {
    const fullName =
      safeTrim(row.full_name) ||
      [safeTrim(row.first_name), safeTrim(row.last_name)].filter(Boolean).join(" ")

    const split = splitName(fullName)

    return {
      source: "contact",
      sourceRecordId: String(row.id),
      firstName: safeTrim(row.first_name) || split.firstName,
      lastName: safeTrim(row.last_name) || split.lastName,
      fullName: fullName || undefined,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      organizationName: row.organization_name ?? undefined,
      county: row.county ?? undefined,
      precinct: row.precinct ?? undefined,
      tags: Array.isArray(row.tags) ? row.tags : []
    } satisfies IdentityFragment
  })
}

async function loadIngestionEntityFragments(
  jobId?: string
): Promise<IdentityFragment[]> {
  let query = supabase
    .from("ingestion_entities")
    .select("*")

  if (jobId) {
    query = query.eq("ingestion_job_id", jobId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(
      error.message || "Failed to load ingestion entities for identity resolution"
    )
  }

  return (data ?? [])
    .map((row: any) => {
      const entity = row.entity_data ?? {}
      const fullName =
        safeTrim(entity.fullName) ||
        safeTrim(entity.name) ||
        safeTrim(entity.title)

      const split = splitName(fullName)

      return {
        source: "ingestion",
        sourceRecordId: String(row.id),
        firstName: safeTrim(entity.firstName) || split.firstName,
        lastName: safeTrim(entity.lastName) || split.lastName,
        fullName: fullName || undefined,
        email: entity.email ?? entity.value ?? undefined,
        phone: entity.phone ?? entity.value ?? undefined,
        socialHandle: entity.socialHandle ?? undefined,
        socialPlatform: entity.socialPlatform ?? undefined,
        discordUsername: entity.discordUsername ?? undefined,
        discordDisplayName: entity.discordDisplayName ?? undefined,
        organizationName: entity.organization ?? undefined,
        county: entity.county ?? undefined,
        precinct: entity.precinct ?? undefined,
        tags: Array.isArray(entity.tags) ? entity.tags : [row.entity_type].filter(Boolean),
        metadata: {
          entityType: row.entity_type,
          confidence: row.confidence
        }
      } satisfies IdentityFragment
    })
    .filter((fragment) => {
      const normalized = normalizeIdentityFragment(fragment)
      return Boolean(
        normalized.fullName ||
          normalized.email ||
          normalized.phone ||
          normalized.discordUsername ||
          normalized.socialHandle
      )
    })
}

async function loadDiscordFragments(): Promise<IdentityFragment[]> {
  const { data, error } = await supabase
    .from("discord_members")
    .select("*")

  if (error) {
    throw new Error(error.message || "Failed to load Discord members")
  }

  return (data ?? []).map((row: any) => ({
    source: "discord",
    sourceRecordId: String(row.id),
    fullName: row.display_name ?? undefined,
    discordUsername: row.username ?? undefined,
    discordDisplayName: row.display_name ?? undefined,
    organizationName: row.organization_name ?? undefined,
    county: row.county ?? undefined,
    tags: []
  }))
}

async function loadSocialFragments(): Promise<IdentityFragment[]> {
  const { data, error } = await supabase
    .from("social_handles")
    .select("*")

  if (error) {
    throw new Error(error.message || "Failed to load social handles")
  }

  return (data ?? []).map((row: any) => ({
    source: "social",
    sourceRecordId: String(row.id),
    fullName: row.display_name ?? undefined,
    socialHandle: row.handle ?? undefined,
    socialPlatform: row.platform ?? undefined,
    metadata: {
      profileUrl: row.profile_url ?? undefined
    }
  }))
}

async function loadWebsiteSubmissionFragments(): Promise<IdentityFragment[]> {
  const { data, error } = await supabase
    .from("squarespace_form_submissions")
    .select("*")

  if (error) {
    throw new Error(error.message || "Failed to load website submissions")
  }

  return (data ?? []).map((row: any) => {
    const payload = row.payload ?? {}
    const fullName =
      safeTrim(payload.full_name) ||
      [safeTrim(payload.first_name), safeTrim(payload.last_name)].filter(Boolean).join(" ")

    const split = splitName(fullName)

    return {
      source: "website",
      sourceRecordId: String(row.id),
      firstName: safeTrim(payload.first_name) || split.firstName,
      lastName: safeTrim(payload.last_name) || split.lastName,
      fullName: fullName || undefined,
      email: payload.email ?? undefined,
      phone: payload.phone ?? undefined,
      county: payload.county ?? undefined,
      organizationName: payload.organization_name ?? undefined,
      metadata: {
        formName: row.form_name ?? undefined
      }
    } satisfies IdentityFragment
  })
}

/* -------------------------------------------------------------------------- */
/* PUBLIC LOADERS                                                             */
/* -------------------------------------------------------------------------- */

export async function loadIdentityFragments(
  options: ResolveIdentityOptions = {}
): Promise<IdentityFragment[]> {
  const {
    includeContacts = true,
    includeIngestionEntities = true,
    includeDiscordMembers = false,
    includeSocialHandles = false,
    includeWebsiteSubmissions = false,
    organizationId,
    jobId
  } = options

  const fragments: IdentityFragment[] = []

  if (includeContacts) {
    fragments.push(...(await loadContactFragments(organizationId)))
  }

  if (includeIngestionEntities) {
    fragments.push(...(await loadIngestionEntityFragments(jobId)))
  }

  if (includeDiscordMembers) {
    fragments.push(...(await loadDiscordFragments()))
  }

  if (includeSocialHandles) {
    fragments.push(...(await loadSocialFragments()))
  }

  if (includeWebsiteSubmissions) {
    fragments.push(...(await loadWebsiteSubmissionFragments()))
  }

  return fragments
}

/* -------------------------------------------------------------------------- */
/* RESOLUTION                                                                 */
/* -------------------------------------------------------------------------- */

export async function resolveIdentityGraph(
  options: ResolveIdentityOptions = {}
): Promise<ResolveIdentityGraphResult> {
  try {
    const fragments = await loadIdentityFragments(options)
    const graph = buildIdentityGraph(fragments)

    const strongMatches = graph.matches.filter((match) => match.shouldMerge).length

    return {
      ok: true,
      summary: {
        totalFragments: fragments.length,
        totalProfiles: graph.profiles.length,
        strongMatches
      },
      graph
    }
  } catch (error) {
    console.error("Identity graph resolution failed:", error)

    return {
      ok: false,
      summary: {
        totalFragments: 0,
        totalProfiles: 0,
        strongMatches: 0
      },
      error:
        error instanceof Error
          ? error.message
          : "Unknown identity resolution error"
    }
  }
}

export async function findIdentityMatchForFragment(
  fragment: IdentityFragment,
  options: ResolveIdentityOptions = {}
): Promise<FindIdentityMatchResult> {
  try {
    const graphResult = await resolveIdentityGraph(options)

    if (!graphResult.ok || !graphResult.graph) {
      return {
        ok: false,
        profile: null,
        confidence: 0,
        reasons: [],
        error: graphResult.error || "Unable to build identity graph"
      }
    }

    const result = findBestIdentityProfile(graphResult.graph.profiles, fragment)

    return {
      ok: true,
      profile: result.profile,
      confidence: result.confidence,
      reasons: result.reasons
    }
  } catch (error) {
    console.error("Identity match lookup failed:", error)

    return {
      ok: false,
      profile: null,
      confidence: 0,
      reasons: [],
      error:
        error instanceof Error
          ? error.message
          : "Unknown identity match error"
    }
  }
}

/* -------------------------------------------------------------------------- */
/* PROFILE ENRICHMENT                                                         */
/* -------------------------------------------------------------------------- */

export async function enrichBestIdentityProfile(
  fragment: IdentityFragment,
  options: ResolveIdentityOptions = {}
): Promise<{
  ok: boolean
  profile: IdentityProfile | null
  confidence: number
  reasons: string[]
  enrichedProfile?: IdentityProfile
  error?: string
}> {
  try {
    const match = await findIdentityMatchForFragment(fragment, options)

    if (!match.ok || !match.profile) {
      return {
        ok: match.ok,
        profile: null,
        confidence: match.confidence,
        reasons: match.reasons,
        error: match.error
      }
    }

    const enrichedProfile = mergeFragmentIntoProfile(match.profile, fragment)

    return {
      ok: true,
      profile: match.profile,
      enrichedProfile,
      confidence: match.confidence,
      reasons: match.reasons
    }
  } catch (error) {
    console.error("Identity enrichment failed:", error)

    return {
      ok: false,
      profile: null,
      confidence: 0,
      reasons: [],
      error:
        error instanceof Error
          ? error.message
          : "Unknown identity enrichment error"
    }
  }
}

/* -------------------------------------------------------------------------- */
/* INGESTION-SPECIFIC HELPERS                                                 */
/* -------------------------------------------------------------------------- */

export async function resolveIdentityGraphForIngestionJob(
  jobId: string
): Promise<ResolveIdentityGraphResult> {
  return resolveIdentityGraph({
    includeContacts: true,
    includeIngestionEntities: true,
    includeDiscordMembers: false,
    includeSocialHandles: false,
    includeWebsiteSubmissions: false,
    jobId
  })
}

export async function findIdentityMatchForIngestionEntity(
  ingestionEntityId: string
): Promise<FindIdentityMatchResult> {
  try {
    const { data, error } = await supabase
      .from("ingestion_entities")
      .select("*")
      .eq("id", ingestionEntityId)
      .single()

    if (error || !data) {
      return {
        ok: false,
        profile: null,
        confidence: 0,
        reasons: [],
        error: error?.message || "Ingestion entity not found"
      }
    }

    const entity = data.entity_data ?? {}
    const fullName =
      safeTrim(entity.fullName) ||
      safeTrim(entity.name) ||
      safeTrim(entity.title)

    const split = splitName(fullName)

    const fragment: IdentityFragment = {
      source: "ingestion",
      sourceRecordId: String(data.id),
      firstName: safeTrim(entity.firstName) || split.firstName,
      lastName: safeTrim(entity.lastName) || split.lastName,
      fullName: fullName || undefined,
      email: entity.email ?? entity.value ?? undefined,
      phone: entity.phone ?? entity.value ?? undefined,
      socialHandle: entity.socialHandle ?? undefined,
      socialPlatform: entity.socialPlatform ?? undefined,
      discordUsername: entity.discordUsername ?? undefined,
      discordDisplayName: entity.discordDisplayName ?? undefined,
      organizationName: entity.organization ?? undefined,
      county: entity.county ?? undefined,
      precinct: entity.precinct ?? undefined,
      tags: Array.isArray(entity.tags)
        ? entity.tags
        : [data.entity_type].filter(Boolean)
    }

    return findIdentityMatchForFragment(fragment, {
      includeContacts: true,
      includeIngestionEntities: true,
      jobId: data.ingestion_job_id
    })
  } catch (error) {
    console.error("Failed to resolve ingestion entity identity:", error)

    return {
      ok: false,
      profile: null,
      confidence: 0,
      reasons: [],
      error:
        error instanceof Error
          ? error.message
          : "Unknown ingestion identity resolution error"
    }
  }
}
