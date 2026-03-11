import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"
import { listContacts } from "@services/contacts.service"

type VoteGoalCardProps = {
  coverage?: number
  voteGoal?: number
}

const DEFAULT_VOTE_GOAL = 45000

export default function VoteGoalCard({
  coverage,
  voteGoal = DEFAULT_VOTE_GOAL,
}: VoteGoalCardProps) {
  const [resolvedCoverage, setResolvedCoverage] = useState<number>(coverage ?? 0)
  const [loading, setLoading] = useState(coverage === undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof coverage === "number") {
      setResolvedCoverage(coverage)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const contacts = await listContacts()

        const nextCoverage =
          voteGoal > 0
            ? Math.round((contacts.length / voteGoal) * 100)
            : 0

        if (!cancelled) {
          setResolvedCoverage(nextCoverage)
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("VoteGoalCard failed", err)
          setError(err?.message ?? "Failed to load vote goal")
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
  }, [coverage, voteGoal])

  return (
    <Card>
      <CardHeader
        title="Vote Goal"
        subtitle="Progress toward campaign target"
      />

      <CardContent>
        {loading ? (
          <div className="text-sm text-slate-500">Loading vote goal...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-slate-500">Coverage</div>
                <div className="text-3xl font-bold text-slate-900">
                  {resolvedCoverage}%
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500">Goal</div>
                <div className="text-sm font-semibold text-slate-700">
                  {voteGoal.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="h-3 w-full overflow-hidden rounded bg-slate-200">
              <div
                className="h-3 rounded bg-blue-600"
                style={{ width: `${Math.max(0, Math.min(100, resolvedCoverage))}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}