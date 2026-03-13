/**
 * TrainingCommandCenterCard.tsx
 *
 * Core operational command card for the Training Circle.
 *
 * Connected to the Training Service Engine.
 *
 * Displays:
 * - active learners
 * - overdue assignments
 * - completions
 * - certifications
 * - follow-up actions
 * - readiness score
 *
 * Future layers:
 * - AI readiness forecasting
 * - cohort analytics
 * - instructor alerts
 * - certification pipeline tracking
 */

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

import {
  getTrainingSummary,
  type TrainingSummary
} from "@platform/training/training.service"

/* -------------------------------------------------------------------------- */
/* METRIC COMPONENT                                                           */
/* -------------------------------------------------------------------------- */

function Metric({
  label,
  value
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">

      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="text-2xl font-bold text-slate-800 mt-1">
        {typeof value === "number"
          ? value.toLocaleString()
          : value}
      </div>

    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function TrainingCommandCenterCard() {

  const [summary, setSummary] =
    useState<TrainingSummary | null>(null)

  const [loading, setLoading] =
    useState<boolean>(true)

  const [error, setError] =
    useState<string | null>(null)

  /* -------------------------------------------------------------------------- */
  /* LOAD SUMMARY                                                               */
  /* -------------------------------------------------------------------------- */

  async function loadSummary(): Promise<void> {

    setLoading(true)
    setError(null)

    try {

      const data = await getTrainingSummary()

      setSummary(data)

    } catch (err) {

      console.error("Training summary load failed:", err)

      setError("Training systems unavailable")

    } finally {

      setLoading(false)

    }

  }

  /* -------------------------------------------------------------------------- */
  /* INITIAL LOAD                                                               */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {

    void loadSummary()

  }, [])

  /* -------------------------------------------------------------------------- */
  /* LOADING STATE                                                              */
  /* -------------------------------------------------------------------------- */

  if (loading) {

    return (
      <Card>

        <CardHeader
          title="Training Command Center"
          subtitle="Learning, certification, and readiness overview"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Loading training systems…
          </div>

        </CardContent>

      </Card>
    )
  }

  /* -------------------------------------------------------------------------- */
  /* ERROR STATE                                                                */
  /* -------------------------------------------------------------------------- */

  if (error || !summary) {

    return (
      <Card>

        <CardHeader
          title="Training Command Center"
          subtitle="Learning, certification, and readiness overview"
        />

        <CardContent>

          <div className="flex items-center justify-between">

            <div className="text-sm text-red-600">
              {error ?? "Training data unavailable"}
            </div>

            <button
              onClick={() => void loadSummary()}
              className="text-sm text-blue-600 hover:underline"
            >
              Retry
            </button>

          </div>

        </CardContent>

      </Card>
    )
  }

  /* -------------------------------------------------------------------------- */
  /* MAIN RENDER                                                                */
  /* -------------------------------------------------------------------------- */

  return (
    <Card>

      <CardHeader
        title="Training Command Center"
        subtitle="Learning, certification, and readiness overview"
      />

      <CardContent>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <Metric
            label="Active Learners"
            value={summary.activeLearners}
          />

          <Metric
            label="Overdue Assignments"
            value={summary.overdueAssignments}
          />

          <Metric
            label="Completions This Week"
            value={summary.completionsThisWeek}
          />

          <Metric
            label="Certifications Issued"
            value={summary.certificationsIssued}
          />

          <Metric
            label="Follow-Ups Due"
            value={summary.followUpsDue}
          />

          <Metric
            label="Readiness Score"
            value={`${summary.readinessScore}%`}
          />

        </div>

        {/* Refresh control */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={() => void loadSummary()}
            className="text-sm text-blue-600 hover:underline"
          >
            Refresh
          </button>

        </div>

      </CardContent>

    </Card>
  )
}
