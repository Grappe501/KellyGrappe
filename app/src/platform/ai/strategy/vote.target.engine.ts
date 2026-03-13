/**
 * vote.target.engine.ts
 *
 * Statewide electoral strategy engine.
 *
 * Calculates win targets and organizing gaps
 * using:
 *
 * • voter file baseline from Supabase
 * • local campaign contacts
 * • local follow-up completion activity
 *
 * The engine is designed to continuously update
 * as new data is ingested.
 */

import { listContacts } from "@services/contacts.service"
import { listLiveFollowUps } from "@services/followups.service"
import { supabase } from "@db/supabase"

/* ---------------- TYPES ---------------- */

export type CountyTarget = {
  county: string
  registeredVoters: number
  turnoutEstimate: number
  demVoteTarget: number
  contactCoverage: number
  volunteerCoverage: number
  priorityScore: number
}

export type StatewideTarget = {
  electionYear: number
  registeredVoters: number
  expectedTurnout: number
  winTargetVotes: number
  counties: CountyTarget[]
}

type VoterCountyRow = {
  county?: string | null
}

/* ---------------- BASELINE CONSTANTS ---------------- */

const DEM_SHARE_BASELINE = 0.52
const EXPECTED_TURNOUT_RATE = 0.60
const UNKNOWN_COUNTY = "Unknown"

/* ---------------- MAIN ENGINE ---------------- */

export async function calculateStatewideTarget(
  electionYear: number
): Promise<StatewideTarget> {

  const voterFile = await loadVoterFile()

  const contacts = await listContacts().catch(() => [])

  const followups = await listLiveFollowUps().catch(() => [])

  const countyGroups = groupByCounty(voterFile)

  const counties: CountyTarget[] = []

  for (const county of Object.keys(countyGroups)) {

    const voters = countyGroups[county]

    const registeredVoters = voters.length

    const turnoutEstimate =
      Math.round(registeredVoters * EXPECTED_TURNOUT_RATE)

    const demVoteTarget =
      Math.round(turnoutEstimate * DEM_SHARE_BASELINE)

    const contactsInCounty = contacts.filter(
      (contact: any) => normalizeCounty(contact?.county) === county
    )

    const volunteersInCounty = followups.filter((followup: any) => {
      if (followup?.followUpStatus !== "COMPLETED") {
        return false
      }

      const countyFromFollowup =
        extractCountyFromFollowUp(followup) ??
        findCountyForFollowUpContact(contacts, followup?.contactId)

      return normalizeCounty(countyFromFollowup) === county
    })

    const contactCoverage =
      registeredVoters > 0
        ? contactsInCounty.length / registeredVoters
        : 0

    const volunteerCoverage =
      registeredVoters > 0
        ? volunteersInCounty.length / registeredVoters
        : 0

    const priorityScore =
      calculatePriority(
        demVoteTarget,
        contactCoverage,
        volunteerCoverage
      )

    counties.push({
      county,
      registeredVoters,
      turnoutEstimate,
      demVoteTarget,
      contactCoverage,
      volunteerCoverage,
      priorityScore
    })
  }

  const registeredVoters = voterFile.length

  const expectedTurnout =
    Math.round(
      registeredVoters * EXPECTED_TURNOUT_RATE
    )

  const winTargetVotes =
    Math.round(expectedTurnout * DEM_SHARE_BASELINE)

  return {
    electionYear,
    registeredVoters,
    expectedTurnout,
    winTargetVotes,
    counties: counties.sort(
      (a, b) => b.priorityScore - a.priorityScore
    )
  }
}

/* ---------------- HELPERS ---------------- */

async function loadVoterFile(): Promise<VoterCountyRow[]> {
  const rows: VoterCountyRow[] = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from("voters")
      .select("county")
      .range(from, from + pageSize - 1)

    if (error) {
      console.warn("[vote-target] voter file load failed", error)
      break
    }

    const batch = (data ?? []) as VoterCountyRow[]

    rows.push(...batch)

    if (batch.length < pageSize) {
      break
    }

    from += pageSize
  }

  return rows
}

function groupByCounty(voters: VoterCountyRow[]) {

  const groups: Record<string, VoterCountyRow[]> = {}

  for (const voter of voters) {

    const county = normalizeCounty(voter?.county)

    if (!groups[county]) {
      groups[county] = []
    }

    groups[county].push(voter)
  }

  return groups
}

function normalizeCounty(county: unknown): string {
  const value = String(county ?? "").trim()

  if (!value) return UNKNOWN_COUNTY

  return value
}

function extractCountyFromFollowUp(followup: any): string | undefined {
  const directCounty = String(followup?.county ?? "").trim()
  if (directCounty) return directCounty

  const location = String(followup?.location ?? "").trim()
  if (!location) return undefined

  const parts = location
    .split("•")
    .map((part) => part.trim())
    .filter(Boolean)

  const countyPart = parts.find((part) => /county$/i.test(part))

  if (!countyPart) return undefined

  return countyPart.replace(/\s+county$/i, "").trim() || undefined
}

function findCountyForFollowUpContact(
  contacts: any[],
  contactId: unknown
): string | undefined {
  const normalizedContactId = String(contactId ?? "").trim()

  if (!normalizedContactId) return undefined

  const match = contacts.find(
    (contact) => String(contact?.id ?? "").trim() === normalizedContactId
  )

  return String(match?.county ?? "").trim() || undefined
}

function calculatePriority(
  voteTarget: number,
  contactCoverage: number,
  volunteerCoverage: number
) {

  const coverageScore =
    (contactCoverage * 0.6) +
    (volunteerCoverage * 0.4)

  const needScore =
    1 - coverageScore

  return voteTarget * needScore
}