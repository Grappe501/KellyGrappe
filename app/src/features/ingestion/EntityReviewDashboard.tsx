/**
 * EntityReviewDashboard.tsx
 *
 * AI extraction review dashboard for CivicOS ingestion pipeline.
 *
 * Reviewers approve/reject/edit AI-detected entities before they
 * are committed into the core civic identity graph.
 *
 * Features
 * - entity review workflow
 * - approval/rejection
 * - review summary metrics
 * - filtering
 * - error handling
 * - optimistic updates
 */

import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "@shared/lib/supabase"
import { Card, CardHeader, CardContent } from "@components/Card"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type ReviewDecision = "approve" | "reject" | "pending" | "edit"

type PersistedReviewDecision = "approve" | "reject" | "edit"

type ReviewFilter = "all" | "pending" | "approve" | "reject" | "edit"

type IngestionEntityRow = {
  id: string
  ingestion_job_id: string
  entity_type: string
  entity_data: Record<string, unknown> | null
  confidence: number | null
  created_at?: string
}

type IngestionReviewRow = {
  id: string
  ingestion_entity_id: string
  reviewer_id?: string | null
  decision: PersistedReviewDecision
  notes?: string | null
  reviewed_at?: string
}

type EntityReviewDashboardProps = {
  jobId: string
  reviewerId?: string | null
}

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

function formatConfidence(value: number | null | undefined): string {
  if (typeof value !== "number") return "—"
  return `${Math.round(value * 100)}%`
}

function getEntityDisplayName(entity: IngestionEntityRow): string {
  const data = entity.entity_data ?? {}

  const name = data.name
  const title = data.title
  const value = data.value

  if (typeof name === "string" && name.trim()) return name
  if (typeof title === "string" && title.trim()) return title
  if (typeof value === "string" && value.trim()) return value

  return "Unnamed Entity"
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function getStatusColor(decision: ReviewDecision): string {
  if (decision === "approve") return "bg-green-100 text-green-800"
  if (decision === "reject") return "bg-red-100 text-red-800"
  if (decision === "edit") return "bg-blue-100 text-blue-800"
  return "bg-yellow-100 text-yellow-800"
}

function getEntityDecision(
  review: IngestionReviewRow | undefined
): ReviewDecision {
  return review?.decision ?? "pending"
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function EntityReviewDashboard({
  jobId,
  reviewerId = null
}: EntityReviewDashboardProps) {
  const [entities, setEntities] = useState<IngestionEntityRow[]>([])
  const [reviews, setReviews] = useState<Record<string, IngestionReviewRow>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ReviewFilter>("all")

  /* ---------------------------------------------------------------------- */
  /* DATA LOADING                                                           */
  /* ---------------------------------------------------------------------- */

  async function loadData(): Promise<void> {
    setLoading(true)
    setError(null)

    try {
      const { data: entityRows, error: entityError } = await supabase
        .from("ingestion_entities")
        .select("*")
        .eq("ingestion_job_id", jobId)
        .order("created_at", { ascending: true })

      if (entityError) {
        throw new Error(entityError.message || "Failed loading entities")
      }

      const safeEntities: IngestionEntityRow[] = Array.isArray(entityRows)
        ? (entityRows as IngestionEntityRow[])
        : []

      setEntities(safeEntities)

      if (safeEntities.length === 0) {
        setReviews({})
        return
      }

      const entityIds = safeEntities.map((entity) => entity.id)

      const { data: reviewRows, error: reviewError } = await supabase
        .from("ingestion_reviews")
        .select("*")
        .in("ingestion_entity_id", entityIds)

      if (reviewError) {
        throw new Error(reviewError.message || "Failed loading reviews")
      }

      const reviewMap: Record<string, IngestionReviewRow> = {}

      for (const row of (reviewRows ?? []) as IngestionReviewRow[]) {
        reviewMap[row.ingestion_entity_id] = row
      }

      setReviews(reviewMap)
    } catch (err) {
      console.error("Entity review load error", err)

      setError(
        err instanceof Error
          ? err.message
          : "Unknown entity review load error"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!jobId) return
    void loadData()
  }, [jobId])

  /* ---------------------------------------------------------------------- */
  /* SAVE DECISION                                                          */
  /* ---------------------------------------------------------------------- */

  async function saveDecision(
    entityId: string,
    decision: PersistedReviewDecision
  ): Promise<void> {
    setSavingId(entityId)
    setError(null)

    try {
      const existing = reviews[entityId]

      const payload = {
        decision,
        reviewer_id: reviewerId,
        reviewed_at: new Date().toISOString()
      }

      if (existing?.id) {
        const { data, error: updateError } = await supabase
          .from("ingestion_reviews")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single()

        if (updateError) {
          throw updateError
        }

        if (data) {
          setReviews((prev) => ({
            ...prev,
            [entityId]: data as IngestionReviewRow
          }))
        }
      } else {
        const { data, error: insertError } = await supabase
          .from("ingestion_reviews")
          .insert({
            ingestion_entity_id: entityId,
            ...payload
          })
          .select("*")
          .single()

        if (insertError) {
          throw insertError
        }

        if (data) {
          setReviews((prev) => ({
            ...prev,
            [entityId]: data as IngestionReviewRow
          }))
        }
      }
    } catch (err) {
      console.error("Save review error", err)

      setError(
        err instanceof Error
          ? err.message
          : "Unknown save review error"
      )
    } finally {
      setSavingId(null)
    }
  }

  /* ---------------------------------------------------------------------- */
  /* SUMMARY METRICS                                                        */
  /* ---------------------------------------------------------------------- */

  const summary = useMemo(() => {
    let approved = 0
    let rejected = 0
    let pending = 0
    let edit = 0

    for (const entity of entities) {
      const decision = getEntityDecision(reviews[entity.id])

      if (decision === "approve") approved += 1
      else if (decision === "reject") rejected += 1
      else if (decision === "edit") edit += 1
      else pending += 1
    }

    return {
      total: entities.length,
      approved,
      rejected,
      pending,
      edit
    }
  }, [entities, reviews])

  /* ---------------------------------------------------------------------- */
  /* FILTERING                                                              */
  /* ---------------------------------------------------------------------- */

  const filteredEntities = useMemo(() => {
    if (filter === "all") return entities

    return entities.filter((entity) => {
      const decision = getEntityDecision(reviews[entity.id])
      return decision === filter
    })
  }, [entities, reviews, filter])

  /* ---------------------------------------------------------------------- */
  /* LOADING STATE                                                          */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <Card>
        <CardHeader
          title="Entity Review Dashboard"
          subtitle="Loading AI extraction results"
        />
        <CardContent>
          <div className="text-sm text-slate-500">
            Loading review queue…
          </div>
        </CardContent>
      </Card>
    )
  }

  /* ---------------------------------------------------------------------- */
  /* EMPTY STATE                                                            */
  /* ---------------------------------------------------------------------- */

  if (!loading && entities.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Entity Review Dashboard"
            subtitle="Approve or reject AI-extracted records before database mapping"
          />
          <CardContent>
            <div className="text-sm text-slate-600">
              No ingestion entities were found for this job.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Entity Review Dashboard"
          subtitle="Approve or reject AI-extracted records before database mapping"
        />

        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <SummaryStat label="Total" value={summary.total} />
            <SummaryStat label="Approved" value={summary.approved} />
            <SummaryStat label="Rejected" value={summary.rejected} />
            <SummaryStat label="Pending" value={summary.pending} />
            <SummaryStat label="Needs Edit" value={summary.edit} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <select
              className="rounded border px-3 py-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as ReviewFilter)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approve">Approved</option>
              <option value="reject">Rejected</option>
              <option value="edit">Needs Edit</option>
            </select>

            <button
              className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => void loadData()}
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {filteredEntities.map((entity) => {
        const review = reviews[entity.id]
        const decision = getEntityDecision(review)
        const displayName = getEntityDisplayName(entity)

        return (
          <Card key={entity.id}>
            <CardContent>
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="text-lg font-semibold">
                      {displayName}
                    </div>

                    <span className="rounded bg-slate-100 px-2 py-1 text-xs">
                      {entity.entity_type}
                    </span>

                    <span className="rounded bg-slate-100 px-2 py-1 text-xs">
                      Confidence {formatConfidence(entity.confidence)}
                    </span>

                    <span
                      className={`rounded px-2 py-1 text-xs ${getStatusColor(
                        decision
                      )}`}
                    >
                      {decision}
                    </span>
                  </div>

                  <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                    {prettyJson(entity.entity_data)}
                  </pre>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                  <button
                    className="rounded bg-green-600 px-3 py-2 text-white text-sm hover:bg-green-700 disabled:opacity-60"
                    disabled={savingId === entity.id}
                    onClick={() => void saveDecision(entity.id, "approve")}
                  >
                    {savingId === entity.id ? "Saving..." : "Approve"}
                  </button>

                  <button
                    className="rounded bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                    disabled={savingId === entity.id}
                    onClick={() => void saveDecision(entity.id, "edit")}
                  >
                    {savingId === entity.id ? "Saving..." : "Mark for Edit"}
                  </button>

                  <button
                    className="rounded bg-red-600 px-3 py-2 text-white text-sm hover:bg-red-700 disabled:opacity-60"
                    disabled={savingId === entity.id}
                    onClick={() => void saveDecision(entity.id, "reject")}
                  >
                    {savingId === entity.id ? "Saving..." : "Reject"}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

function SummaryStat({
  label,
  value
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}
