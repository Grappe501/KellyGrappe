/**
 * network.visualization.engine.ts
 *
 * Network Visualization Engine
 *
 * Converts civic graph structures into visualization-ready
 * data structures for UI rendering.
 *
 * Supports:
 * - relationship graphs
 * - family-tree style expansion
 * - Power of Five maps
 * - neighborhood cluster views
 * - organizer influence maps
 */

import type {
    CommunityGraph,
    CivicPersonNode,
    CivicRelationshipEdge
  } from "@platform/identity/community.graph.engine"
  
  import { getConnections } from "@platform/identity/community.graph.engine"
  
  /* -------------------------------------------------------------------------- */
  /* TYPES                                                                      */
  /* -------------------------------------------------------------------------- */
  
  export interface VisualizationNode {
    id: string
    label?: string
    group?: string
    score?: number
  }
  
  export interface VisualizationEdge {
    from: string
    to: string
    type?: string
  }
  
  export interface VisualizationGraph {
    nodes: VisualizationNode[]
    edges: VisualizationEdge[]
  }
  
  export interface TreeNode {
    id: string
    label?: string
    children: TreeNode[]
  }
  
  export interface ClusterGroup {
    id: string
    label: string
    members: string[]
  }
  
  /* -------------------------------------------------------------------------- */
  /* GRAPH CONVERSION                                                           */
  /* -------------------------------------------------------------------------- */
  
  export function buildVisualizationGraph(
    graph: CommunityGraph
  ): VisualizationGraph {
  
    const nodes: VisualizationNode[] = graph.nodes.map(person => ({
      id: person.id,
      label: person.name ?? person.id,
      group: person.neighborhood ?? person.city ?? "community",
      score: person.reputationScore ?? 0
    }))
  
    const edges: VisualizationEdge[] = graph.edges.map(edge => ({
      from: edge.from,
      to: edge.to,
      type: edge.type
    }))
  
    return {
      nodes,
      edges
    }
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* TREE VIEW BUILDER                                                          */
  /* -------------------------------------------------------------------------- */
  
  export function buildNetworkTreeVisualization(
    graph: CommunityGraph,
    rootId: string,
    maxDepth = 4
  ): TreeNode {
  
    const visited = new Set<string>()
  
    function explore(personId: string, depth: number): TreeNode {
  
      visited.add(personId)
  
      if (depth >= maxDepth) {
        return {
          id: personId,
          label: personId,
          children: []
        }
      }
  
      const connections = getConnections(graph, personId)
  
      const children = connections
        .filter(c => !visited.has(c.id))
        .map(c => explore(c.id, depth + 1))
  
      return {
        id: personId,
        label: personId,
        children
      }
  
    }
  
    return explore(rootId, 0)
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* POWER OF FIVE VISUALIZATION                                                */
  /* -------------------------------------------------------------------------- */
  
  export function buildPowerOfFiveVisualization(
    graph: CommunityGraph,
    organizerId: string
  ): VisualizationGraph {
  
    const connections = getConnections(graph, organizerId)
  
    const nodes: VisualizationNode[] = [
      { id: organizerId, label: "You", group: "organizer" }
    ]
  
    const edges: VisualizationEdge[] = []
  
    const topFive = connections.slice(0,5)
  
    for (const person of topFive) {
  
      nodes.push({
        id: person.id,
        label: person.name ?? person.id,
        group: "power_of_five"
      })
  
      edges.push({
        from: organizerId,
        to: person.id,
        type: "power_of_five"
      })
  
    }
  
    return {
      nodes,
      edges
    }
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* COMMUNITY CLUSTER VIEW                                                     */
  /* -------------------------------------------------------------------------- */
  
  export function buildCommunityClusters(
    graph: CommunityGraph
  ): ClusterGroup[] {
  
    const clusters: Record<string, string[]> = {}
  
    for (const person of graph.nodes) {
  
      const key =
        person.neighborhood ??
        person.city ??
        person.county ??
        "community"
  
      if (!clusters[key]) {
        clusters[key] = []
      }
  
      clusters[key].push(person.id)
  
    }
  
    return Object.entries(clusters).map(([key, members]) => ({
      id: key,
      label: key,
      members
    }))
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* INFLUENCE MAP                                                              */
  /* -------------------------------------------------------------------------- */
  
  export function buildInfluenceMap(
    graph: CommunityGraph
  ): VisualizationGraph {
  
    const nodes: VisualizationNode[] = graph.nodes.map(person => {
  
      const connections = getConnections(graph, person.id)
  
      const influenceScore =
        connections.length +
        (person.organizerLevel ?? 0) * 3 +
        (person.reputationScore ?? 0) * 0.1
  
      return {
        id: person.id,
        label: person.name ?? person.id,
        score: influenceScore
      }
  
    })
  
    const edges: VisualizationEdge[] = graph.edges.map(edge => ({
      from: edge.from,
      to: edge.to,
      type: edge.type
    }))
  
    return {
      nodes,
      edges
    }
  
  }
  