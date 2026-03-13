/**
 * geographic.civic.network.engine.ts
 *
 * Geographic Civic Network Engine
 *
 * Purpose:
 * - organize people and organizations into real geographic civic layers
 * - generate network groups for neighborhood / precinct / city / county / state
 * - support localized civic feeds, organizing, recommendations, and access control
 *
 * This engine is intentionally domain-flexible and can later support:
 * - civic networks
 * - church outreach maps
 * - student organizing geographies
 * - business territory models
 */

import type {
    CivicCommunityInput,
    CivicGraph,
    CivicGraphNode,
    CivicPersonInput
  } from "@platform/identity/civic.graph.engine"
  import { buildCivicGraph } from "@platform/identity/civic.graph.engine"
  import type {
    CommunityFootprintDefinition,
    CommunityScope
  } from "@platform/identity/community.footprint.engine"
  import {
    evaluateCommunityMembership
  } from "@platform/identity/community.footprint.engine"
  
  export type GeographicLayerType =
    | "neighborhood"
    | "precinct"
    | "city"
    | "county"
    | "state"
  
  export interface GeographicCommunityGroup {
    id: string
    type: GeographicLayerType
    label: string
  
    neighborhood?: string
    precinct?: string
    city?: string
    county?: string
    state?: string
  
    people: Array<{
      id: string
      displayName: string
    }>
  
    organizations: Array<{
      id: string
      name: string
      entityType?: string
    }>
  }
  
  export interface GeographicRecommendation {
    id: string
    type: "person" | "organization"
    label: string
    reason: string
    layer: GeographicLayerType
    score: number
  }
  
  export interface GeographicNetworkBuildResult {
    graph: CivicGraph
    groups: GeographicCommunityGroup[]
    recommendations: GeographicRecommendation[]
  }
  
  /* -------------------------------------------------------------------------- */
  /* HELPERS                                                                    */
  /* -------------------------------------------------------------------------- */
  
  function normalize(value: unknown): string | undefined {
    const text = String(value ?? "").trim()
    return text ? text.toLowerCase() : undefined
  }
  
  function buildGroupId(type: GeographicLayerType, value: string): string {
    return `${type}:${normalize(value)}`
  }
  
  function uniqueById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>()
    const result: T[] = []
  
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        result.push(item)
      }
    }
  
    return result
  }
  
  function scoreLayer(type: GeographicLayerType): number {
    switch (type) {
      case "neighborhood":
        return 100
      case "precinct":
        return 92
      case "city":
        return 84
      case "county":
        return 76
      case "state":
        return 68
      default:
        return 50
    }
  }
  
  function buildCommunitiesFromPeople(
    people: CivicPersonInput[]
  ): CivicCommunityInput[] {
    const communities: CivicCommunityInput[] = []
  
    for (const person of people) {
      if (person.neighborhood) {
        communities.push({
          id: buildGroupId("neighborhood", person.neighborhood),
          label: person.neighborhood,
          scope: "neighborhood",
          metadata: {
            neighborhood: person.neighborhood,
            city: person.city,
            state: person.state
          }
        })
      }
  
      if (person.precinct) {
        communities.push({
          id: buildGroupId("precinct", person.precinct),
          label: `Precinct ${person.precinct}`,
          scope: "precinct",
          metadata: {
            precinct: person.precinct,
            county: person.county,
            state: person.state
          }
        })
      }
  
      if (person.city) {
        communities.push({
          id: buildGroupId("city", person.city),
          label: person.city,
          scope: "city",
          metadata: {
            city: person.city,
            state: person.state
          }
        })
      }
  
      if (person.county) {
        communities.push({
          id: buildGroupId("county", person.county),
          label: person.county,
          scope: "county",
          metadata: {
            county: person.county,
            state: person.state
          }
        })
      }
  
      if (person.state) {
        communities.push({
          id: buildGroupId("state", person.state),
          label: person.state,
          scope: "state",
          metadata: {
            state: person.state
          }
        })
      }
    }
  
    return uniqueById(communities)
  }
  
  function buildGroups(
    people: CivicPersonInput[],
    footprints: CommunityFootprintDefinition[]
  ): GeographicCommunityGroup[] {
    const groupMap = new Map<string, GeographicCommunityGroup>()
  
    function ensureGroup(
      type: GeographicLayerType,
      value: string,
      person: CivicPersonInput
    ): GeographicCommunityGroup {
      const id = buildGroupId(type, value)
  
      if (!groupMap.has(id)) {
        groupMap.set(id, {
          id,
          type,
          label:
            type === "precinct"
              ? `Precinct ${value}`
              : value,
          neighborhood:
            type === "neighborhood" ? value : undefined,
          precinct:
            type === "precinct" ? value : undefined,
          city:
            type === "city" ? value : person.city,
          county:
            type === "county" ? value : person.county,
          state:
            type === "state" ? value : person.state,
          people: [],
          organizations: []
        })
      }
  
      return groupMap.get(id) as GeographicCommunityGroup
    }
  
    for (const person of people) {
      const personRef = {
        id: person.id,
        displayName: person.displayName
      }
  
      if (person.neighborhood) {
        ensureGroup("neighborhood", person.neighborhood, person).people.push(personRef)
      }
  
      if (person.precinct) {
        ensureGroup("precinct", person.precinct, person).people.push(personRef)
      }
  
      if (person.city) {
        ensureGroup("city", person.city, person).people.push(personRef)
      }
  
      if (person.county) {
        ensureGroup("county", person.county, person).people.push(personRef)
      }
  
      if (person.state) {
        ensureGroup("state", person.state, person).people.push(personRef)
      }
    }
  
    for (const footprint of footprints) {
      for (const person of people) {
        const result = evaluateCommunityMembership(
          {
            neighborhood: person.neighborhood,
            precinct: person.precinct,
            city: person.city,
            county: person.county,
            state: person.state
          },
          footprint
        )
  
        if (!result.isEligible) {
          continue
        }
  
        const value =
          footprint.scope === "neighborhood"
            ? footprint.neighborhood
            : footprint.scope === "precinct"
              ? footprint.precinct
              : footprint.scope === "city"
                ? footprint.city
                : footprint.scope === "county"
                  ? footprint.county
                  : footprint.state
  
        if (!value || footprint.scope === "national") {
          continue
        }
  
        const group = ensureGroup(
          footprint.scope as GeographicLayerType,
          value,
          person
        )
  
        group.organizations.push({
          id: footprint.entityId,
          name: footprint.entityName,
          entityType: footprint.entityType
        })
      }
    }
  
    return Array.from(groupMap.values()).map((group) => ({
      ...group,
      people: uniqueById(group.people),
      organizations: uniqueById(group.organizations)
    }))
  }
  
  function buildRecommendations(
    people: CivicPersonInput[],
    footprints: CommunityFootprintDefinition[],
    currentUserId: string
  ): GeographicRecommendation[] {
    const currentUser = people.find((person) => person.id === currentUserId)
  
    if (!currentUser) {
      return []
    }
  
    const recommendations: GeographicRecommendation[] = []
  
    for (const person of people) {
      if (person.id === currentUserId) {
        continue
      }
  
      let layer: GeographicLayerType | null = null
      let score = 0
      let reason = ""
  
      if (
        currentUser.neighborhood &&
        person.neighborhood &&
        normalize(currentUser.neighborhood) === normalize(person.neighborhood)
      ) {
        layer = "neighborhood"
        score = scoreLayer(layer)
        reason = "Lives in your neighborhood"
      } else if (
        currentUser.precinct &&
        person.precinct &&
        normalize(currentUser.precinct) === normalize(person.precinct)
      ) {
        layer = "precinct"
        score = scoreLayer(layer)
        reason = "Lives in your precinct"
      } else if (
        currentUser.city &&
        person.city &&
        normalize(currentUser.city) === normalize(person.city)
      ) {
        layer = "city"
        score = scoreLayer(layer)
        reason = "Lives in your city"
      } else if (
        currentUser.county &&
        person.county &&
        normalize(currentUser.county) === normalize(person.county)
      ) {
        layer = "county"
        score = scoreLayer(layer)
        reason = "Lives in your county"
      } else if (
        currentUser.state &&
        person.state &&
        normalize(currentUser.state) === normalize(person.state)
      ) {
        layer = "state"
        score = scoreLayer(layer)
        reason = "Lives in your state"
      }
  
      if (layer) {
        recommendations.push({
          id: person.id,
          type: "person",
          label: person.displayName,
          reason,
          layer,
          score
        })
      }
    }
  
    for (const footprint of footprints) {
      const result = evaluateCommunityMembership(
        {
          neighborhood: currentUser.neighborhood,
          precinct: currentUser.precinct,
          city: currentUser.city,
          county: currentUser.county,
          state: currentUser.state
        },
        footprint
      )
  
      if (!result.isEligible || footprint.scope === "national") {
        continue
      }
  
      recommendations.push({
        id: footprint.entityId,
        type: "organization",
        label: footprint.entityName,
        reason: "Organization operates in your area",
        layer: footprint.scope as GeographicLayerType,
        score: scoreLayer(footprint.scope as GeographicLayerType) - 5
      })
    }
  
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
  }
  
  /* -------------------------------------------------------------------------- */
  /* PUBLIC ENGINE                                                              */
  /* -------------------------------------------------------------------------- */
  
  export function buildGeographicCivicNetwork(
    people: CivicPersonInput[],
    footprints: CommunityFootprintDefinition[],
    currentUserId: string
  ): GeographicNetworkBuildResult {
    const communities = buildCommunitiesFromPeople(people)
    const graph = buildCivicGraph(people, communities)
    const groups = buildGroups(people, footprints)
    const recommendations = buildRecommendations(
      people,
      footprints,
      currentUserId
    )
  
    return {
      graph,
      groups,
      recommendations
    }
  }
  
  export function getGroupsForUser(
    groups: GeographicCommunityGroup[],
    userId: string
  ): GeographicCommunityGroup[] {
    return groups.filter((group) =>
      group.people.some((person) => person.id === userId)
    )
  }
  
  export function getOrganizationsForUserGroups(
    groups: GeographicCommunityGroup[],
    userId: string
  ): Array<{
    id: string
    name: string
    entityType?: string
  }> {
    const userGroups = getGroupsForUser(groups, userId)
  
    return uniqueById(
      userGroups.flatMap((group) => group.organizations)
    )
  }
  
  export function getNearbyPeopleForUser(
    groups: GeographicCommunityGroup[],
    userId: string
  ): Array<{
    id: string
    displayName: string
  }> {
    const userGroups = getGroupsForUser(groups, userId)
  
    return uniqueById(
      userGroups.flatMap((group) => group.people)
    ).filter((person) => person.id !== userId)
  }
  
  export function getGroupNodesForLayer(
    graph: CivicGraph,
    layer: GeographicLayerType
  ): CivicGraphNode[] {
    return graph.nodes.filter(
      (node) =>
        node.type === "community" &&
        String(node.metadata?.scope ?? "") === layer
    )
  }
  