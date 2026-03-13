/**
 * OrganizerDiscoveryPanel.tsx
 *
 * Displays AI-discovered organizers and leadership candidates.
 */

import React, { useEffect, useState } from "react"

import {
  discoverNeighborhoodLeaders,
  discoverPrecinctCaptains,
  discoverRegionalLeaders,
  type OrganizerDiscoveryCandidate
} from "@platform/identity/ai.organizer.discovery.engine"

import type {
  CommunityGraph,
  CivicPersonNode
} from "@platform/identity/community.graph.engine"

import { Card, CardHeader, CardContent } from "@components/Card"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type OrganizerDiscoveryState = {
  loading: boolean
  neighborhood: OrganizerDiscoveryCandidate[]
  precinct: OrganizerDiscoveryCandidate[]
  regional: OrganizerDiscoveryCandidate[]
}

/* -------------------------------------------------------------------------- */
/* MOCK GRAPH (temporary until backend wired)                                 */
/* -------------------------------------------------------------------------- */

const mockPeople: CivicPersonNode[] = [
  {
    id: "1",
    name: "Alex Johnson",
    neighborhood: "Hillcrest",
    precinct: "Pulaski-102",
    city: "Little Rock",
    reputationScore: 78,
    organizerLevel: 2,
    readinessPercent: 60,
    interests: ["community", "environment"]
  },
  {
    id: "2",
    name: "Maria Lopez",
    neighborhood: "Hillcrest",
    precinct: "Pulaski-102",
    city: "Little Rock",
    reputationScore: 85,
    organizerLevel: 4,
    readinessPercent: 75,
    interests: ["organizing", "education"]
  },
  {
    id: "3",
    name: "Derek Smith",
    neighborhood: "Hillcrest",
    precinct: "Pulaski-102",
    city: "Little Rock",
    reputationScore: 65,
    organizerLevel: 3,
    readinessPercent: 68,
    interests: ["community", "policy"]
  },
  {
    id: "4",
    name: "Angela Brooks",
    city: "Little Rock",
    reputationScore: 82,
    organizerLevel: 5,
    readinessPercent: 82,
    interests: ["leadership", "policy"]
  }
]

const mockGraph: CommunityGraph = {
  nodes: mockPeople,
  edges: [
    { from: "1", to: "2", type: "neighbor" },
    { from: "1", to: "3", type: "neighbor" },
    { from: "2", to: "3", type: "organizer_connection" },
    { from: "2", to: "4", type: "organizer_connection" }
  ]
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function OrganizerDiscoveryPanel() {
  const [state, setState] = useState<OrganizerDiscoveryState>({
    loading: true,
    neighborhood: [],
    precinct: [],
    regional: []
  })

  useEffect(() => {
    loadDiscovery()
  }, [])

  async function loadDiscovery() {
    try {
      const neighborhood = discoverNeighborhoodLeaders(mockGraph, "1")
      const precinct = discoverPrecinctCaptains(mockGraph, "1")
      const regional = discoverRegionalLeaders(mockGraph, "1")

      setState({
        loading: false,
        neighborhood,
        precinct,
        regional
      })
    } catch (error) {
      console.error("Organizer discovery failed", error)
    }
  }

  if (state.loading) {
    return (
      <Card>
        <CardHeader
          title="Organizer Discovery"
          subtitle="Scanning community network"
        />
        <CardContent>
          <div className="text-sm text-slate-500">
            Discovering emerging community leaders…
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Organizer Discovery"
        subtitle="AI identified leadership candidates"
      />

      <CardContent>

        <DiscoverySection
          title="Neighborhood Leaders"
          candidates={state.neighborhood}
        />

        <DiscoverySection
          title="Precinct Captain Candidates"
          candidates={state.precinct}
        />

        <DiscoverySection
          title="Regional Leaders"
          candidates={state.regional}
        />

      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* SUB COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

function DiscoverySection({
  title,
  candidates
}: {
  title: string
  candidates: OrganizerDiscoveryCandidate[]
}) {

  if (!candidates.length) return null

  return (
    <div className="mb-6">

      <div className="text-sm font-semibold text-slate-700 mb-2">
        {title}
      </div>

      <div className="space-y-2">

        {candidates.map(candidate => (
          <CandidateCard
            key={candidate.personId}
            candidate={candidate}
          />
        ))}

      </div>

    </div>
  )
}

function CandidateCard({
  candidate
}: {
  candidate: OrganizerDiscoveryCandidate
}) {

  return (
    <div className="border rounded p-3 bg-white hover:bg-slate-50 transition">

      <div className="flex justify-between">

        <div className="font-semibold text-slate-800">
          {candidate.personId}
        </div>

        <div className="text-xs text-slate-400">
          score {candidate.score}
        </div>

      </div>

      <div className="text-xs text-slate-500 mt-1">
        Suggested role: {candidate.recommendedRole}
      </div>

      {candidate.reasons.length > 0 && (
        <div className="text-xs text-slate-400 mt-2">
          {candidate.reasons.join(" • ")}
        </div>
      )}

    </div>
  )
}
