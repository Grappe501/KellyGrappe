/**
 * AudienceSegmentBuilderCard.tsx
 *
 * Targeting engine for messaging campaigns.
 *
 * Allows organizers to build audiences based on filters like:
 *
 * - County
 * - Volunteer status
 * - Donor status
 * - Issue interests
 * - Engagement activity
 *
 * This card will later connect to:
 *
 * audience.service
 * contacts.service
 * voter.service
 */

import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AudienceFilter = {

  county?: string
  volunteer?: boolean
  donor?: boolean
  issue?: string

}

type AudienceResult = {

  estimatedSize: number
  volunteers: number
  donors: number
  voters: number

}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function AudienceSegmentBuilderCard() {

  const [filters, setFilters] = useState<AudienceFilter>({})

  const [result, setResult] = useState<AudienceResult | null>(null)

  const [loading, setLoading] = useState(false)

  /* ---------------------------------------------------------------------- */
  /* UPDATE FILTER                                                          */
  /* ---------------------------------------------------------------------- */

  function updateFilter(key: keyof AudienceFilter, value: any) {

    setFilters(prev => ({
      ...prev,
      [key]: value
    }))

  }

  /* ---------------------------------------------------------------------- */
  /* BUILD AUDIENCE                                                         */
  /* ---------------------------------------------------------------------- */

  async function buildAudience() {

    setLoading(true)

    try {

      /**
       * In production this will call:
       *
       * audience.service.buildAudience(filters)
       *
       */

      const simulated: AudienceResult = {

        estimatedSize: 14235,
        volunteers: 523,
        donors: 312,
        voters: 13400

      }

      setResult(simulated)

    } catch (err) {

      console.error("Audience builder failed", err)

    }

    setLoading(false)

  }

  useEffect(() => {

    if (!result) return

  }, [result])

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  return (

    <Card>

      <CardHeader
        title="Audience Segment Builder"
        subtitle="Create targeted outreach audiences"
      />

      <CardContent>

        <div className="space-y-4">

          {/* COUNTY FILTER */}

          <FilterField
            label="County"
          >

            <select
              className="border rounded p-2 w-full"
              onChange={(e) =>
                updateFilter("county", e.target.value)
              }
            >

              <option value="">All Counties</option>

              <option>Pulaski</option>
              <option>Benton</option>
              <option>Washington</option>
              <option>Faulkner</option>
              <option>Saline</option>

            </select>

          </FilterField>

          {/* VOLUNTEER FILTER */}

          <FilterField
            label="Volunteer Status"
          >

            <select
              className="border rounded p-2 w-full"
              onChange={(e) =>
                updateFilter(
                  "volunteer",
                  e.target.value === "yes"
                )
              }
            >

              <option value="">All</option>

              <option value="yes">
                Volunteers
              </option>

              <option value="no">
                Non-Volunteers
              </option>

            </select>

          </FilterField>

          {/* DONOR FILTER */}

          <FilterField
            label="Donor Status"
          >

            <select
              className="border rounded p-2 w-full"
              onChange={(e) =>
                updateFilter(
                  "donor",
                  e.target.value === "yes"
                )
              }
            >

              <option value="">All</option>

              <option value="yes">
                Donors
              </option>

              <option value="no">
                Non-Donors
              </option>

            </select>

          </FilterField>

          {/* ISSUE FILTER */}

          <FilterField
            label="Issue Interest"
          >

            <input
              className="border rounded p-2 w-full"
              placeholder="Education, Economy, Healthcare..."
              onChange={(e) =>
                updateFilter("issue", e.target.value)
              }
            />

          </FilterField>

          {/* BUILD BUTTON */}

          <button
            onClick={buildAudience}
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm"
          >
            Build Audience
          </button>

          {/* RESULTS */}

          {loading && (

            <div className="text-sm text-slate-500">
              Building audience…
            </div>

          )}

          {result && !loading && (

            <div className="grid grid-cols-2 gap-3 pt-2">

              <Metric
                label="Estimated Size"
                value={result.estimatedSize}
              />

              <Metric
                label="Volunteers"
                value={result.volunteers}
              />

              <Metric
                label="Donors"
                value={result.donors}
              />

              <Metric
                label="Voters"
                value={result.voters}
              />

            </div>

          )}

        </div>

      </CardContent>

    </Card>

  )

}

/* -------------------------------------------------------------------------- */
/* FILTER FIELD                                                               */
/* -------------------------------------------------------------------------- */

function FilterField({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {

  return (

    <div>

      <div className="text-xs text-slate-500 mb-1">
        {label}
      </div>

      {children}

    </div>

  )

}

/* -------------------------------------------------------------------------- */
/* METRIC                                                                     */
/* -------------------------------------------------------------------------- */

function Metric({
  label,
  value
}: {
  label: string
  value: number
}) {

  return (

    <div className="border rounded p-3">

      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="text-lg font-semibold">
        {value.toLocaleString()}
      </div>

    </div>

  )

}
