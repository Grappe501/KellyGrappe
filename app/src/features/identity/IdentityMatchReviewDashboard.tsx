/**
 * IdentityMatchReviewDashboard.tsx
 *
 * Human review interface for identity graph matches.
 *
 * Allows operators to:
 * - review identity match suggestions
 * - approve merges
 * - reject merges
 * - inspect identity fragments
 */

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

import {
  resolveIdentityGraph
} from "@shared/identity/identity-resolution.service"

import type {
  IdentityMatchResult,
  IdentityProfile
} from "@platform/identity/identity.graph.engine"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type MatchDecision = "approve" | "reject" | "pending"

interface ReviewMatch extends IdentityMatchResult {
  decision?: MatchDecision
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function IdentityMatchReviewDashboard() {

  const [profiles, setProfiles] = useState<IdentityProfile[]>([])
  const [matches, setMatches] = useState<ReviewMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "high" | "review">("all")

  /* ---------------------------------------------------------------------- */
  /* LOAD GRAPH                                                             */
  /* ---------------------------------------------------------------------- */

  async function loadGraph() {

    setLoading(true)

    try {

      const result = await resolveIdentityGraph({
        includeContacts: true,
        includeIngestionEntities: true
      })

      if (!result.ok || !result.graph) {
        throw new Error(result.error || "Graph build failed")
      }

      setProfiles(result.graph.profiles)

      const reviewMatches: ReviewMatch[] =
        result.graph.matches.map((m) => ({
          ...m,
          decision: "pending"
        }))

      setMatches(reviewMatches)

    } catch (err) {

      console.error("Identity graph load failed", err)

    }

    setLoading(false)

  }

  useEffect(() => {

    loadGraph()

  }, [])

  /* ---------------------------------------------------------------------- */
  /* DECISION HANDLING                                                      */
  /* ---------------------------------------------------------------------- */

  function updateDecision(
    index: number,
    decision: MatchDecision
  ) {

    setMatches((prev) => {

      const copy = [...prev]

      copy[index] = {
        ...copy[index],
        decision
      }

      return copy

    })

  }

  /* ---------------------------------------------------------------------- */
  /* FILTERING                                                              */
  /* ---------------------------------------------------------------------- */

  const visibleMatches = matches.filter((match) => {

    if (filter === "all") return true

    if (filter === "high") {
      return match.confidence >= 0.75
    }

    if (filter === "review") {
      return match.confidence >= 0.5 && match.confidence < 0.75
    }

    return true

  })

  /* ---------------------------------------------------------------------- */
  /* LOADING                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {

    return (

      <Card>

        <CardHeader
          title="Identity Match Review"
          subtitle="Loading identity graph analysis"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Building identity graph…
          </div>

        </CardContent>

      </Card>

    )

  }

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  return (

    <div className="space-y-6">

      {/* HEADER */}

      <Card>

        <CardHeader
          title="Identity Match Review"
          subtitle="Approve or reject identity merges detected by the graph engine"
        />

        <CardContent>

          <div className="flex flex-wrap items-center gap-2">

            <select
              className="border rounded px-3 py-2 text-sm"
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as any)
              }
            >

              <option value="all">All Matches</option>
              <option value="high">High Confidence</option>
              <option value="review">Needs Review</option>

            </select>

            <button
              className="border rounded px-3 py-2 text-sm"
              onClick={loadGraph}
            >
              Refresh Graph
            </button>

          </div>

          <div className="mt-4 text-sm text-slate-600">

            Profiles detected: <strong>{profiles.length}</strong>

            <br />

            Matches detected: <strong>{matches.length}</strong>

          </div>

        </CardContent>

      </Card>

      {/* MATCH LIST */}

      {visibleMatches.map((match, index) => {

        return (

          <Card key={index}>

            <CardContent>

              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">

                {/* MATCH DETAILS */}

                <div className="space-y-2">

                  <div className="flex items-center gap-2">

                    <div className="text-sm font-semibold">

                      {match.leftSourceRecordId}

                      {"  ↔  "}

                      {match.rightSourceRecordId}

                    </div>

                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        match.confidence >= 0.75
                          ? "bg-green-100 text-green-800"
                          : match.confidence >= 0.5
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {Math.round(match.confidence * 100)}% match
                    </span>

                  </div>

                  <div className="text-xs text-slate-600">

                    Reasons:

                    <ul className="list-disc ml-4">

                      {match.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}

                    </ul>

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="flex flex-col gap-2 min-w-[160px]">

                  <button
                    className="bg-green-600 text-white rounded px-3 py-2 text-sm hover:bg-green-700"
                    onClick={() => updateDecision(index, "approve")}
                  >
                    Approve Merge
                  </button>

                  <button
                    className="bg-red-600 text-white rounded px-3 py-2 text-sm hover:bg-red-700"
                    onClick={() => updateDecision(index, "reject")}
                  >
                    Reject
                  </button>

                  <div className="text-xs text-slate-500">

                    Decision:

                    {" "}

                    {match.decision ?? "pending"}

                  </div>

                </div>

              </div>

            </CardContent>

          </Card>

        )

      })}

    </div>

  )

}
