import React from "react"

import { Card, CardHeader, CardContent } from "@components/Card"

type PowerOf5CardProps = {
  leadersCount?: number
  avgDirectTeamSize?: number
}

export default function PowerOf5Card({
  leadersCount = 0,
  avgDirectTeamSize = 0,
}: PowerOf5CardProps) {
  return (
    <Card>
      <CardHeader
        title="Power of 5"
        subtitle="Network growth snapshot"
      />

      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded border p-3">
            <div className="text-xs text-slate-500">Leaders</div>
            <div className="text-2xl font-bold text-slate-900">
              {leadersCount.toLocaleString()}
            </div>
          </div>

          <div className="rounded border p-3">
            <div className="text-xs text-slate-500">Avg Team Size</div>
            <div className="text-2xl font-bold text-slate-900">
              {avgDirectTeamSize.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Power of 5 network metrics will expand as organizer relationships are connected.
        </div>
      </CardContent>
    </Card>
  )
}