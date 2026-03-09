import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"

import { listContacts } from "@services/contacts.service"

type VoteGoalCardProps = {
  voteGoal?: number
}

export default function VoteGoalCard({ voteGoal = 45000 }: VoteGoalCardProps) {

  const [contactsCount, setContactsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {

    try {

      setLoading(true)

      const contacts = await listContacts()

      setContactsCount(contacts.length)

      setError(null)

    } catch (err: any) {

      console.error("VoteGoalCard failed", err)

      setError(err?.message ?? "Failed to load vote goal data")

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {

    loadData()

  }, [])

  if (loading) {

    return (

      <Card>

        <CardHeader
          title="Vote Goal Progress"
          subtitle="Campaign path to victory"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Loading campaign metrics…
          </div>

        </CardContent>

      </Card>

    )

  }

  if (error) {

    return (

      <Card>

        <CardHeader
          title="Vote Goal Progress"
          subtitle="Campaign path to victory"
        />

        <CardContent>

          <div className="text-sm text-red-600">
            {error}
          </div>

        </CardContent>

      </Card>

    )

  }

  const coveragePct =
    voteGoal > 0
      ? Math.round((contactsCount / voteGoal) * 100)
      : 0

  return (

    <Card>

      <CardHeader
        title="Vote Goal Progress"
        subtitle="Campaign path to victory"
      />

      <CardContent>

        <div className="space-y-3">

          <div className="flex justify-between text-sm">

            <span className="text-slate-500">
              Vote Goal
            </span>

            <span className="font-semibold">
              {voteGoal.toLocaleString()}
            </span>

          </div>

          <div className="flex justify-between text-sm">

            <span className="text-slate-500">
              Contacts Captured
            </span>

            <span className="font-semibold">
              {contactsCount.toLocaleString()}
            </span>

          </div>

          <div className="flex justify-between text-sm">

            <span className="text-slate-500">
              Progress
            </span>

            <span className="font-semibold text-blue-600">
              {coveragePct}%
            </span>

          </div>

          <div className="w-full bg-slate-200 rounded h-2">

            <div
              className="bg-blue-600 h-2 rounded"
              style={{ width: `${coveragePct}%` }}
            />

          </div>

        </div>

      </CardContent>

    </Card>

  )

}