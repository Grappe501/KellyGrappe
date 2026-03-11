import React from "react"

import { Card, CardHeader, CardContent } from "@components/Card"

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

type CommandSummaryCardProps = {
  metrics?: DashboardMetrics
}

export default function CommandSummaryCard({
  metrics,
}: CommandSummaryCardProps) {
  const contacts = metrics?.contacts ?? 0
  const newFollowUps = metrics?.followups?.new ?? 0
  const inProgress = metrics?.followups?.inProgress ?? 0
  const completed = metrics?.followups?.completed ?? 0
  const archived = metrics?.followups?.archived ?? 0
  const coverage = metrics?.voteCoverage ?? 0

  const activeFollowUps = newFollowUps + inProgress

  let summaryTone = "Stable"
  let summaryClass = "text-green-600"

  if (activeFollowUps >= 25 || coverage < 25) {
    summaryTone = "Attention Needed"
    summaryClass = "text-amber-600"
  }

  if (activeFollowUps >= 50 || coverage < 10) {
    summaryTone = "Critical"
    summaryClass = "text-red-600"
  }

  return (
    <Card>
      <CardHeader
        title="Command Summary"
        subtitle="Topline campaign operating picture"
      />

      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="text-xs text-slate-500">System Status</div>
              <div className={`text-lg font-bold ${summaryClass}`}>
                {summaryTone}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Vote Coverage</div>
              <div className="text-xl font-bold text-slate-900">
                {coverage}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">Contacts</div>
              <div className="text-2xl font-bold text-slate-900">
                {contacts.toLocaleString()}
              </div>
            </div>

            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">Active Follow-Ups</div>
              <div className="text-2xl font-bold text-slate-900">
                {activeFollowUps.toLocaleString()}
              </div>
            </div>

            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">Completed</div>
              <div className="text-2xl font-bold text-slate-900">
                {completed.toLocaleString()}
              </div>
            </div>

            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">Archived</div>
              <div className="text-2xl font-bold text-slate-900">
                {archived.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="rounded bg-slate-50 p-3 text-xs text-slate-600">
            Prioritize new and in-progress follow-ups first, then keep raising
            vote coverage through additional contact capture and voter matching.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}