/* app/src/modules/dashboard/WarRoomDashboardPage.tsx
   War Room Command Console
*/

import React, { useEffect, useState, useRef } from "react"

import Container from "@components/Container"

import CommandSearchCard from "@cards/command/CommandSearchCard"
import VoteGoalCard from "@cards/metrics/VoteGoalCard"
import ContactsCard from "@cards/metrics/ContactsCard"
import FollowUpsCard from "@cards/metrics/FollowUpsCard"
import PowerOf5Card from "@cards/metrics/PowerOf5Card"
import FollowUpBreakdownCard from "@cards/metrics/FollowUpBreakdownCard"
import MessagingCenterCard from "@cards/messaging/MessagingCenterCard"
import CommandSummaryCard from "@cards/command/CommandSummaryCard"

import CivicNetworkMap from "@modules/civic-identity/CivicNetworkMap"
import CivicOpportunityPanel from "@modules/civic-identity/CivicOpportunityPanel"
import GeographicCommunityExplorer from "@modules/civic-identity/GeographicCommunityExplorer"

import { listContacts } from "@services/contacts.service"
import { listLiveFollowUps } from "@services/followups.service"

import type { LiveFollowUp } from "@db/contactsDb.types"

/* ---------------- CONFIG ---------------- */

const DEFAULT_VOTE_GOAL = 45000
const REFRESH_INTERVAL = 10000

/* ---------------- TYPES ---------------- */

type DashboardMetrics = {
  contacts: number

  followups: {
    new: number
    inProgress: number
    completed: number
    archived: number
  }

  voteCoverage: number
}

/* ---------------- METRIC LOADER ---------------- */

async function loadMetrics(): Promise<DashboardMetrics> {
  const contacts = await listContacts().catch(() => [])

  const followups =
    (await listLiveFollowUps().catch(() => [])) as LiveFollowUp[]

  const newFU =
    followups.filter((f) => f.followUpStatus === "NEW").length

  const inProgressFU =
    followups.filter((f) => f.followUpStatus === "IN_PROGRESS").length

  const completedFU =
    followups.filter((f) => f.followUpStatus === "COMPLETED").length

  const archivedFU =
    followups.filter((f) => f.archived === true).length

  const coverage =
    Math.round((contacts.length / DEFAULT_VOTE_GOAL) * 100)

  return {
    contacts: contacts.length,

    followups: {
      new: newFU,
      inProgress: inProgressFU,
      completed: completedFU,
      archived: archivedFU
    },

    voteCoverage: coverage
  }
}

/* ---------------- DEMO NETWORK GRAPH ---------------- */

const demoGraph = {
  nodes: [
    { id: "you", name: "You", reputationScore: 80, organizerLevel: 3 },
    { id: "alice", name: "Alice", reputationScore: 40 },
    { id: "marcus", name: "Marcus", reputationScore: 55 },
    { id: "elena", name: "Elena", reputationScore: 20 }
  ],
  edges: [
    { from: "you", to: "alice" },
    { from: "you", to: "marcus" },
    { from: "alice", to: "elena" }
  ]
}

/* ---------------- PAGE ---------------- */

export default function WarRoomDashboardPage() {
  const [metrics, setMetrics] =
    useState<DashboardMetrics | null>(null)

  const [lastRefresh, setLastRefresh] =
    useState<number>(Date.now())

  const mounted = useRef(true)

  async function refresh() {
    try {
      const m = await loadMetrics()

      if (!mounted.current) return

      setMetrics(m)
      setLastRefresh(Date.now())
    } catch (err) {
      console.error("War room refresh failed", err)
    }
  }

  useEffect(() => {
    mounted.current = true

    void refresh()

    const interval =
      setInterval(() => {
        void refresh()
      }, REFRESH_INTERVAL)

    return () => {
      mounted.current = false
      clearInterval(interval)
    }
  }, [])

  if (!metrics) {
    return (
      <Container>
        <div className="p-6 text-sm text-slate-600">
          Loading War Room...
        </div>
      </Container>
    )
  }

  return (
    <Container>

      <div className="space-y-8 p-6">

        {/* ---------------- HEADER ---------------- */}

        <div className="flex items-center justify-between">

          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Campaign War Room
            </h1>

            <p className="text-sm text-slate-500">
              Updated {new Date(lastRefresh).toLocaleTimeString()}
            </p>
          </div>

          <button
            onClick={() => void refresh()}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded"
          >
            Refresh
          </button>

        </div>

        {/* ---------------- COMMAND SEARCH ---------------- */}

        <CommandSearchCard />

        {/* ---------------- METRICS ---------------- */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

          <VoteGoalCard
            coverage={metrics.voteCoverage}
          />

          <ContactsCard
            contacts={metrics.contacts}
          />

          <FollowUpsCard
            newCount={metrics.followups.new}
            inProgress={metrics.followups.inProgress}
          />

          <PowerOf5Card />

        </div>

        {/* ---------------- ANALYTICS ---------------- */}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          <FollowUpBreakdownCard
            data={metrics.followups}
          />

          <CommandSummaryCard
            metrics={metrics}
          />

        </div>

        {/* ---------------- MESSAGING ---------------- */}

        <MessagingCenterCard />

        {/* ---------------- CIVIC INTELLIGENCE ---------------- */}

        <div className="space-y-6 pt-6">

          <h2 className="text-xl font-semibold text-slate-900">
            Civic Intelligence
          </h2>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            <CivicNetworkMap graph={demoGraph as any} />

            <CivicOpportunityPanel />

          </div>

          <GeographicCommunityExplorer />

        </div>

      </div>

    </Container>
  )
}
