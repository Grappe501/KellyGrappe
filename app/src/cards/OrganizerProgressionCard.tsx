/**
 * OrganizerProgressionCard.tsx
 *
 * Displays organizer leadership progression.
 *
 * Connected to the Organizer Progression Engine.
 *
 * Shows:
 * - current level
 * - next level
 * - readiness percentage
 * - missing requirements
 * - recommended next actions
 */

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

import {
  getOrganizerProgress,
  type OrganizerProgressResult
} from "@platform/training/organizer.progression.engine"

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
    <div className="border rounded-lg p-3 bg-white shadow-sm">
      <div className="text-xs text-slate-500 uppercase">
        {label}
      </div>

      <div className="text-xl font-bold text-slate-800 mt-1">
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

export default function OrganizerProgressionCard() {

  const [progress, setProgress] =
    useState<OrganizerProgressResult | null>(null)

  const [loading, setLoading] =
    useState<boolean>(true)

  const [error, setError] =
    useState<string | null>(null)

  /* -------------------------------------------------------------------------- */
  /* LOAD PROGRESSION                                                           */
  /* -------------------------------------------------------------------------- */

  async function loadProgress(): Promise<void> {

    setLoading(true)
    setError(null)

    try {

      /**
       * Temporary placeholder user.
       * Later this will come from the identity/session system.
       */

      const userId = "demo-user"

      const result = await getOrganizerProgress(userId)

      setProgress(result)

    } catch (err) {

      console.error("Organizer progression load failed:", err)

      setError("Organizer progression unavailable")

    } finally {

      setLoading(false)

    }
  }

  /* -------------------------------------------------------------------------- */
  /* INITIAL LOAD                                                               */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {

    void loadProgress()

  }, [])

  /* -------------------------------------------------------------------------- */
  /* LOADING STATE                                                              */
  /* -------------------------------------------------------------------------- */

  if (loading) {

    return (
      <Card>

        <CardHeader
          title="Organizer Progression"
          subtitle="Leadership development ladder"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Loading organizer progression…
          </div>

        </CardContent>

      </Card>
    )
  }

  /* -------------------------------------------------------------------------- */
  /* ERROR STATE                                                                */
  /* -------------------------------------------------------------------------- */

  if (error || !progress) {

    return (
      <Card>

        <CardHeader
          title="Organizer Progression"
          subtitle="Leadership development ladder"
        />

        <CardContent>

          <div className="flex items-center justify-between">

            <div className="text-sm text-red-600">
              {error ?? "Progression data unavailable"}
            </div>

            <button
              onClick={() => void loadProgress()}
              className="text-sm text-blue-600 hover:underline"
            >
              Retry
            </button>

          </div>

        </CardContent>

      </Card>
    )
  }

  const { currentLevel, nextLevel } = progress

  /* -------------------------------------------------------------------------- */
  /* MAIN RENDER                                                                */
  /* -------------------------------------------------------------------------- */

  return (
    <Card>

      <CardHeader
        title="Organizer Progression"
        subtitle="Leadership development ladder"
      />

      <CardContent>

        {/* LEVEL SUMMARY */}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">

          <Metric
            label="Current Level"
            value={currentLevel.title}
          />

          <Metric
            label="Next Level"
            value={nextLevel ? nextLevel.title : "Top Level"}
          />

          <Metric
            label="Readiness"
            value={`${progress.readinessPercent}%`}
          />

        </div>

        {/* MISSING REQUIREMENTS */}

        {progress.missingRequirements.length > 0 && (

          <div className="mb-6">

            <div className="text-sm font-semibold text-slate-700 mb-2">
              Remaining Requirements
            </div>

            <ul className="list-disc ml-5 text-sm text-slate-600 space-y-1">

              {progress.missingRequirements.map((item, index) => (

                <li key={index}>
                  {item}
                </li>

              ))}

            </ul>

          </div>

        )}

        {/* RECOMMENDED ACTIONS */}

        {progress.recommendedActions.length > 0 && (

          <div>

            <div className="text-sm font-semibold text-slate-700 mb-2">
              Recommended Next Steps
            </div>

            <ul className="list-disc ml-5 text-sm text-slate-600 space-y-1">

              {progress.recommendedActions.map((item, index) => (

                <li key={index}>
                  {item}
                </li>

              ))}

            </ul>

          </div>

        )}

        {/* REFRESH */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={() => void loadProgress()}
            className="text-sm text-blue-600 hover:underline"
          >
            Refresh
          </button>

        </div>

      </CardContent>

    </Card>
  )
}
