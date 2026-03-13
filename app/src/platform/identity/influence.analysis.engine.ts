/**
 * influence.analysis.engine.ts
 *
 * Influence Analysis Engine
 *
 * Purpose:
 * - identify high-influence individuals
 * - detect bridge connectors between communities
 * - surface hidden local leaders
 * - estimate message amplification potential
 *
 * Works on top of:
 * - Community Graph
 * - Organizer Discovery
 * - Grassroots Growth
 */

import type {
    CommunityGraph,
    CivicPersonNode
  } from "@platform/identity/community.graph.engine"
  
  import { getConnections } from "@platform/identity/community.graph.engine"
  
  /* -------------------------------------------------------------------------- */
  /* TYPES                                                                      */
  /* -------------------------------------------------------------------------- */
  
  export interface InfluenceProfile {
    personId: string
    influenceScore: number
    connectionCount: number
    bridgeScore: number
    reputationWeight: number
    organizerWeight: number
    reasons: string[]
  }
  
  export interface CommunityBridge {
    personId: string
    connectsGroups: string[]
    bridgeScore: number
  }
  
  export interface AmplificationEstimate {
    personId: string
    immediateReach: number
    networkReachEstimate: number
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
  
  /* -------------------------------------------------------------------------- */
  /* INFLUENCE SCORE                                                            */
  /* -------------------------------------------------------------------------- */
  
  export function calculateInfluenceProfiles(
    graph: CommunityGraph
  ): InfluenceProfile[] {
  
    const profiles: InfluenceProfile[] = []
  
    for (const person of graph.nodes) {
  
      const connections = getConnections(graph, person.id)
  
      const connectionCount = connections.length
  
      const reputationWeight = (person.reputationScore ?? 0) * 0.5
      const organizerWeight = (person.organizerLevel ?? 0) * 10
  
      const bridgeScore = calculateBridgeScore(graph, person)
  
      const influenceScore =
        connectionCount * 10 +
        reputationWeight +
        organizerWeight +
        bridgeScore
  
      const reasons: string[] = []
  
      if (connectionCount >= 10) reasons.push("large personal network")
      if (bridgeScore >= 20) reasons.push("connects multiple communities")
      if ((person.reputationScore ?? 0) >= 70) reasons.push("trusted voice")
      if ((person.organizerLevel ?? 0) >= 3) reasons.push("experienced organizer")
  
      profiles.push({
        personId: person.id,
        influenceScore,
        connectionCount,
        bridgeScore,
        reputationWeight,
        organizerWeight,
        reasons
      })
  
    }
  
    return profiles.sort((a,b)=>b.influenceScore-a.influenceScore)
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* BRIDGE DETECTION                                                           */
  /* -------------------------------------------------------------------------- */
  
  export function calculateBridgeScore(
    graph: CommunityGraph,
    person: CivicPersonNode
  ): number {
  
    const connections = getConnections(graph, person.id)
  
    const groups = new Set<string>()
  
    for (const c of connections) {
  
      if (c.neighborhood) groups.add(c.neighborhood)
      else if (c.city) groups.add(c.city)
      else if (c.county) groups.add(c.county)
  
    }
  
    return groups.size * 10
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* COMMUNITY BRIDGE IDENTIFICATION                                            */
  /* -------------------------------------------------------------------------- */
  
  export function identifyCommunityBridges(
    graph: CommunityGraph
  ): CommunityBridge[] {
  
    const bridges: CommunityBridge[] = []
  
    for (const person of graph.nodes) {
  
      const connections = getConnections(graph, person.id)
  
      const groups = new Set<string>()
  
      for (const c of connections) {
  
        if (c.neighborhood) groups.add(c.neighborhood)
        else if (c.city) groups.add(c.city)
  
      }
  
      if (groups.size >= 2) {
  
        bridges.push({
          personId: person.id,
          connectsGroups: Array.from(groups),
          bridgeScore: groups.size * 10
        })
  
      }
  
    }
  
    return bridges.sort((a,b)=>b.bridgeScore-a.bridgeScore)
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* MESSAGE AMPLIFICATION                                                      */
  /* -------------------------------------------------------------------------- */
  
  export function estimateAmplification(
    graph: CommunityGraph,
    personId: string,
    depth = 3
  ): AmplificationEstimate {
  
    const visited = new Set<string>()
  
    function explore(id: string, level: number): number {
  
      if (level > depth) return 0
  
      visited.add(id)
  
      const connections = getConnections(graph, id)
  
      let count = connections.length
  
      for (const c of connections) {
  
        if (!visited.has(c.id)) {
          count += explore(c.id, level + 1)
        }
  
      }
  
      return count
  
    }
  
    const immediateConnections = getConnections(graph, personId)
  
    const reach = explore(personId,1)
  
    return {
      personId,
      immediateReach: immediateConnections.length,
      networkReachEstimate: reach
    }
  
  }
  