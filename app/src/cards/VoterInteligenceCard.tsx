import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "../shared/components/Card"

import { getVoterStats } from "../shared/utils/db/services/voter.service"

type VoterStats = {
  voters?: number
  matched?: number
  precincts?: number
}

export default function VoterIntelligenceCard() {

  const [stats, setStats] = useState<VoterStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadStats() {

    try {

      setLoading(true)

      const data = await getVoterStats()

      setStats(data)

      setError(null)

    } catch (err: any) {

      console.error("VoterIntelligenceCard failed", err)

      setError(err?.message ?? "Failed to load voter intelligence")

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {

    loadStats()

  }, [])

  if (loading) {

    return (

      <Card>

        <CardHeader
          title="Voter Intelligence"
          subtitle="Statewide voter data overview"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Loading voter data…
          </div>

        </CardContent>

      </Card>

    )

  }

  if (error) {

    return (

      <Card>

        <CardHeader
          title="Voter Intelligence"
          subtitle="Statewide voter data overview"
        />

        <CardContent>

          <div className="text-sm text-red-600">
            {error}
          </div>

        </CardContent>

      </Card>

    )

  }

  const voters = stats?.voters ?? 0
  const matched = stats?.matched ?? 0
  const precincts = stats?.precincts ?? 0

  const matchPct =
    voters > 0 ? Math.round((matched / voters) * 100) : 0

  return (

    <Card>

      <CardHeader
        title="Voter Intelligence"
        subtitle="Statewide voter data overview"
      />

      <CardContent>

        <div className="grid grid-cols-3 gap-4 text-center">

          <div>

            <div className="text-2xl font-bold text-slate-800">
              {voters.toLocaleString()}
            </div>

            <div className="text-xs text-slate-500">
              Voters Indexed
            </div>

          </div>

          <div>

            <div className="text-2xl font-bold text-green-600">
              {matched.toLocaleString()}
            </div>

            <div className="text-xs text-slate-500">
              Matched Contacts
            </div>

          </div>

          <div>

            <div className="text-2xl font-bold text-blue-600">
              {precincts.toLocaleString()}
            </div>

            <div className="text-xs text-slate-500">
              Precincts Covered
            </div>

          </div>

        </div>

        <div className="mt-4 text-center text-xs text-slate-500">

          Match Rate: {matchPct}%

        </div>

      </CardContent>

    </Card>

  )

}