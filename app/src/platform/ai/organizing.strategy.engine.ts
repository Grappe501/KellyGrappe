/**
 * organizing.strategy.engine.ts
 *
 * AI Organizing Strategy Engine
 *
 * Uses civic intelligence engines to generate
 * strategic organizing recommendations.
 */

import type { CommunityGraph } from "@platform/identity/community.graph.engine"

import {
  calculateInfluenceProfiles
} from "@platform/identity/influence.analysis.engine"

import {
  discoverNeighborhoodLeaders
} from "@platform/identity/ai.organizer.discovery.engine"

import {
  identifyRecruitmentTargets
} from "@platform/identity/grassroots.growth.engine"

import {
  identifyCommunityBridges
} from "@platform/identity/influence.analysis.engine"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface OrganizingRecommendation {

  type:
    | "activate_leader"
    | "recruit_connector"
    | "expand_network"
    | "strengthen_neighborhood"
    | "bridge_communities"

  targetId?: string
  location?: string

  priority: number
  reason: string

}

export interface OrganizingStrategyReport {

  recommendations: OrganizingRecommendation[]

}

/* -------------------------------------------------------------------------- */
/* STRATEGY GENERATOR                                                         */
/* -------------------------------------------------------------------------- */

export function generateOrganizingStrategy(
  graph: CommunityGraph,
  anchorOrganizerId: string
): OrganizingStrategyReport {

  const recommendations: OrganizingRecommendation[] = []

  /* ---------------------------------------------------------------------- */
  /* HIGH INFLUENCE LEADERS                                                 */
  /* ---------------------------------------------------------------------- */

  const influenceProfiles = calculateInfluenceProfiles(graph)

  const topInfluencers = influenceProfiles.slice(0,5)

  for (const influencer of topInfluencers) {

    recommendations.push({

      type: "activate_leader",

      targetId: influencer.personId,

      priority: influencer.influenceScore,

      reason: "High influence individual with large network reach"

    })

  }

  /* ---------------------------------------------------------------------- */
  /* NEIGHBORHOOD LEADERS                                                   */
  /* ---------------------------------------------------------------------- */

  const neighborhoodLeaders =
    discoverNeighborhoodLeaders(graph, anchorOrganizerId)

  for (const leader of neighborhoodLeaders.slice(0,3)) {

    recommendations.push({

      type: "strengthen_neighborhood",

      targetId: leader.personId,

      priority: leader.score,

      reason: "Strong local organizer candidate"

    })

  }

  /* ---------------------------------------------------------------------- */
  /* BRIDGE CONNECTORS                                                      */
  /* ---------------------------------------------------------------------- */

  const bridges = identifyCommunityBridges(graph)

  for (const bridge of bridges.slice(0,3)) {

    recommendations.push({

      type: "bridge_communities",

      targetId: bridge.personId,

      priority: bridge.bridgeScore,

      reason: "Connects multiple communities"

    })

  }

  /* ---------------------------------------------------------------------- */
  /* RECRUITMENT TARGETS                                                    */
  /* ---------------------------------------------------------------------- */

  const recruitmentTargets =
    identifyRecruitmentTargets(graph, anchorOrganizerId)

  for (const recruit of recruitmentTargets.slice(0,5)) {

    recommendations.push({

      type: "recruit_connector",

      targetId: recruit.personId,

      priority: recruit.score,

      reason: recruit.reasons.join(", ")

    })

  }

  return {

    recommendations:
      recommendations.sort((a,b)=>b.priority-a.priority)

  }

}
