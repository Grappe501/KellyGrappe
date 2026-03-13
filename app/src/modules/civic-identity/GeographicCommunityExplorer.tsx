/**
 * GeographicCommunityExplorer.tsx
 *
 * UI module for exploring the civic network by geography.
 */

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

import {
  buildGeographicCivicNetwork,
  GeographicCommunityGroup,
  GeographicRecommendation
} from "@platform/identity/geographic.civic.network.engine"

import type { CivicPersonInput } from "@platform/identity/civic.graph.engine"
import type { CommunityFootprintDefinition } from "@platform/identity/community.footprint.engine"

type NetworkState = {
  groups: GeographicCommunityGroup[]
  recommendations: GeographicRecommendation[]
}

export default function GeographicCommunityExplorer() {

  const [loading, setLoading] = useState(true)
  const [network, setNetwork] = useState<NetworkState | null>(null)

  async function loadNetwork() {

    setLoading(true)

    try {

      /* ------------------------------------------------ */
      /* Simulated people                                 */
      /* ------------------------------------------------ */

      const people: CivicPersonInput[] = [

        {
          id: "user-1",
          displayName: "You",
          neighborhood: "Hillcrest",
          precinct: "101",
          city: "Little Rock",
          county: "Pulaski",
          state: "AR"
        },

        {
          id: "user-2",
          displayName: "Alice",
          neighborhood: "Hillcrest",
          precinct: "101",
          city: "Little Rock",
          county: "Pulaski",
          state: "AR"
        },

        {
          id: "user-3",
          displayName: "Marcus",
          precinct: "101",
          city: "Little Rock",
          county: "Pulaski",
          state: "AR"
        },

        {
          id: "user-4",
          displayName: "Elena",
          city: "Little Rock",
          county: "Pulaski",
          state: "AR"
        }

      ]

      /* ------------------------------------------------ */
      /* Simulated organization footprints                */
      /* ------------------------------------------------ */

      const footprints: CommunityFootprintDefinition[] = [

        {
          id: "footprint-1",
          entityId: "org-1",
          entityName: "Hillcrest Neighborhood Association",
          entityType: "community_group",
          scope: "neighborhood",
          neighborhood: "Hillcrest"
        },

        {
          id: "footprint-2",
          entityId: "org-2",
          entityName: "Little Rock Education Coalition",
          entityType: "nonprofit",
          scope: "city",
          city: "Little Rock"
        },

        {
          id: "footprint-3",
          entityId: "org-3",
          entityName: "Pulaski County Civic Alliance",
          entityType: "nonprofit",
          scope: "county",
          county: "Pulaski"
        }

      ]

      const result = buildGeographicCivicNetwork(
        people,
        footprints,
        "user-1"
      )

      setNetwork({
        groups: result.groups,
        recommendations: result.recommendations
      })

    } catch (error) {

      console.error("Failed to load geographic civic network", error)

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {
    void loadNetwork()
  }, [])

  function renderGroups() {

    if (!network) return null

    return network.groups.map((group) => (

      <div
        key={group.id}
        className="border rounded p-3 mb-3"
      >

        <div className="font-semibold text-sm mb-2">
          {group.label} ({group.type})
        </div>

        <div className="text-xs text-slate-500 mb-2">
          {group.people.length} people • {group.organizations.length} organizations
        </div>

        {group.people.length > 0 && (
          <div className="mb-2">

            <div className="text-xs font-medium text-slate-600">
              People
            </div>

            {group.people.map((person) => (
              <div key={person.id} className="text-sm">
                {person.displayName}
              </div>
            ))}

          </div>
        )}

        {group.organizations.length > 0 && (
          <div>

            <div className="text-xs font-medium text-slate-600">
              Organizations
            </div>

            {group.organizations.map((org) => (
              <div key={org.id} className="text-sm">
                {org.name}
              </div>
            ))}

          </div>
        )}

      </div>

    ))

  }

  function renderRecommendations() {

    if (!network) return null

    return network.recommendations.map((rec) => (

      <div
        key={rec.id}
        className="border rounded p-2 mb-2 flex justify-between"
      >

        <div>

          <div className="text-sm font-medium">
            {rec.label}
          </div>

          <div className="text-xs text-slate-500">
            {rec.reason}
          </div>

        </div>

        <div className="text-xs text-blue-600">
          Connect
        </div>

      </div>

    ))

  }

  if (loading) {
    return (
      <Card>

        <CardHeader
          title="Community Network"
          subtitle="Loading civic network…"
        />

        <CardContent>
          <div className="text-sm text-slate-500">
            Building geographic network…
          </div>
        </CardContent>

      </Card>
    )
  }

  return (

    <Card>

      <CardHeader
        title="Community Network"
        subtitle="Explore your civic network"
      />

      <CardContent>

        <div className="mb-4">

          <div className="text-sm font-semibold mb-2">
            Your Geographic Communities
          </div>

          {renderGroups()}

        </div>

        <div>

          <div className="text-sm font-semibold mb-2">
            Recommended Connections
          </div>

          {renderRecommendations()}

        </div>

      </CardContent>

    </Card>

  )

}
