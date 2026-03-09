import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "../shared/components/Card"
import { supabase } from "../shared/utils/db/supabase"

type CountyStats = {
  county: string
  population: number
  registered: number
  turnout: number
  registrationRate: number
  turnoutRate: number
  leanDemEstimate: number
  opportunityScore: number
}

export default function WinTargetStrategyCard() {

  const [counties, setCounties] = useState<CountyStats[]>([])
  const [selected, setSelected] = useState<CountyStats | null>(null)
  const [winNumber, setWinNumber] = useState<number>(0)
  const [turnoutProjection, setTurnoutProjection] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  async function loadStrategy() {

    setLoading(true)

    try {

      // Pull voter data
      const { data: voters } = await supabase
        .from("voters")
        .select("county")

      const countyCounts: Record<string, number> = {}

      voters?.forEach((v: any) => {

        const c = v.county?.toUpperCase() || "UNKNOWN"

        countyCounts[c] = (countyCounts[c] || 0) + 1

      })

      // Census population
      const censusResp = await fetch(
        "https://api.census.gov/data/2022/pep/population?get=NAME,POP&for=county:*&in=state:05"
      )

      const census = await censusResp.json()

      const censusMap: Record<string, number> = {}

      census.slice(1).forEach((row: any) => {

        const county = row[0]
          .replace(" County, Arkansas", "")
          .toUpperCase()

        censusMap[county] = parseInt(row[1])

      })

      const countyStats: CountyStats[] = Object.keys(countyCounts).map(c => {

        const registered = countyCounts[c]
        const population = censusMap[c] || 0

        const turnout = Math.round(registered * 0.65)

        const registrationRate =
          population > 0 ? registered / population : 0

        const turnoutRate =
          registered > 0 ? turnout / registered : 0

        const leanDemEstimate = Math.round(registered * 0.42)

        const opportunityScore =
          leanDemEstimate - turnout * 0.5

        return {
          county: c,
          population,
          registered,
          turnout,
          registrationRate,
          turnoutRate,
          leanDemEstimate,
          opportunityScore
        }

      })

      const totalTurnout = countyStats.reduce(
        (a, c) => a + c.turnout,
        0
      )

      const calculatedWinNumber =
        Math.round(totalTurnout * 0.5 + 1)

      setWinNumber(calculatedWinNumber)
      setTurnoutProjection(totalTurnout)

      setCounties(countyStats)

    } catch (err) {

      console.error("Strategy card failed", err)

    }

    setLoading(false)

  }

  useEffect(() => {

    loadStrategy()

  }, [])

  if (loading) {

    return (
      <Card>
        <CardHeader
          title="Strategic Targeting"
          subtitle="Campaign path to victory"
        />
        <CardContent>
          Loading strategy engine...
        </CardContent>
      </Card>
    )

  }

  const topCounties =
    [...counties]
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 10)

  return (

    <Card>

      <CardHeader
        title="Strategic Targeting"
        subtitle="Statewide win number and opportunity map"
      />

      <CardContent>

        <div className="mb-6">

          <div className="text-lg font-semibold">
            Statewide Win Number
          </div>

          <div className="text-3xl font-bold text-blue-600">
            {winNumber.toLocaleString()}
          </div>

          <div className="text-xs text-slate-500">
            Based on projected turnout of {turnoutProjection.toLocaleString()}
          </div>

        </div>

        <div className="grid md:grid-cols-2 gap-4">

          <div>

            <div className="text-sm font-semibold mb-2">
              Top Opportunity Counties
            </div>

            <div className="border rounded divide-y max-h-64 overflow-y-auto">

              {topCounties.map(c => (

                <div
                  key={c.county}
                  className="p-2 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelected(c)}
                >

                  {c.county}

                </div>

              ))}

            </div>

          </div>

          {selected && (

            <div>

              <div className="font-semibold mb-2">
                {selected.county} County
              </div>

              <div className="space-y-1 text-sm">

                <div>
                  Population: {selected.population.toLocaleString()}
                </div>

                <div>
                  Registered Voters: {selected.registered.toLocaleString()}
                </div>

                <div>
                  Registration Rate: {(selected.registrationRate * 100).toFixed(1)}%
                </div>

                <div>
                  Turnout Rate: {(selected.turnoutRate * 100).toFixed(1)}%
                </div>

                <div>
                  Lean Dem Potential: {selected.leanDemEstimate.toLocaleString()}
                </div>

              </div>

            </div>

          )}

        </div>

      </CardContent>

    </Card>

  )

}