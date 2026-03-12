/**
 * MessagingCommandCenterCard.tsx
 *
 * Core operational messaging control card.
 *
 * This card displays the current communication status across
 * all campaign messaging channels.
 *
 * Channels monitored:
 * - Email
 * - SMS
 * - Phonebank
 * - Social Media
 * - Discord
 * - Substack
 * - Direct Mail
 */

import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"

type ChannelStatus = {
  emailQueued: number
  smsQueued: number
  phonebankActive: number
  socialScheduled: number
  discordActiveUsers: number
  substackPosts: number
  directMailQueued: number
}

export default function MessagingCommandCenterCard() {

  const [status, setStatus] = useState<ChannelStatus | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadStatus() {

    setLoading(true)

    try {

      /**
       * In production these values will come from services like:
       *
       * messaging.service
       * social.service
       * discord.service
       * substack.service
       * phonebank.service
       */

      const simulated: ChannelStatus = {

        emailQueued: 1240,
        smsQueued: 850,
        phonebankActive: 14,
        socialScheduled: 22,
        discordActiveUsers: 187,
        substackPosts: 3,
        directMailQueued: 6400

      }

      setStatus(simulated)

    } catch (err) {

      console.error("Messaging command center failed", err)

    }

    setLoading(false)

  }

  useEffect(() => {

    loadStatus()

  }, [])

  if (loading || !status) {

    return (

      <Card>

        <CardHeader
          title="Messaging Command Center"
          subtitle="Communication system status"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Loading communication systems…
          </div>

        </CardContent>

      </Card>

    )

  }

  return (

    <Card>

      <CardHeader
        title="Messaging Command Center"
        subtitle="Real-time communication operations"
      />

      <CardContent>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <Metric
            label="Email Queue"
            value={status.emailQueued}
          />

          <Metric
            label="SMS Queue"
            value={status.smsQueued}
          />

          <Metric
            label="Phonebank Volunteers"
            value={status.phonebankActive}
          />

          <Metric
            label="Scheduled Social Posts"
            value={status.socialScheduled}
          />

          <Metric
            label="Discord Active Users"
            value={status.discordActiveUsers}
          />

          <Metric
            label="Substack Drafts"
            value={status.substackPosts}
          />

          <Metric
            label="Direct Mail Queue"
            value={status.directMailQueued}
          />

        </div>

      </CardContent>

    </Card>

  )

}

/* -------------------------------------------------------------------------- */
/* METRIC COMPONENT                                                           */
/* -------------------------------------------------------------------------- */

function Metric({
  label,
  value
}: {
  label: string
  value: number
}) {

  return (

    <div className="border rounded p-3 bg-white">

      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="text-xl font-bold text-slate-800">
        {value.toLocaleString()}
      </div>

    </div>

  )

}
