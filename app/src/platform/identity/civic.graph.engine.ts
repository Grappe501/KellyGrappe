/**
 * civic.graph.engine.ts
 *
 * Civic Graph Engine
 *
 * Purpose:
 * - build a unified relationship graph across people, organizations,
 *   communities, interests, events, and training
 * - provide edge generation for civic network intelligence
 * - support recommendation, moderation, organizing, and opportunity systems
 *
 * This engine is intentionally platform-level and domain-flexible.
 */

export type CivicGraphNodeType =
  | "person"
  | "organization"
  | "community"
  | "interest"
  | "event"
  | "training_path"

export type CivicGraphEdgeType =
  | "member_of"
  | "belongs_to"
  | "interested_in"
  | "attended"
  | "completed"
  | "connected_to"
  | "recommended_for"
  | "operates_in"

export interface CivicGraphNode {
  id: string
  type: CivicGraphNodeType
  label: string
  metadata?: Record<string, unknown>
}

export interface CivicGraphEdge {
  id: string
  fromId: string
  toId: string
  type: CivicGraphEdgeType
  weight: number
  metadata?: Record<string, unknown>
}

export interface CivicGraph {
  nodes: CivicGraphNode[]
  edges: CivicGraphEdge[]
}

export interface CivicPersonInput {
  id: string
  displayName: string

  neighborhood?: string
  precinct?: string
  city?: string
  county?: string
  state?: string

  organizations?: Array<{
    id: string
    name: string
    role?: string
  }>

  interests?: string[]

  trainingPaths?: Array<{
    id: string
    title: string
    completed?: boolean
  }>

  events?: Array<{
    id: string
    title: string
    attended?: boolean
  }>

  connections?: Array<{
    id: string
    name?: string
    strength?: number
  }>
}

export interface CivicCommunityInput {
  id: string
  label: string
  scope: "neighborhood" | "precinct" | "city" | "county" | "state"
  metadata?: Record<string, unknown>
}

function uniqueNodeId(type: CivicGraphNodeType, id: string): string {
  return `${type}:${id}`
}

function uniqueEdgeId(
  fromId: string,
  toId: string,
  type: CivicGraphEdgeType
): string {
  return `${fromId}::${type}::${toId}`
}

function addNode(
  map: Map<string, CivicGraphNode>,
  node: CivicGraphNode
): void {
  if (!map.has(node.id)) {
    map.set(node.id, node)
  }
}

function addEdge(
  map: Map<string, CivicGraphEdge>,
  edge: CivicGraphEdge
): void {
  if (!map.has(edge.id)) {
    map.set(edge.id, edge)
  }
}

function buildCommunityNodes(person: CivicPersonInput): CivicGraphNode[] {
  const nodes: CivicGraphNode[] = []

  if (person.neighborhood) {
    nodes.push({
      id: uniqueNodeId("community", `neighborhood:${person.neighborhood}`),
      type: "community",
      label: person.neighborhood,
      metadata: { scope: "neighborhood" }
    })
  }

  if (person.precinct) {
    nodes.push({
      id: uniqueNodeId("community", `precinct:${person.precinct}`),
      type: "community",
      label: `Precinct ${person.precinct}`,
      metadata: { scope: "precinct" }
    })
  }

  if (person.city) {
    nodes.push({
      id: uniqueNodeId("community", `city:${person.city}`),
      type: "community",
      label: person.city,
      metadata: { scope: "city" }
    })
  }

  if (person.county) {
    nodes.push({
      id: uniqueNodeId("community", `county:${person.county}`),
      type: "community",
      label: person.county,
      metadata: { scope: "county" }
    })
  }

  if (person.state) {
    nodes.push({
      id: uniqueNodeId("community", `state:${person.state}`),
      type: "community",
      label: person.state,
      metadata: { scope: "state" }
    })
  }

  return nodes
}

function buildCommunityEdges(
  personNodeId: string,
  person: CivicPersonInput
): CivicGraphEdge[] {
  const edges: CivicGraphEdge[] = []

  const communityKeys: Array<{
    scope: string
    value?: string
    weight: number
  }> = [
    { scope: "neighborhood", value: person.neighborhood, weight: 1 },
    { scope: "precinct", value: person.precinct, weight: 0.95 },
    { scope: "city", value: person.city, weight: 0.9 },
    { scope: "county", value: person.county, weight: 0.85 },
    { scope: "state", value: person.state, weight: 0.8 }
  ]

  for (const item of communityKeys) {
    if (!item.value) continue

    const communityNodeId = uniqueNodeId(
      "community",
      `${item.scope}:${item.value}`
    )

    edges.push({
      id: uniqueEdgeId(personNodeId, communityNodeId, "belongs_to"),
      fromId: personNodeId,
      toId: communityNodeId,
      type: "belongs_to",
      weight: item.weight,
      metadata: { scope: item.scope }
    })
  }

  return edges
}

export function buildCivicGraph(
  people: CivicPersonInput[],
  communities: CivicCommunityInput[] = []
): CivicGraph {
  const nodeMap = new Map<string, CivicGraphNode>()
  const edgeMap = new Map<string, CivicGraphEdge>()

  for (const community of communities) {
    addNode(nodeMap, {
      id: uniqueNodeId("community", community.id),
      type: "community",
      label: community.label,
      metadata: {
        scope: community.scope,
        ...(community.metadata ?? {})
      }
    })
  }

  for (const person of people) {
    const personNodeId = uniqueNodeId("person", person.id)

    addNode(nodeMap, {
      id: personNodeId,
      type: "person",
      label: person.displayName,
      metadata: {
        neighborhood: person.neighborhood,
        precinct: person.precinct,
        city: person.city,
        county: person.county,
        state: person.state
      }
    })

    for (const node of buildCommunityNodes(person)) {
      addNode(nodeMap, node)
    }

    for (const edge of buildCommunityEdges(personNodeId, person)) {
      addEdge(edgeMap, edge)
    }

    for (const organization of person.organizations ?? []) {
      const organizationNodeId = uniqueNodeId("organization", organization.id)

      addNode(nodeMap, {
        id: organizationNodeId,
        type: "organization",
        label: organization.name,
        metadata: {
          role: organization.role
        }
      })

      addEdge(edgeMap, {
        id: uniqueEdgeId(personNodeId, organizationNodeId, "member_of"),
        fromId: personNodeId,
        toId: organizationNodeId,
        type: "member_of",
        weight: 0.95,
        metadata: {
          role: organization.role
        }
      })
    }

    for (const interest of person.interests ?? []) {
      const interestNodeId = uniqueNodeId("interest", interest)

      addNode(nodeMap, {
        id: interestNodeId,
        type: "interest",
        label: interest
      })

      addEdge(edgeMap, {
        id: uniqueEdgeId(personNodeId, interestNodeId, "interested_in"),
        fromId: personNodeId,
        toId: interestNodeId,
        type: "interested_in",
        weight: 0.75
      })
    }

    for (const path of person.trainingPaths ?? []) {
      const trainingNodeId = uniqueNodeId("training_path", path.id)

      addNode(nodeMap, {
        id: trainingNodeId,
        type: "training_path",
        label: path.title,
        metadata: {
          completed: path.completed ?? false
        }
      })

      addEdge(edgeMap, {
        id: uniqueEdgeId(personNodeId, trainingNodeId, "completed"),
        fromId: personNodeId,
        toId: trainingNodeId,
        type: "completed",
        weight: path.completed ? 0.9 : 0.45,
        metadata: {
          completed: path.completed ?? false
        }
      })
    }

    for (const event of person.events ?? []) {
      const eventNodeId = uniqueNodeId("event", event.id)

      addNode(nodeMap, {
        id: eventNodeId,
        type: "event",
        label: event.title,
        metadata: {
          attended: event.attended ?? false
        }
      })

      addEdge(edgeMap, {
        id: uniqueEdgeId(personNodeId, eventNodeId, "attended"),
        fromId: personNodeId,
        toId: eventNodeId,
        type: "attended",
        weight: event.attended ? 0.8 : 0.3,
        metadata: {
          attended: event.attended ?? false
        }
      })
    }

    for (const connection of person.connections ?? []) {
      const connectionNodeId = uniqueNodeId("person", connection.id)

      addNode(nodeMap, {
        id: connectionNodeId,
        type: "person",
        label: connection.name ?? connection.id
      })

      addEdge(edgeMap, {
        id: uniqueEdgeId(personNodeId, connectionNodeId, "connected_to"),
        fromId: personNodeId,
        toId: connectionNodeId,
        type: "connected_to",
        weight: connection.strength ?? 0.7
      })
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values())
  }
}

export function getConnectedNodes(
  graph: CivicGraph,
  nodeId: string
): CivicGraphNode[] {
  const connectedIds = new Set<string>()

  for (const edge of graph.edges) {
    if (edge.fromId === nodeId) {
      connectedIds.add(edge.toId)
    } else if (edge.toId === nodeId) {
      connectedIds.add(edge.fromId)
    }
  }

  return graph.nodes.filter((node) => connectedIds.has(node.id))
}

export function getGraphEdgesForNode(
  graph: CivicGraph,
  nodeId: string
): CivicGraphEdge[] {
  return graph.edges.filter(
    (edge) => edge.fromId === nodeId || edge.toId === nodeId
  )
}

export function scoreRelationshipStrength(
  graph: CivicGraph,
  leftNodeId: string,
  rightNodeId: string
): number {
  const directEdge = graph.edges.find(
    (edge) =>
      (edge.fromId === leftNodeId && edge.toId === rightNodeId) ||
      (edge.fromId === rightNodeId && edge.toId === leftNodeId)
  )

  if (directEdge) {
    return directEdge.weight
  }

  const leftConnections = new Set(
    getConnectedNodes(graph, leftNodeId).map((node) => node.id)
  )

  const rightConnections = new Set(
    getConnectedNodes(graph, rightNodeId).map((node) => node.id)
  )

  let sharedCount = 0

  for (const id of leftConnections) {
    if (rightConnections.has(id)) {
      sharedCount += 1
    }
  }

  if (sharedCount === 0) {
    return 0
  }

  return Math.min(0.2 + sharedCount * 0.1, 0.75)
}

export function recommendGraphConnections(
  graph: CivicGraph,
  personNodeId: string,
  limit = 10
): CivicGraphNode[] {
  const connectedIds = new Set(
    getConnectedNodes(graph, personNodeId).map((node) => node.id)
  )

  const candidates = graph.nodes
    .filter((node) => node.type === "person")
    .filter((node) => node.id !== personNodeId)
    .filter((node) => !connectedIds.has(node.id))
    .map((node) => ({
      node,
      score: scoreRelationshipStrength(graph, personNodeId, node.id)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return candidates.map((item) => item.node)
}
