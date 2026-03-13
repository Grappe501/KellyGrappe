/**
 * ai.organizer.discovery.engine.ts
 *
 * AI Organizer Discovery Engine
 *
 * Purpose:
 * - identify likely organizers, captains, and local leaders
 * - score people for grassroots leadership potential
 * - support neighborhood, precinct, city, county, and state organizing
 *
 * Uses:
 * - community graph structure
 * - civic identity signals
 * - organizer progression indicators
 * - reputation and readiness
 * - shared-interest density
 *
 * Future integrations:
 * - training completions
 * - volunteer activity
 * - event hosting history
 * - recruitment conversions
 * - moderation / trust systems
 */

import type {
    CivicPersonNode,
    CommunityGraph
  } from "@platform/identity/community.graph.engine"
  import {
    calculateInfluenceScore,
    getConnections,
    getPeopleInSameCommunity
  } from "@platform/identity/community.graph.engine"
  
  export type OrganizerDiscoveryRole =
    | "neighborhood_connector"
    | "precinct_captain"
    | "community_host"
    | "volunteer_recruiter"
    | "organization_builder"
    | "regional_leader"
  
  export interface OrganizerDiscoveryCandidate {
    personId: string
    score: number
    recommendedRole: OrganizerDiscoveryRole
    reasons: string[]
    neighborhood?: string
    precinct?: string
    city?: string
    county?: string
    state?: string
  }
  
  export interface OrganizerDiscoveryOptions {
    scope?: "neighborhood" | "precinct" | "city" | "county" | "state"
    minimumScore?: number
    limit?: number
  }
  
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
  
  function sharedInterests(a?: string[], b?: string[]): number {
    if (!a?.length || !b?.length) return 0
  
    const setA = new Set(a.map((value) => normalize(value)).filter(Boolean))
    let count = 0
  
    for (const item of b) {
      const normalized = normalize(item)
      if (normalized && setA.has(normalized)) {
        count += 1
      }
    }
  
    return count
  }
  
  function getCommunityDensity(
    graph: CommunityGraph,
    person: CivicPersonNode
  ): number {
    return getPeopleInSameCommunity(graph, person).length
  }
  
  function getConnectionDensity(
    graph: CommunityGraph,
    personId: string
  ): number {
    return getConnections(graph, personId).length
  }
  
  function scoreReadiness(person: CivicPersonNode): number {
    return (person.readinessPercent ?? 0) * 0.35
  }
  
  function scoreReputation(person: CivicPersonNode): number {
    return (person.reputationScore ?? 0) * 0.25
  }
  
  function scoreOrganizerLevel(person: CivicPersonNode): number {
    return (person.organizerLevel ?? 0) * 12
  }
  
  function scoreInfluence(graph: CommunityGraph, personId: string): number {
    return calculateInfluenceScore(graph, personId) * 0.5
  }
  
  function scoreSharedInterestLeadership(
    graph: CommunityGraph,
    person: CivicPersonNode
  ): number {
    const nearby = getPeopleInSameCommunity(graph, person)
  
    if (!nearby.length) return 0
  
    let totalShared = 0
  
    for (const other of nearby) {
      totalShared += sharedInterests(person.interests, other.interests)
    }
  
    return totalShared * 3
  }
  
  function scoreCommunityDensity(
    graph: CommunityGraph,
    person: CivicPersonNode
  ): number {
    return getCommunityDensity(graph, person) * 2
  }
  
  function scoreConnectionDensity(
    graph: CommunityGraph,
    personId: string
  ): number {
    return getConnectionDensity(graph, personId) * 4
  }
  
  function inferRecommendedRole(
    person: CivicPersonNode,
    totalScore: number,
    connectionCount: number,
    communityDensity: number
  ): OrganizerDiscoveryRole {
    const organizerLevel = person.organizerLevel ?? 0
    const readiness = person.readinessPercent ?? 0
  
    if (organizerLevel >= 5 || totalScore >= 180) {
      return "regional_leader"
    }
  
    if (organizerLevel >= 4 || (connectionCount >= 12 && readiness >= 70)) {
      return "organization_builder"
    }
  
    if (organizerLevel >= 3 || connectionCount >= 8) {
      return "volunteer_recruiter"
    }
  
    if (communityDensity >= 10 && readiness >= 55) {
      return "community_host"
    }
  
    if (person.precinct && readiness >= 50) {
      return "precinct_captain"
    }
  
    return "neighborhood_connector"
  }
  
  function buildReasons(
    graph: CommunityGraph,
    person: CivicPersonNode,
    totalScore: number
  ): string[] {
    const reasons: string[] = []
  
    const connectionCount = getConnectionDensity(graph, person.id)
    const communityDensity = getCommunityDensity(graph, person)
    const influenceScore = calculateInfluenceScore(graph, person.id)
  
    if (connectionCount >= 8) {
      reasons.push("Strong relationship network")
    } else if (connectionCount >= 4) {
      reasons.push("Growing relationship network")
    }
  
    if ((person.readinessPercent ?? 0) >= 70) {
      reasons.push("High readiness for leadership")
    } else if ((person.readinessPercent ?? 0) >= 50) {
      reasons.push("Emerging leadership readiness")
    }
  
    if ((person.reputationScore ?? 0) >= 70) {
      reasons.push("High trust / reputation signal")
    }
  
    if ((person.organizerLevel ?? 0) >= 3) {
      reasons.push("Advanced organizer progression")
    }
  
    if (communityDensity >= 8) {
      reasons.push("Deep community presence")
    }
  
    if (influenceScore >= 60) {
      reasons.push("High local influence potential")
    }
  
    if ((person.interests?.length ?? 0) >= 3) {
      reasons.push("Broad civic interest profile")
    }
  
    if (totalScore >= 150) {
      reasons.push("Strong organizer candidate")
    }
  
    return reasons
  }
  
  function isInScope(
    person: CivicPersonNode,
    scope: OrganizerDiscoveryOptions["scope"],
    anchor?: CivicPersonNode
  ): boolean {
    if (!scope || !anchor) {
      return true
    }
  
    switch (scope) {
      case "neighborhood":
        return same(person.neighborhood, anchor.neighborhood)
      case "precinct":
        return same(person.precinct, anchor.precinct)
      case "city":
        return same(person.city, anchor.city)
      case "county":
        return same(person.county, anchor.county)
      case "state":
        return same(person.state, anchor.state)
      default:
        return true
    }
  }
  
  export function discoverOrganizerCandidates(
    graph: CommunityGraph,
    anchorPersonId?: string,
    options: OrganizerDiscoveryOptions = {}
  ): OrganizerDiscoveryCandidate[] {
    const anchor = anchorPersonId
      ? graph.nodes.find((node) => node.id === anchorPersonId)
      : undefined
  
    const candidates: OrganizerDiscoveryCandidate[] = []
  
    for (const person of graph.nodes) {
      if (anchorPersonId && person.id === anchorPersonId) {
        continue
      }
  
      if (!isInScope(person, options.scope, anchor)) {
        continue
      }
  
      const connectionDensity = scoreConnectionDensity(graph, person.id)
      const communityDensity = scoreCommunityDensity(graph, person)
      const influence = scoreInfluence(graph, person.id)
      const readiness = scoreReadiness(person)
      const reputation = scoreReputation(person)
      const organizerLevel = scoreOrganizerLevel(person)
      const sharedInterestLeadership = scoreSharedInterestLeadership(graph, person)
  
      const totalScore =
        connectionDensity +
        communityDensity +
        influence +
        readiness +
        reputation +
        organizerLevel +
        sharedInterestLeadership
  
      const minimumScore = options.minimumScore ?? 35
  
      if (totalScore < minimumScore) {
        continue
      }
  
      const connectionCount = getConnectionDensity(graph, person.id)
      const communityCount = getCommunityDensity(graph, person)
  
      const recommendedRole = inferRecommendedRole(
        person,
        totalScore,
        connectionCount,
        communityCount
      )
  
      candidates.push({
        personId: person.id,
        score: Math.round(totalScore),
        recommendedRole,
        reasons: buildReasons(graph, person, totalScore),
        neighborhood: person.neighborhood,
        precinct: person.precinct,
        city: person.city,
        county: person.county,
        state: person.state
      })
    }
  
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit ?? 25)
  }
  
  export function discoverNeighborhoodLeaders(
    graph: CommunityGraph,
    anchorPersonId?: string,
    limit = 10
  ): OrganizerDiscoveryCandidate[] {
    return discoverOrganizerCandidates(graph, anchorPersonId, {
      scope: "neighborhood",
      minimumScore: 30,
      limit
    })
  }
  
  export function discoverPrecinctCaptains(
    graph: CommunityGraph,
    anchorPersonId?: string,
    limit = 10
  ): OrganizerDiscoveryCandidate[] {
    return discoverOrganizerCandidates(graph, anchorPersonId, {
      scope: "precinct",
      minimumScore: 45,
      limit
    }).filter((candidate) =>
      candidate.recommendedRole === "precinct_captain" ||
      candidate.recommendedRole === "community_host" ||
      candidate.recommendedRole === "volunteer_recruiter" ||
      candidate.recommendedRole === "organization_builder" ||
      candidate.recommendedRole === "regional_leader"
    )
  }
  
  export function discoverRegionalLeaders(
    graph: CommunityGraph,
    anchorPersonId?: string,
    limit = 10
  ): OrganizerDiscoveryCandidate[] {
    return discoverOrganizerCandidates(graph, anchorPersonId, {
      scope: "county",
      minimumScore: 75,
      limit
    }).filter((candidate) =>
      candidate.recommendedRole === "organization_builder" ||
      candidate.recommendedRole === "regional_leader"
    )
  }
  