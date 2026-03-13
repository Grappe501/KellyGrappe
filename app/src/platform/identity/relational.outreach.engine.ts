/**
 * relational.outreach.engine.ts
 *
 * Relational Outreach Engine
 *
 * Generates daily organizing plans and manages outreach pipelines.
 *
 * Also handles contacts without voter ID by routing them into
 * registration and onboarding workflows.
 */

import type { CommunityGraph, CivicPersonNode } from "@platform/identity/community.graph.engine"
import { getConnections } from "@platform/identity/community.graph.engine"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type OutreachStatus =
  | "new"
  | "contacted"
  | "follow_up"
  | "recruited"
  | "declined"

export interface OutreachContact {
  personId?: string
  name?: string
  phone?: string
  email?: string

  voterIdMatched?: boolean

  status: OutreachStatus
  lastContact?: string
}

export interface OutreachRecommendation {
  personId: string
  score: number
  reasons: string[]
}

export interface OutreachPlan {
  organizerId: string
  contactsToday: OutreachRecommendation[]
}

export interface ExternalContactCandidate {
  name?: string
  phone?: string
  email?: string
  possibleMatches?: string[]
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function normalize(v: unknown): string | undefined {
  const text = String(v ?? "").trim()
  return text ? text.toLowerCase() : undefined
}

function same(a: unknown, b: unknown): boolean {
  return normalize(a) === normalize(b)
}

function sharedInterests(a?: string[], b?: string[]): number {

  if (!a || !b) return 0

  const set = new Set(a.map(x => normalize(x)))

  let matches = 0

  for (const item of b) {
    if (set.has(normalize(item))) {
      matches++
    }
  }

  return matches
}

/* -------------------------------------------------------------------------- */
/* DAILY OUTREACH PLAN                                                        */
/* -------------------------------------------------------------------------- */

export function generateDailyOutreachPlan(
  graph: CommunityGraph,
  organizerId: string,
  limit = 10
): OutreachPlan {

  const organizer = graph.nodes.find(n => n.id === organizerId)

  if (!organizer) {
    return {
      organizerId,
      contactsToday: []
    }
  }

  const connections = getConnections(graph, organizerId)

  const scored = connections.map(person => {

    let score = 0
    const reasons: string[] = []

    if (same(person.neighborhood, organizer.neighborhood)) {
      score += 30
      reasons.push("same neighborhood")
    }

    if (same(person.precinct, organizer.precinct)) {
      score += 20
      reasons.push("same precinct")
    }

    const shared = sharedInterests(organizer.interests, person.interests)

    if (shared > 0) {
      score += shared * 10
      reasons.push("shared interests")
    }

    score += (person.reputationScore ?? 0) * 0.2
    score += (person.readinessPercent ?? 0) * 0.2

    return {
      personId: person.id,
      score,
      reasons
    }

  })

  return {
    organizerId,
    contactsToday: scored
      .sort((a,b)=>b.score-a.score)
      .slice(0,limit)
  }

}

/* -------------------------------------------------------------------------- */
/* FOLLOWUP TRACKER                                                           */
/* -------------------------------------------------------------------------- */

export function getFollowUpTargets(
  contacts: OutreachContact[]
): OutreachContact[] {

  const now = Date.now()

  return contacts.filter(contact => {

    if (contact.status !== "contacted") return false

    if (!contact.lastContact) return true

    const daysSince =
      (now - new Date(contact.lastContact).getTime()) /
      (1000 * 60 * 60 * 24)

    return daysSince >= 3

  })

}

/* -------------------------------------------------------------------------- */
/* NON VOTER CONTACT HANDLER                                                  */
/* -------------------------------------------------------------------------- */

export function handleUnknownContact(
  name?: string,
  phone?: string,
  email?: string
): ExternalContactCandidate {

  return {
    name,
    phone,
    email,
    possibleMatches: []
  }

}

/* -------------------------------------------------------------------------- */
/* VOTER MATCH ATTEMPT                                                        */
/* -------------------------------------------------------------------------- */

export function attemptVoterMatch(
  graph: CommunityGraph,
  candidate: ExternalContactCandidate
): string[] {

  const matches: string[] = []

  if (!candidate.name) return matches

  const normalizedName = normalize(candidate.name)

  for (const person of graph.nodes) {

    const personName = normalize(person.name)

    if (!personName) continue

    if (personName.includes(normalizedName ?? "")) {
      matches.push(person.id)
    }

  }

  return matches
}

/* -------------------------------------------------------------------------- */
/* REGISTRATION PIPELINE                                                      */
/* -------------------------------------------------------------------------- */

export function buildRegistrationFollowUp(
  candidate: ExternalContactCandidate
) {

  return {
    stage: "registration_needed",
    contact: candidate,
    recommendedActions: [
      "send registration link",
      "invite to civic platform",
      "follow up within 7 days"
    ]
  }

}
