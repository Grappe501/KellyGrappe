/**
 * CivicOpportunityPanel.tsx
 *
 * Displays personalized civic opportunities for a user.
 * Powered by the Civic Opportunity Engine.
 */

import React, { useEffect, useState } from "react"

import {
  buildCivicOpportunityMatches,
  getLeadershipOpportunities,
  getTrainingOpportunities,
  getUrgentOpportunities,
  type CivicOpportunity,
  type CivicOpportunityMatch
} from "@platform/identity/civic.opportunity.engine"

import type { GeographicIdentity } from "@platform/identity/community.footprint.engine"

import { Card, CardHeader, CardContent } from "@components/Card"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type OpportunityPanelState = {
  loading: boolean
  matches: CivicOpportunityMatch[]
}

/* -------------------------------------------------------------------------- */
/* MOCK DATA (temporary until backend wired)                                  */
/* -------------------------------------------------------------------------- */

const mockIdentity: GeographicIdentity = {
  neighborhood: "Hillcrest",
  precinct: "Pulaski-102",
  city: "Little Rock",
  county: "Pulaski",
  state: "Arkansas"
}

/*
Temporary opportunity dataset
*/

const mockOpportunities: CivicOpportunity[] = [
  {
    id: "1",
    title: "Neighborhood Clean-Up",
    description: "Join your neighbors to clean the park.",
    type: "community_project",
    neighborhood: "Hillcrest",
    scope: "neighborhood",
    tags: ["community", "environment"],
    urgency: 6,
    createdAt: new Date().toISOString()
  },
  {
    id: "2",
    title: "Campaign Volunteer Training",
    description: "Learn door-to-door organizing.",
    type: "training",
    city: "Little Rock",
    scope: "city",
    tags: ["campaign", "organizing"],
    urgency: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: "3",
    title: "Precinct Captain Recruitment",
    description: "Leadership opportunity for your precinct.",
    type: "leadership",
    precinct: "Pulaski-102",
    scope: "precinct",
    tags: ["leadership", "organizing"],
    urgency: 8,
    minimumReadinessPercent: 60,
    createdAt: new Date().toISOString()
  },
  {
    id: "4",
    title: "City Council Public Comment Night",
    description: "Attend and speak about local issues.",
    type: "public_comment",
    city: "Little Rock",
    scope: "city",
    tags: ["policy", "local government"],
    urgency: 7,
    createdAt: new Date().toISOString()
  }
]

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function CivicOpportunityPanel() {

  const [state, setState] = useState<OpportunityPanelState>({
    loading: true,
    matches: []
  })

  useEffect(() => {
    loadOpportunities()
  }, [])

  async function loadOpportunities() {

    try {

      const result = buildCivicOpportunityMatches(
        {
          userId: "demo-user",
          identity: mockIdentity,
          interests: ["community", "organizing", "policy"],
          engagementStyle: "volunteer",
          readinessPercent: 70,
          reputationScore: 75
        },
        mockOpportunities
      )

      setState({
        loading: false,
        matches: result.matches ?? []
      })

    } catch (error) {

      console.error("Opportunity engine failed", error)

      setState({
        loading: false,
        matches: []
      })

    }

  }

  /* ------------------------------------------------ */
  /* Loading state                                    */
  /* ------------------------------------------------ */

  if (state.loading) {

    return (
      <Card>

        <CardHeader
          title="Civic Opportunities"
          subtitle="Loading opportunities near you"
        />

        <CardContent>
          <div className="text-sm text-slate-500">
            Discovering ways you can make an impact…
          </div>
        </CardContent>

      </Card>
    )

  }

  const urgent = getUrgentOpportunities(state.matches)
  const leadership = getLeadershipOpportunities(state.matches)
  const training = getTrainingOpportunities(state.matches)

  return (

    <Card>

      <CardHeader
        title="Civic Opportunities"
        subtitle="Recommended actions based on your community"
      />

      <CardContent>

        <div className="space-y-6">

          <OpportunitySection
            title="Urgent Opportunities"
            opportunities={urgent}
          />

          <OpportunitySection
            title="Leadership Paths"
            opportunities={leadership}
          />

          <OpportunitySection
            title="Training Opportunities"
            opportunities={training}
          />

          <OpportunitySection
            title="All Opportunities"
            opportunities={state.matches}
          />

        </div>

      </CardContent>

    </Card>

  )

}

/* -------------------------------------------------------------------------- */
/* SUB COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

function OpportunitySection({
  title,
  opportunities
}: {
  title: string
  opportunities: CivicOpportunityMatch[]
}) {

  if (!opportunities.length) return null

  return (

    <div>

      <div className="text-sm font-semibold text-slate-700 mb-2">
        {title}
      </div>

      <div className="space-y-2">

        {opportunities.map((match) => (

          <OpportunityItem
            key={match.opportunity.id}
            match={match}
          />

        ))}

      </div>

    </div>

  )

}

function OpportunityItem({
  match
}: {
  match: CivicOpportunityMatch
}) {

  const { opportunity } = match

  return (

    <div className="border rounded p-3 bg-white hover:bg-slate-50 transition">

      <div className="flex justify-between">

        <div className="font-semibold text-slate-800">
          {opportunity.title}
        </div>

        <div className="text-xs text-slate-400">
          score {match.score}
        </div>

      </div>

      <div className="text-sm text-slate-600 mt-1">
        {opportunity.description}
      </div>

      {match.reasons?.length > 0 && (

        <div className="text-xs text-slate-500 mt-2">
          {match.reasons.join(" • ")}
        </div>

      )}

    </div>

  )

}
