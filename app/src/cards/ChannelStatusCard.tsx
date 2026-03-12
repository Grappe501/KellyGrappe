/**
 * ChannelStatusCard.tsx
 *
 * Communication infrastructure health monitor.
 *
 * Displays operational status of all messaging channels.
 *
 * Future integrations:
 *  - SendGrid (email)
 *  - Twilio (SMS)
 *  - Discord API
 *  - Social media APIs
 *  - Substack ingestion
 *  - Website conversion tracking
 */

import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type ChannelHealth = {
  name: string
  status: "online" | "degraded" | "offline"
  latency?: number
  queueDepth?: number
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function ChannelStatusCard() {

  const [channels, setChannels] = useState<ChannelHealth[]>([])
  const [loading, setLoading] = useState(true)

  async function loadStatus() {

    setLoading(true)

    try {

      /**
       * Future implementation:
       *
       * channel.service.getStatus()
       */

      const simulated: ChannelHealth[] = [

        {
          name: "Email",
          status: "online",
          latency: 120,
          queueDepth: 1240
        },

        {
          name: "SMS",
          status: "online",
          latency: 95,
          queueDepth: 850
        },

        {
          name: "Phonebank",
          status: "online",
          latency: 0,
          queueDepth: 14
        },

        {
          name: "Social Media",
          status: "degraded",
          latency: 410,
          queueDepth: 22
        },

        {
          name: "Discord",
          status: "online",
          latency: 60,
          queueDepth: 187
        },

        {
          name: "Substack",
          status: "online",
          latency: 210,
          queueDepth: 3
        },

        {
          name: "Direct Mail",
          status: "online",
          latency: 0,
          queueDepth: 6400
        }

      ]

      setChannels(simulated)

    } catch (err) {

      console.error("Channel status check failed", err)

    }

    setLoading(false)

  }

  useEffect(() => {

    loadStatus()

  }, [])

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  if (loading) {

    return (

      <Card>

        <CardHeader
          title="Channel Status"
          subtitle="Communication system health"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Checking channel status…
          </div>

        </CardContent>

      </Card>

    )

  }

  return (

    <Card>

      <CardHeader
        title="Channel Status"
        subtitle="Operational health of messaging systems"
      />

      <CardContent>

        <div className="space-y-3">

          {channels.map(channel => (

            <ChannelRow
              key={channel.name}
              channel={channel}
            />

          ))}

        </div>

      </CardContent>

    </Card>

  )

}

/* -------------------------------------------------------------------------- */
/* CHANNEL ROW                                                                */
/* -------------------------------------------------------------------------- */

function ChannelRow({
  channel
}: {
  channel: ChannelHealth
}) {

  const color =
    channel.status === "online"
      ? "bg-green-500"
      : channel.status === "degraded"
      ? "bg-yellow-500"
      : "bg-red-500"

  return (

    <div className="flex items-center justify-between border rounded p-3">

      <div className="flex items-center gap-3">

        <div className={`w-3 h-3 rounded-full ${color}`} />

        <div className="font-medium text-sm">
          {channel.name}
        </div>

      </div>

      <div className="flex gap-6 text-xs text-slate-500">

        {channel.latency !== undefined && (

          <div>
            Latency: {channel.latency} ms
          </div>

        )}

        {channel.queueDepth !== undefined && (

          <div>
            Queue: {channel.queueDepth.toLocaleString()}
          </div>

        )}

      </div>

    </div>

  )

}
