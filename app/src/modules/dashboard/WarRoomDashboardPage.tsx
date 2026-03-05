/* app/src/modules/dashboard/WarRoomDashboardPage.tsx
   Campaign War Room Dashboard
*/

import React, { useEffect, useState } from "react"

import Container from "../../shared/components/Container"
import { Card, CardHeader, CardContent } from "../../shared/components/Card"

import {
  getCampaignDashboardMetrics,
  type CampaignDashboardMetrics
} from "../../shared/utils/db/organizingMetrics.service"

/* ---------------- CONFIG ---------------- */

const DEFAULT_VOTE_GOAL = 45000
const REFRESH_INTERVAL = 10000

/* ---------------- UTIL ---------------- */

function format(n: number | undefined) {
  return (n ?? 0).toLocaleString()
}

/* ---------------- COMPONENT ---------------- */

export default function WarRoomDashboardPage() {

  const [metrics, setMetrics] = useState<CampaignDashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())

  async function load() {

    try {

      setLoading(true)

      const m = await getCampaignDashboardMetrics({
        voteGoal: DEFAULT_VOTE_GOAL
      })

      setMetrics(m)
      setError(null)
      setLastRefresh(Date.now())

    } catch (e: any) {

      setError(e?.message ?? "Failed to load metrics")

    } finally {

      setLoading(false)
    }
  }

  useEffect(() => {

    load()

    const interval = setInterval(load, REFRESH_INTERVAL)

    return () => clearInterval(interval)

  }, [])

  /* ---------------- LOADING ---------------- */

  if (loading && !metrics) {

    return (
      <Container>
        <div className="p-6 text-slate-600 text-sm">
          Loading War Room…
        </div>
      </Container>
    )
  }

  /* ---------------- ERROR ---------------- */

  if (error) {

    return (
      <Container>
        <div className="p-6 text-red-600 text-sm space-y-3">

          <div>{error}</div>

          <button
            onClick={load}
            className="px-4 py-2 text-xs bg-red-600 text-white rounded"
          >
            Retry
          </button>

        </div>
      </Container>
    )
  }

  if (!metrics) return null

  const coverage = metrics.voterCoverage.voteGoalCoveragePct ?? 0

  /* ---------------- RENDER ---------------- */

  return (

    <Container>

      <div className="space-y-6 p-6">

        {/* HEADER */}

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold">
              Campaign War Room
            </h1>

            <p className="text-sm text-slate-600">

              Updated {new Date(lastRefresh).toLocaleTimeString()}

            </p>

          </div>

          <button
            onClick={load}
            className="text-xs px-3 py-2 bg-slate-800 text-white rounded hover:bg-slate-700"
          >
            Refresh
          </button>

        </div>

        {/* GRID */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Vote Goal Coverage */}

          <Card>

            <CardHeader
              title="Vote Goal"
              subtitle="Coverage"
            />

            <CardContent>

              <div className="text-3xl font-bold">
                {coverage}%
              </div>

              <div className="w-full bg-slate-200 rounded mt-3 h-2">

                <div
                  className="bg-green-600 h-2 rounded"
                  style={{ width: `${Math.min(coverage, 100)}%` }}
                />

              </div>

              <div className="text-sm text-slate-600 mt-2">

                {format(metrics.voterCoverage.claimedVoters)}
                {" / "}
                {format(metrics.voterCoverage.voteGoal)}

              </div>

            </CardContent>

          </Card>

          {/* Contacts */}

          <Card>

            <CardHeader
              title="Contacts"
              subtitle="People in System"
            />

            <CardContent>

              <div className="text-3xl font-bold">
                {format(metrics.totals.contacts)}
              </div>

              <div className="text-sm text-slate-600 mt-2">
                Total captured contacts
              </div>

            </CardContent>

          </Card>

          {/* Power of 5 */}

          <Card>

            <CardHeader
              title="Power of 5"
              subtitle="Leaders"
            />

            <CardContent>

              <div className="text-3xl font-bold">
                {metrics.powerOf5.leadersCount}
              </div>

              <div className="text-sm text-slate-600 mt-2">

                Avg team size {metrics.powerOf5.avgDirectTeamSize}

              </div>

            </CardContent>

          </Card>

          {/* Follow Ups */}

          <Card>

            <CardHeader
              title="Follow Ups"
              subtitle="New"
            />

            <CardContent>

              <div className="text-3xl font-bold">
                {metrics.followUps.new}
              </div>

              <div className="text-sm text-slate-600 mt-2">

                {metrics.followUps.inProgress} in progress

              </div>

            </CardContent>

          </Card>

        </div>

        {/* SECOND ROW */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* VOTER MATCH STATUS */}

          <Card>

            <CardHeader
              title="Voter Matching"
              subtitle="Coverage Status"
            />

            <CardContent>

              <div className="space-y-2 text-sm">

                <div>
                  Matched: {format(metrics.voterCoverage.matchedVoters)}
                </div>

                <div>
                  Claimed: {format(metrics.voterCoverage.claimedVoters)}
                </div>

                <div>
                  Needs Registration: {format(metrics.voterCoverage.needsRegistration)}
                </div>

                <div>
                  Unmatched: {format(metrics.voterCoverage.unmatched)}
                </div>

              </div>

            </CardContent>

          </Card>

          {/* FOLLOWUP PIPELINE */}

          <Card>

            <CardHeader
              title="Follow-Up Pipeline"
              subtitle="Status"
            />

            <CardContent>

              <div className="space-y-2 text-sm">

                <div>
                  New: {metrics.followUps.new}
                </div>

                <div>
                  In Progress: {metrics.followUps.inProgress}
                </div>

                <div>
                  Completed: {metrics.followUps.completed}
                </div>

                <div>
                  Archived: {metrics.followUps.archived}
                </div>

              </div>

            </CardContent>

          </Card>

        </div>

      </div>

    </Container>

  )
}