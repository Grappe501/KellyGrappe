/**
 * grassroots.growth.engine.ts
 *
 * Grassroots Growth Engine
 *
 * Purpose:
 * - build relational organizing plans
 * - support Power of Five strategy
 * - generate recruitment trees
 * - allow deep network exploration
 * - model exponential community growth
 *
 * This engine connects:
 * - voter identity records
 * - personal relationships
 * - community graph
 * - organizer progression
 */

import type {
    CommunityGraph,
    CivicPersonNode
  } from "@platform/identity/community.graph.engine"
  
  import {
    getConnections
  } from "@platform/identity/community.graph.engine"
  
  /* -------------------------------------------------------------------------- */
  /* TYPES                                                                      */
  /* -------------------------------------------------------------------------- */
  
  export interface GrowthContactRecommendation {
    personId: string
    score: number
    reasons: string[]
  }
  
  export interface PowerOfFivePlan {
    organizerId: string
    recommendedCoreTeam: GrowthContactRecommendation[]
  }
  
  export interface NetworkTreeNode {
    personId: string
    depth: number
    children: NetworkTreeNode[]
  }
  
  export interface RecruitmentOpportunity {
    personId: string
    score: number
    reasons: string[]
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
  
    const setA = new Set(a.map(x => normalize(x)))
  
    let matches = 0
  
    for (const item of b) {
      if (setA.has(normalize(item))) {
        matches++
      }
    }
  
    return matches
  }
  
  /* -------------------------------------------------------------------------- */
  /* POWER OF FIVE BUILDER                                                      */
  /* -------------------------------------------------------------------------- */
  
  export function buildPowerOfFivePlan(
    graph: CommunityGraph,
    organizerId: string,
    limit = 5
  ): PowerOfFivePlan {
  
    const organizer = graph.nodes.find(n => n.id === organizerId)
  
    if (!organizer) {
      return {
        organizerId,
        recommendedCoreTeam: []
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
      score += (person.organizerLevel ?? 0) * 5
  
      return {
        personId: person.id,
        score,
        reasons
      }
  
    })
  
    return {
      organizerId,
      recommendedCoreTeam: scored
        .sort((a,b)=>b.score-a.score)
        .slice(0,limit)
    }
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* NETWORK TREE BUILDER                                                       */
  /* -------------------------------------------------------------------------- */
  
  export function buildNetworkTree(
    graph: CommunityGraph,
    rootId: string,
    maxDepth = 4
  ): NetworkTreeNode {
  
    const visited = new Set<string>()
  
    function explore(personId: string, depth: number): NetworkTreeNode {
  
      visited.add(personId)
  
      if (depth >= maxDepth) {
        return {
          personId,
          depth,
          children: []
        }
      }
  
      const connections = getConnections(graph, personId)
  
      const children = connections
        .filter(c => !visited.has(c.id))
        .map(c => explore(c.id, depth + 1))
  
      return {
        personId,
        depth,
        children
      }
  
    }
  
    return explore(rootId,0)
  }
  
  /* -------------------------------------------------------------------------- */
  /* RECRUITMENT OPPORTUNITIES                                                  */
  /* -------------------------------------------------------------------------- */
  
  export function identifyRecruitmentTargets(
    graph: CommunityGraph,
    organizerId: string,
    limit = 20
  ): RecruitmentOpportunity[] {
  
    const organizer = graph.nodes.find(n=>n.id===organizerId)
  
    if (!organizer) return []
  
    const connections = getConnections(graph, organizerId)
  
    const opportunities: RecruitmentOpportunity[] = []
  
    for (const person of graph.nodes) {
  
      if (person.id === organizerId) continue
  
      const alreadyConnected = connections.find(c=>c.id===person.id)
  
      if (alreadyConnected) continue
  
      let score = 0
      const reasons: string[] = []
  
      if (same(person.neighborhood, organizer.neighborhood)) {
        score += 40
        reasons.push("same neighborhood")
      }
  
      if (same(person.precinct, organizer.precinct)) {
        score += 30
        reasons.push("same precinct")
      }
  
      const shared = sharedInterests(organizer.interests, person.interests)
  
      if (shared > 0) {
        score += shared * 10
        reasons.push("shared interests")
      }
  
      score += (person.readinessPercent ?? 0) * 0.2
      score += (person.reputationScore ?? 0) * 0.2
  
      if (score > 0) {
  
        opportunities.push({
          personId: person.id,
          score,
          reasons
        })
  
      }
  
    }
  
    return opportunities
      .sort((a,b)=>b.score-a.score)
      .slice(0,limit)
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* NETWORK SIZE ESTIMATOR                                                     */
  /* -------------------------------------------------------------------------- */
  
  export function estimateNetworkReach(
    graph: CommunityGraph,
    rootId: string,
    depth = 3
  ): number {
  
    const tree = buildNetworkTree(graph, rootId, depth)
  
    let count = 0
  
    function traverse(node: NetworkTreeNode) {
      count++
      node.children.forEach(traverse)
    }
  
    traverse(tree)
  
    return count
  }
  