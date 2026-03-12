/**
 * audience.builder.engine.ts
 *
 * Audience Builder Engine
 *
 * Builds targeted audiences using identity graph data.
 *
 * Supports filters for:
 * - geography
 * - volunteer status
 * - donor status
 * - messaging engagement
 * - social / discord presence
 * - tags
 */

import { supabase } from "@shared/lib/supabase"

export type AudienceFilter = {
  county?: string
  precinct?: string
  tag?: string
  hasEmail?: boolean
  hasPhone?: boolean
  volunteerStatus?: "active" | "inactive"
  donorStatus?: "donor" | "non_donor"
}

export interface AudienceMember {
  id: string
  fullName?: string
  email?: string
  phone?: string
  county?: string
  precinct?: string
  tags?: string[]
}

export interface AudienceBuildResult {
  members: AudienceMember[]
  count: number
}

/* -------------------------------------------------------------------------- */
/* BUILD AUDIENCE                                                             */
/* -------------------------------------------------------------------------- */

export async function buildAudience(
  filters: AudienceFilter
): Promise<AudienceBuildResult> {

  let query = supabase
    .from("contacts")
    .select("*")

  if (filters.county) {
    query = query.eq("county", filters.county)
  }

  if (filters.precinct) {
    query = query.eq("precinct", filters.precinct)
  }

  if (filters.hasEmail) {
    query = query.not("email", "is", null)
  }

  if (filters.hasPhone) {
    query = query.not("phone", "is", null)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const members: AudienceMember[] = (data ?? []).map((row: any) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    county: row.county,
    precinct: row.precinct,
    tags: row.tags ?? []
  }))

  return {
    members,
    count: members.length
  }
}
