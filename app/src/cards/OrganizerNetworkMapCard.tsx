/**
 * OrganizerNetworkMapCard.tsx
 *
 * Visualizes the relational organizing network for the current user.
 *
 * Displays:
 * - direct team members
 * - second-degree network
 * - connected organizations
 * - geographic footprint
 * - recommended connections
 *
 * This card will evolve into the relational organizing map
 * that powers the community network view.
 */

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

type NetworkNode = {
  id: string
  name: string
  role: string
  organization?: string
}

type NetworkMap = {
  directConnections: NetworkNode[]
  secondDegreeConnections: NetworkNode[]
  organizations: string[]
  geography: string
  recommendedConnections: NetworkNode[]
}

function NodeRow({ node }: { node: NetworkNode }) {
  return (
    <div className="flex justify-between border-b py-1 text-sm">
      <span className="font-medium">{node.name}</span>

      <span className="text-slate-500">
        {node.role}
        {node.organization ? ` • ${node.organization}` : ""}
      </span>
    </div>
  )
}

export default function OrganizerNetworkMapCard() {

  const [network, setNetwork] = useState<NetworkMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadNetwork(): Promise<void> {

    setLoading(true)
    setError(null)

    try {

      /**
       * Temporary simulation.
       * Later this will come from:
       *
       * identity graph
       * organizer assignments
       * geographic membership
       * AI relational engine
       */

      const simulated: NetworkMap = {

        geography: "Precinct 214 • Little Rock",

        organizations: [
          "Neighborhood Association",
          "Community Food Network",
          "Local Education Coalition"
        ],

        directConnections: [
          {
            id: "1",
            name: "Angela Martinez",
            role: "Volunteer",
            organization: "Neighborhood Association"
          },
          {
            id: "2",
            name: "David Chen",
            role: "Team Organizer"
          },
          {
            id: "3",
            name: "Monica Williams",
            role: "Outreach Coordinator"
          }
        ],

        secondDegreeConnections: [
          {
            id: "4",
            name: "Sarah Patel",
            role: "Volunteer"
          },
          {
            id: "5",
            name: "Marcus Johnson",
            role: "Community Advocate"
          }
        ],

        recommendedConnections: [
          {
            id: "6",
            name: "Daniel Kim",
            role: "Education Advocate"
          },
          {
            id: "7",
            name: "Lena Rodriguez",
            role: "Food Security Volunteer"
          }
        ]

      }

      setNetwork(simulated)

    } catch (err) {

      console.error("Network map failed:", err)
      setError("Network map unavailable")

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {
    void loadNetwork()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader
          title="Organizer Network"
          subtitle="Your relational organizing map"
        />

        <CardContent>
          <div className="text-sm text-slate-500">
            Loading community network…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !network) {
    return (
      <Card>
        <CardHeader
          title="Organizer Network"
          subtitle="Your relational organizing map"
        />

        <CardContent>
          <div className="flex justify-between">

            <div className="text-sm text-red-600">
              {error ?? "Network unavailable"}
            </div>

            <button
              onClick={() => void loadNetwork()}
              className="text-sm text-blue-600 hover:underline"
            >
              Retry
            </button>

          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>

      <CardHeader
        title="Organizer Network"
        subtitle={`Community footprint: ${network.geography}`}
      />

      <CardContent>

        {/* Organizations */}

        <div className="mb-4">

          <div className="text-sm font-semibold mb-2">
            Organizations in Your Network
          </div>

          <div className="flex flex-wrap gap-2">

            {network.organizations.map((org) => (
              <span
                key={org}
                className="text-xs bg-slate-100 px-2 py-1 rounded"
              >
                {org}
              </span>
            ))}

          </div>

        </div>

        {/* Direct Connections */}

        <div className="mb-4">

          <div className="text-sm font-semibold mb-2">
            Your Direct Team
          </div>

          {network.directConnections.map((node) => (
            <NodeRow key={node.id} node={node} />
          ))}

        </div>

        {/* Second Degree */}

        <div className="mb-4">

          <div className="text-sm font-semibold mb-2">
            Extended Network
          </div>

          {network.secondDegreeConnections.map((node) => (
            <NodeRow key={node.id} node={node} />
          ))}

        </div>

        {/* Recommended Connections */}

        <div>

          <div className="text-sm font-semibold mb-2">
            Recommended Connections
          </div>

          {network.recommendedConnections.map((node) => (
            <NodeRow key={node.id} node={node} />
          ))}

        </div>

      </CardContent>

    </Card>
  )
}
