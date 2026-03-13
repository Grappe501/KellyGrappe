/**
 * LocalCivicFeedPanel.tsx
 *
 * Displays the civic feed for the user based on geography,
 * organization footprint, and civic relevance.
 *
 * Powered by:
 * Local Civic Feed Engine
 */

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

import {
  buildLocalCivicFeed,
  CivicFeedItem
} from "@platform/identity/local.civic.feed.engine"

import type { GeographicIdentity } from "@platform/identity/community.footprint.engine"

type FeedState = {
  items: CivicFeedItem[]
}

export default function LocalCivicFeedPanel() {

  const [loading, setLoading] = useState(true)
  const [feed, setFeed] = useState<FeedState | null>(null)

  async function loadFeed() {

    setLoading(true)

    try {

      /**
       * Simulated identity
       * Later comes from authenticated user profile
       */

      const identity: GeographicIdentity = {

        neighborhood: "Hillcrest",
        precinct: "101",
        city: "Little Rock",
        county: "Pulaski",
        state: "AR"

      }

      /**
       * Simulated civic feed items
       */

      const items: CivicFeedItem[] = [

        {
          id: "feed-1",
          type: "announcement",
          title: "Hillcrest Neighborhood Meeting",
          body: "Monthly meeting at the community center Thursday night.",
          visibility: "community",
          neighborhood: "Hillcrest",
          scope: "neighborhood",
          createdAt: new Date().toISOString()
        },

        {
          id: "feed-2",
          type: "event",
          title: "Precinct Volunteer Canvassing",
          body: "Join the precinct team Saturday morning.",
          visibility: "community",
          precinct: "101",
          scope: "precinct",
          createdAt: new Date().toISOString()
        },

        {
          id: "feed-3",
          type: "opportunity",
          title: "Little Rock School Supply Drive",
          body: "Volunteers needed to distribute school supplies.",
          visibility: "community",
          city: "Little Rock",
          scope: "city",
          createdAt: new Date().toISOString()
        },

        {
          id: "feed-4",
          type: "alert",
          title: "County Budget Hearing",
          body: "Public comment period open next Tuesday.",
          visibility: "public",
          county: "Pulaski",
          scope: "county",
          createdAt: new Date().toISOString()
        },

        {
          id: "feed-5",
          type: "organization_update",
          title: "Pulaski Civic Alliance Update",
          body: "New community initiatives launching this month.",
          visibility: "public",
          state: "AR",
          scope: "state",
          createdAt: new Date().toISOString()
        }

      ]

      const result = buildLocalCivicFeed(
        identity,
        items,
        [],
        { limit: 50 }
      )

      setFeed({
        items: result.items
      })

    } catch (error) {

      console.error("Failed to load civic feed", error)

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {
    void loadFeed()
  }, [])

  function renderFeedItems() {

    if (!feed) return null

    return feed.items.map((item) => (

      <div
        key={item.id}
        className="border rounded p-3 mb-3"
      >

        <div className="text-sm font-semibold mb-1">
          {item.title}
        </div>

        <div className="text-xs text-slate-500 mb-2">
          {item.type.toUpperCase()} • {item.scope}
        </div>

        <div className="text-sm text-slate-700">
          {item.body}
        </div>

      </div>

    ))

  }

  if (loading) {

    return (

      <Card>

        <CardHeader
          title="Community Feed"
          subtitle="Loading civic updates…"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Building local civic feed…
          </div>

        </CardContent>

      </Card>

    )

  }

  return (

    <Card>

      <CardHeader
        title="Community Feed"
        subtitle="Updates from your civic network"
      />

      <CardContent>

        {renderFeedItems()}

      </CardContent>

    </Card>

  )

}
