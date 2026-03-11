import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"
import { listLiveFollowUps } from "@services/followups.service"

import type { LiveFollowUp } from "@db/contactsDb.types"

type FollowUpBreakdown = {
  new: number
  inProgress: number
  completed: number
  archived: number
}

type FollowUpBreakdownCardProps = {
  data?: FollowUpBreakdown
}

export default function FollowUpBreakdownCard({
  data,
}: FollowUpBreakdownCardProps) {
  const [breakdown, setBreakdown] = useState<FollowUpBreakdown>(
    data ?? {
      new: 0,
      inProgress: 0,
      completed: 0,
      archived: 0,
    }
  )
  const [loading, setLoading] = useState(data === undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (data) {
      setBreakdown(data)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const rows =
          (await listLiveFollowUps().catch(() => [])) as LiveFollowUp[]

        const nextBreakdown: FollowUpBreakdown = {
          new: rows.filter((f) => f.followUpStatus === "NEW").length,
          inProgress: rows.filter((f) => f.followUpStatus === "IN_PROGRESS").length,
          completed: rows.filter((f) => f.followUpStatus === "COMPLETED").length,
          archived: rows.filter((f) => f.archived === true).length,
        }

        if (!cancelled) {
          setBreakdown(nextBreakdown)
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("FollowUpBreakdownCard failed", err)
          setError(err?.message ?? "Failed to load follow-up breakdown")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [data])

  return (
    <Card>
      <CardHeader
        title="Follow-Up Breakdown"
        subtitle="Status distribution"
      />

      <CardContent>
        {loading ? (
          <div className="text-sm text-slate-500">Loading breakdown...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">New</div>
              <div className="text-xl font-bold">{breakdown.new}</div>
            </div>

            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">In Progress</div>
              <div className="text-xl font-bold">{breakdown.inProgress}</div>
            </div>

            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">Completed</div>
              <div className="text-xl font-bold">{breakdown.completed}</div>
            </div>

            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">Archived</div>
              <div className="text-xl font-bold">{breakdown.archived}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}