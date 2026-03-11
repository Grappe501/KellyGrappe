/* app/src/modules/dashboard/WarRoomDashboardPage.tsx
   War Room Command Console
*/

import React, { useEffect, useState } from "react"

import Container from "@components/Container"

import CommandSearchCard from "@cards/command/CommandSearchCard"
import VoteGoalCard from "@cards/metrics/VoteGoalCard"
import ContactsCard from "@cards/metrics/ContactsCard"
import FollowUpsCard from "@cards/metrics/FollowUpsCard"
import PowerOf5Card from "@cards/metrics/PowerOf5Card"
import FollowUpBreakdownCard from "@cards/metrics/FollowUpBreakdownCard"
import MessagingCenterCard from "@cards/messaging/MessagingCenterCard"
import CommandSummaryCard from "@cards/command/CommandSummaryCard"

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

/* ---------------- PAGE ---------------- */

export default function WarRoomDashboardPage() {
  const [metrics, setMetrics] =
    useState<DashboardMetrics | null>(null)

  const [lastRefresh, setLastRefresh] =
    useState<number>(Date.now())

  async function refresh() {
    const m = await loadMetrics()

    setMetrics(m)
    setLastRefresh(Date.now())
  }

  useEffect(() => {
    void refresh()

    const interval =
      setInterval(() => {
        void refresh()
      }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
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

        <CommandSearchCard />

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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <FollowUpBreakdownCard
            data={metrics.followups}
          />

          <CommandSummaryCard
            metrics={metrics}
          />
        </div>

        <MessagingCenterCard />
      </div>
    </Container>
  )
}