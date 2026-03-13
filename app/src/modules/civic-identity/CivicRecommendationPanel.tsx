/**
 * CivicRecommendationPanel.tsx
 *
 * Displays AI-powered civic recommendations
 * derived from the Civic Graph Engine.
 *
 * Shows:
 * - people you may want to connect with
 * - organizations near you
 * - civic opportunities
 *
 * This module will eventually connect to:
 * - Civic Graph Engine
 * - Relational Recommendation Engine
 * - Identity Graph
 */

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

import {
  CivicGraph,
  CivicPersonInput,
  buildCivicGraph,
  recommendGraphConnections
} from "@platform/identity/civic.graph.engine"

type RecommendationPerson = {
  id: string
  name: string
}

export default function CivicRecommendationPanel() {

  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<RecommendationPerson[]>([])

  async function loadRecommendations() {

    setLoading(true)

    try {

      /**
       * This is simulated data for now.
       * Later this will come from Supabase.
       */

      const people: CivicPersonInput[] = [
        {
          id: "user-1",
          displayName: "You",
          city: "Little Rock",
          state: "AR",
          interests: ["education", "community safety"],
          organizations: [
            { id: "org-1", name: "Neighborhood Association" }
          ],
          connections: [
            { id: "user-2", name: "Alice" }
          ]
        },

        {
          id: "user-2",
          displayName: "Alice",
          city: "Little Rock",
          state: "AR",
          interests: ["education"]
        },

        {
          id: "user-3",
          displayName: "Marcus",
          city: "Little Rock",
          state: "AR",
          interests: ["community safety"]
        },

        {
          id: "user-4",
          displayName: "Elena",
          city: "Little Rock",
          state: "AR",
          interests: ["housing"]
        },

        {
          id: "user-5",
          displayName: "James",
          city: "Little Rock",
          state: "AR",
          interests: ["education", "housing"]
        }
      ]

      const graph: CivicGraph = buildCivicGraph(people)

      const userNodeId = "person:user-1"

      const suggested = recommendGraphConnections(graph, userNodeId)

      const mapped = suggested.map((node) => ({
        id: node.id,
        name: node.label
      }))

      setRecommendations(mapped)

    } catch (error) {

      console.error("Failed to load civic recommendations", error)

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {
    void loadRecommendations()
  }, [])

  function renderRecommendations() {

    if (loading) {
      return (
        <div className="text-sm text-slate-500">
          Finding people in your civic network…
        </div>
      )
    }

    if (recommendations.length === 0) {
      return (
        <div className="text-sm text-slate-500">
          No recommendations yet.
        </div>
      )
    }

    return (
      <div className="space-y-2">

        {recommendations.map((person) => {

          const displayName = person.name.replace("person:", "")

          return (
            <div
              key={person.id}
              className="flex items-center justify-between border rounded p-2"
            >

              <div className="text-sm font-medium text-slate-700">
                {displayName}
              </div>

              <button className="text-xs text-blue-600">
                Connect
              </button>

            </div>
          )

        })}

      </div>
    )

  }

  return (

    <Card>

      <CardHeader
        title="Civic Network Recommendations"
        subtitle="People and connections near you"
      />

      <CardContent>

        {renderRecommendations()}

      </CardContent>

    </Card>

  )

}
