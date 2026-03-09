import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@components/Card"
import { getVoterStats } from "../shared/services/voter.service"

export default function VoterIntelligenceCard() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const data = await getVoterStats()
      setStats(data)
    }
    load()
  }, [])

  if (!stats) return <Card>Loading...</Card>

  return (
    <Card>
      <CardHeader>Voter Intelligence</CardHeader>

      <CardContent>

        <div>Voters Indexed: {stats.voters}</div>

        <div>Matched Contacts: {stats.matched}</div>

        <div>Precinct Coverage: {stats.precincts}</div>

      </CardContent>
    </Card>
  )
}