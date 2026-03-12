/**
 * MessageQueueCard.tsx
 *
 * Displays queued and active messaging campaigns.
 *
 * Tracks delivery progress and engagement metrics.
 */

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

/* -------------------------------------------------------------------------- */
/* TYPES */
/* -------------------------------------------------------------------------- */

type CampaignQueue = {
  id: string
  name: string
  channel: string
  queued: number
  sent: number
  delivered: number
  opens: number
  clicks: number
}

/* -------------------------------------------------------------------------- */
/* COMPONENT */
/* -------------------------------------------------------------------------- */

export default function MessageQueueCard() {

  const [campaigns, setCampaigns] = useState<CampaignQueue[]>([])
  const [loading, setLoading] = useState(true)

  async function loadQueues() {

    setLoading(true)

    try {

      /**
       * Future implementation:
       * messaging.service.getActiveCampaignQueues()
       */

      const simulated: CampaignQueue[] = [

        {
          id: "1",
          name: "Volunteer Recruitment Email",
          channel: "Email",
          queued: 1200,
          sent: 1100,
          delivered: 1085,
          opens: 462,
          clicks: 97
        },

        {
          id: "2",
          name: "Early Voting SMS Push",
          channel: "SMS",
          queued: 900,
          sent: 900,
          delivered: 894,
          opens: 0,
          clicks: 0
        },

        {
          id: "3",
          name: "Substack Newsletter",
          channel: "Substack",
          queued: 3400,
          sent: 3400,
          delivered: 3380,
          opens: 1850,
          clicks: 510
        }

      ]

      setCampaigns(simulated)

    } catch (err) {

      console.error("Queue loading failed", err)

    }

    setLoading(false)

  }

  useEffect(() => {

    loadQueues()

  }, [])

  /* ---------------------------------------------------------------------- */
  /* RENDER */
/* ---------------------------------------------------------------------- */

  if (loading) {

    return (

      <Card>

        <CardHeader
          title="Message Queues"
          subtitle="Active messaging campaigns"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Loading campaign queues…
          </div>

        </CardContent>

      </Card>

    )

  }

  return (

    <Card>

      <CardHeader
        title="Message Queues"
        subtitle="Delivery and engagement tracking"
      />

      <CardContent>

        <div className="space-y-3">

          {campaigns.map(c => (

            <CampaignRow
              key={c.id}
              campaign={c}
            />

          ))}

        </div>

      </CardContent>

    </Card>

  )

}

/* -------------------------------------------------------------------------- */
/* CAMPAIGN ROW */
/* -------------------------------------------------------------------------- */

function CampaignRow({
  campaign
}: {
  campaign: CampaignQueue
}) {

  const openRate =
    campaign.delivered > 0
      ? Math.round((campaign.opens / campaign.delivered) * 100)
      : 0

  return (

    <div className="border rounded p-3 space-y-2">

      <div className="flex justify-between items-center">

        <div className="font-medium text-sm">
          {campaign.name}
        </div>

        <div className="text-xs text-slate-500">
          {campaign.channel}
        </div>

      </div>

      <div className="grid grid-cols-5 gap-2 text-xs">

        <Metric label="Queued" value={campaign.queued} />
        <Metric label="Sent" value={campaign.sent} />
        <Metric label="Delivered" value={campaign.delivered} />
        <Metric label="Opens" value={campaign.opens} />
        <Metric label="Open Rate" value={`${openRate}%`} />

      </div>

    </div>

  )

}

/* -------------------------------------------------------------------------- */
/* METRIC */
/* -------------------------------------------------------------------------- */

function Metric({
  label,
  value
}: {
  label: string
  value: number | string
}) {

  return (

    <div>

      <div className="text-slate-400">
        {label}
      </div>

      <div className="font-semibold">
        {typeof value === "number"
          ? value.toLocaleString()
          : value}
      </div>

    </div>

  )

}
