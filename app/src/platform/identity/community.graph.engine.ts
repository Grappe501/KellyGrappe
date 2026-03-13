/**
 * community.graph.engine.ts
 *
 * Community Graph Engine
 *
 * Models relationships, influence, and civic connections
 * within geographic communities.
 *
 * Used for:
 * - organizer discovery
 * - relationship recommendations
 * - influence detection
 * - leadership identification
 * - community clustering
 */

export type CivicRelationshipType =
  | "neighbor"
  | "friend"
  | "coworker"
  | "family"
  | "organization_member"
  | "organizer_connection"
  | "volunteer_connection"

export interface CivicPersonNode {
  id: string
  name?: string

  neighborhood?: string
  precinct?: string
  city?: string
  county?: string
  state?: string

  reputationScore?: number
  organizerLevel?: number
  readinessPercent?: number

  interests?: string[]
}

export interface CivicRelationshipEdge {
  from: string
  to: string
  type: CivicRelationshipType
  weight?: number
}

export interface CommunityGraph {
  nodes: CivicPersonNode[]
  edges: CivicRelationshipEdge[]
}

export interface CivicConnectionRecommendation {
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

  const set = new Set(a.map((x) => normalize(x)))

  let matches = 0

  for (const item of b) {
    if (set.has(normalize(item))) matches++
  }

  return matches
}

/* -------------------------------------------------------------------------- */
/* GRAPH BUILDING                                                             */
/* -------------------------------------------------------------------------- */

export function buildCommunityGraph(
  people: CivicPersonNode[],
  relationships: CivicRelationshipEdge[]
): CommunityGraph {
  return {
    nodes: people,
    edges: relationships
  }
}

/* -------------------------------------------------------------------------- */
/* RELATIONSHIP LOOKUPS                                                       */
/* -------------------------------------------------------------------------- */

export function getConnections(
  graph: CommunityGraph,
  personId: string
): CivicPersonNode[] {

  const connections = new Set<string>()

  for (const edge of graph.edges) {
    if (edge.from === personId) connections.add(edge.to)
    if (edge.to === personId) connections.add(edge.from)
  }

  return graph.nodes.filter((node) => connections.has(node.id))
}

/* -------------------------------------------------------------------------- */
/* COMMUNITY CLUSTERING                                                       */
/* -------------------------------------------------------------------------- */

export function getPeopleInSameCommunity(
  graph: CommunityGraph,
  person: CivicPersonNode
): CivicPersonNode[] {

  return graph.nodes.filter((node) => {

    if (node.id === person.id) return false

    if (person.neighborhood && same(person.neighborhood, node.neighborhood)) {
      return true
    }

    if (person.precinct && same(person.precinct, node.precinct)) {
      return true
    }

    if (person.city && same(person.city, node.city)) {
      return true
    }

    if (person.county && same(person.county, node.county)) {
      return true
    }

    return false
  })
}

/* -------------------------------------------------------------------------- */
/* INFLUENCE DETECTION                                                        */
/* -------------------------------------------------------------------------- */

export function calculateInfluenceScore(
  graph: CommunityGraph,
  personId: string
): number {

  const connections = getConnections(graph, personId)

  let influence = connections.length * 10

  const node = graph.nodes.find((n) => n.id === personId)

  if (!node) return influence

  influence += node.reputationScore ?? 0
  influence += (node.organizerLevel ?? 0) * 5

  return influence
}

/* -------------------------------------------------------------------------- */
/* CONNECTION RECOMMENDATIONS                                                 */
/* -------------------------------------------------------------------------- */

export function recommendConnections(
  graph: CommunityGraph,
  personId: string,
  limit = 10
): CivicConnectionRecommendation[] {

  const person = graph.nodes.find((n) => n.id === personId)

  if (!person) return []

  const existingConnections = new Set(
    getConnections(graph, personId).map((n) => n.id)
  )

  const candidates = graph.nodes.filter(
    (node) => node.id !== personId && !existingConnections.has(node.id)
  )

  const recommendations: CivicConnectionRecommendation[] = []

  for (const candidate of candidates) {

    let score = 0
    const reasons: string[] = []

    /* geographic match */

    if (same(person.neighborhood, candidate.neighborhood)) {
      score += 30
      reasons.push("same neighborhood")
    }

    else if (same(person.precinct, candidate.precinct)) {
      score += 20
      reasons.push("same precinct")
    }

    else if (same(person.city, candidate.city)) {
      score += 10
      reasons.push("same city")
    }

    /* shared interests */

    const interestMatches = sharedInterests(person.interests, candidate.interests)

    if (interestMatches > 0) {
      score += interestMatches * 10
      reasons.push("shared interests")
    }

    /* organizer level bonus */

    score += (candidate.organizerLevel ?? 0) * 2

    /* reputation signal */

    score += (candidate.reputationScore ?? 0) * 0.2

    if (score > 0) {
      recommendations.push({
        personId: candidate.id,
        score,
        reasons
      })
    }
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
