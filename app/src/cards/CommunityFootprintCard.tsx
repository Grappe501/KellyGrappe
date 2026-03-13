/**
 * CommunityFootprintCard.tsx
 *
 * Displays the geographic civic footprint for the current user.
 *
 * Shows:
 * - neighborhood / precinct / city identity
 * - organizations active in the footprint
 * - AI recommended organizations
 *
 * This card is the UI entry point for the Civic Network layer.
 */

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

type CivicOrganization = {
  id: string
  name: string
  type: string
  scope: string
}

type CommunityIdentity = {
  neighborhood?: string
  precinct?: string
  city?: string
  county?: string
  state?: string
}

type CommunityFootprintView = {
  identity: CommunityIdentity
  organizations: CivicOrganization[]
  recommended: CivicOrganization[]
}

function OrgRow({ org }: { org: CivicOrganization }) {
  return (
    <div className="flex justify-between border-b py-1 text-sm">

      <span className="font-medium">
        {org.name}
      </span>

      <span className="text-slate-500">
        {org.type} • {org.scope}
      </span>

    </div>
  )
}

export default function CommunityFootprintCard() {

  const [data, setData] = useState<CommunityFootprintView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadCommunity(): Promise<void> {

    setLoading(true)
    setError(null)

    try {

      /**
       * Temporary simulation.
       * Later replaced by:
       * identity service + community footprint engine
       */

      const simulated: CommunityFootprintView = {

        identity: {
          neighborhood: "Hillcrest",
          precinct: "214",
          city: "Little Rock",
          county: "Pulaski",
          state: "Arkansas"
        },

        organizations: [
          {
            id: "1",
            name: "Hillcrest Neighborhood Association",
            type: "Community Group",
            scope: "Neighborhood"
          },
          {
            id: "2",
            name: "Pulaski Education Coalition",
            type: "Nonprofit",
            scope: "County"
          },
          {
            id: "3",
            name: "Central Arkansas Civic Forum",
            type: "Community Organization",
            scope: "City"
          }
        ],

        recommended: [
          {
            id: "4",
            name: "Arkansas Education Reform Network",
            type: "Issue Coalition",
            scope: "State"
          },
          {
            id: "5",
            name: "Neighborhood Food Security Initiative",
            type: "Volunteer Network",
            scope: "City"
          }
        ]

      }

      setData(simulated)

    } catch (err) {

      console.error("Community footprint load failed:", err)

      setError("Community network unavailable")

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {
    void loadCommunity()
  }, [])

  if (loading) {
    return (
      <Card>

        <CardHeader
          title="Community Footprint"
          subtitle="Your civic geography and organizations"
        />

        <CardContent>
          <div className="text-sm text-slate-500">
            Loading community footprint…
          </div>
        </CardContent>

      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>

        <CardHeader
          title="Community Footprint"
          subtitle="Your civic geography and organizations"
        />

        <CardContent>

          <div className="flex justify-between">

            <div className="text-sm text-red-600">
              {error ?? "Community data unavailable"}
            </div>

            <button
              onClick={() => void loadCommunity()}
              className="text-sm text-blue-600 hover:underline"
            >
              Retry
            </button>

          </div>

        </CardContent>

      </Card>
    )
  }

  const { identity, organizations, recommended } = data

  return (
    <Card>

      <CardHeader
        title="Community Footprint"
        subtitle={`${identity.city}, ${identity.state}`}
      />

      <CardContent>

        {/* Geographic Identity */}

        <div className="mb-4">

          <div className="text-sm font-semibold mb-2">
            Your Civic Identity
          </div>

          <div className="text-sm text-slate-600 space-y-1">

            {identity.neighborhood && (
              <div>Neighborhood: {identity.neighborhood}</div>
            )}

            {identity.precinct && (
              <div>Precinct: {identity.precinct}</div>
            )}

            <div>City: {identity.city}</div>
            <div>County: {identity.county}</div>
            <div>State: {identity.state}</div>

          </div>

        </div>

        {/* Organizations in Footprint */}

        <div className="mb-4">

          <div className="text-sm font-semibold mb-2">
            Organizations in Your Area
          </div>

          {organizations.map((org) => (
            <OrgRow key={org.id} org={org} />
          ))}

        </div>

        {/* AI Recommendations */}

        <div>

          <div className="text-sm font-semibold mb-2">
            Recommended Organizations
          </div>

          {recommended.map((org) => (
            <OrgRow key={org.id} org={org} />
          ))}

        </div>

      </CardContent>

    </Card>
  )
}
