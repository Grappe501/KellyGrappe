/* app/src/modules/dashboard/WarRoomDashboardPage.tsx
   Campaign War Room Dashboard
   Stable build-safe version
*/

import React, { useEffect, useState } from "react"

import Container from "../../shared/components/Container"
import { Card, CardHeader, CardContent } from "../../shared/components/Card"

import { listContacts } from "../../shared/utils/db/services/contacts.service"
import { listLiveFollowUps } from "../../shared/utils/db/services/followups.service"

import type { LiveFollowUp } from "../../shared/utils/db/contactsDb.types"

/* ---------------- TYPES ---------------- */

type CampaignDashboardMetrics = {

  totals: {
    contacts: number
  }

  followUps: {
    new: number
    inProgress: number
    completed: number
    archived: number
  }

  voterCoverage: {
    voteGoal: number
    claimedVoters: number
    matchedVoters: number
    unmatched: number
    needsRegistration: number
    voteGoalCoveragePct: number
  }

  powerOf5: {
    leadersCount: number
    avgDirectTeamSize: number
  }

}

/* ---------------- CONFIG ---------------- */

const DEFAULT_VOTE_GOAL = 45000
const REFRESH_INTERVAL = 10000

/* ---------------- UTIL ---------------- */

function format(n: number | undefined) {
  return (n ?? 0).toLocaleString()
}

/* ---------------- METRICS LOADER ---------------- */

async function loadMetrics(
  voteGoal: number
): Promise<CampaignDashboardMetrics> {

  const contacts = await listContacts().catch(() => [])

  /* FIX: explicit cast so TS doesn't infer unknown[] */
  const followups =
    (await listLiveFollowUps().catch(() => [])) as LiveFollowUp[]

  const newFU =
    followups.filter(f => f.followUpStatus === "NEW").length

  const inProgressFU =
    followups.filter(f => f.followUpStatus === "IN_PROGRESS").length

  const completedFU =
    followups.filter(f => f.followUpStatus === "COMPLETED").length

  const archivedFU =
    followups.filter(f => f.archived === true).length

  const claimedVoters = contacts.length

  const coveragePct =
    voteGoal > 0
      ? Math.round((claimedVoters / voteGoal) * 100)
      : 0

  return {

    totals: {
      contacts: contacts.length
    },

    followUps: {
      new: newFU,
      inProgress: inProgressFU,
      completed: completedFU,
      archived: archivedFU
    },

    voterCoverage: {

      voteGoal,
      claimedVoters,

      matchedVoters: claimedVoters,

      unmatched: 0,

      needsRegistration: 0,

      voteGoalCoveragePct: coveragePct

    },

    powerOf5: {

      leadersCount: 0,
      avgDirectTeamSize: 0

    }

  }

}

/* ---------------- COMPONENT ---------------- */

export default function WarRoomDashboardPage() {

  const [metrics, setMetrics] =
    useState<CampaignDashboardMetrics | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [lastRefresh, setLastRefresh] =
    useState<number>(Date.now())

  async function load() {

    try {

      setLoading(true)

      const m =
        await loadMetrics(DEFAULT_VOTE_GOAL)

      setMetrics(m)

      setError(null)

      setLastRefresh(Date.now())

    } catch (e: any) {

      setError(
        e?.message ?? "Failed to load metrics"
      )

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {

    load()

    const interval =
      setInterval(load, REFRESH_INTERVAL)

    return () =>
      clearInterval(interval)

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

  const coverage =
    metrics.voterCoverage.voteGoalCoveragePct ?? 0

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

          {/* Vote Goal */}

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
                  style={{
                    width: `${Math.min(coverage, 100)}%`
                  }}
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

      </div>

    </Container>

  )

}