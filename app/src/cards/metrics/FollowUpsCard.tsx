import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"
import { listLiveFollowUps } from "@services/followups.service"

import type { LiveFollowUp } from "@db/contactsDb.types"

type FollowUpsCardProps = {
  newCount?: number
  inProgress?: number
}

export default function FollowUpsCard({
  newCount,
  inProgress,
}: FollowUpsCardProps) {
  const [counts, setCounts] = useState({
    new: newCount ?? 0,
    inProgress: inProgress ?? 0,
  })
  const [loading, setLoading] = useState(
    newCount === undefined || inProgress === undefined
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (
      typeof newCount === "number" &&
      typeof inProgress === "number"
    ) {
      setCounts({
        new: newCount,
        inProgress,
      })
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

        const nextNew =
          rows.filter((f) => f.followUpStatus === "NEW").length

        const nextInProgress =
          rows.filter((f) => f.followUpStatus === "IN_PROGRESS").length

        if (!cancelled) {
          setCounts({
            new: nextNew,
            inProgress: nextInProgress,
          })
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("FollowUpsCard failed", err)
          setError(err?.message ?? "Failed to load follow-ups")
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
  }, [newCount, inProgress])

  return (
    <Card>
      <CardHeader
        title="Follow Ups"
        subtitle="Current follow-up workload"
      />

      <CardContent>
        {loading ? (
          <div className="text-sm text-slate-500">Loading follow-ups...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">New</div>
              <div className="text-2xl font-bold text-slate-900">
                {counts.new.toLocaleString()}
              </div>
            </div>

            <div className="rounded border p-3">
              <div className="text-xs text-slate-500">In Progress</div>
              <div className="text-2xl font-bold text-slate-900">
                {counts.inProgress.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}