/**
 * EngagementPerformanceCard.tsx
 *
 * Messaging engagement analytics card.
 *
 * Displays high-level performance metrics across all
 * campaign messaging channels.
 *
 * Future integrations:
 *  messaging.service
 *  analytics.service
 *  social.service
 *  substack.service
 */

import React, { useEffect, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type EngagementStats = {

  emailsSent: number
  emailOpenRate: number
  emailClickRate: number

  smsSent: number
  smsReplyRate: number

  volunteerConversions: number
  donorConversions: number

  socialEngagementRate: number

}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function EngagementPerformanceCard() {

  const [stats, setStats] = useState<EngagementStats | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadStats() {

    setLoading(true)

    try {

      /**
       * Future implementation:
       *
       * analytics.service.getMessagingPerformance()
       */

      const simulated: EngagementStats = {

        emailsSent: 12840,
        emailOpenRate: 38,
        emailClickRate: 11,

        smsSent: 9400,
        smsReplyRate: 17,

        volunteerConversions: 124,
        donorConversions: 62,

        socialEngagementRate: 8

      }

      setStats(simulated)

    } catch (err) {

      console.error("Engagement analytics failed", err)

    }

    setLoading(false)

  }

  useEffect(() => {

    loadStats()

  }, [])

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  if (loading || !stats) {

    return (

      <Card>

        <CardHeader
          title="Engagement Performance"
          subtitle="Messaging effectiveness analytics"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Loading engagement analytics…
          </div>

        </CardContent>

      </Card>

    )

  }

  return (

    <Card>

      <CardHeader
        title="Engagement Performance"
        subtitle="Messaging effectiveness analytics"
      />

      <CardContent>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <Metric
            label="Emails Sent"
            value={stats.emailsSent}
          />

          <Metric
            label="Email Open Rate"
            value={`${stats.emailOpenRate}%`}
          />

          <Metric
            label="Email Click Rate"
            value={`${stats.emailClickRate}%`}
          />

          <Metric
            label="SMS Sent"
            value={stats.smsSent}
          />

          <Metric
            label="SMS Reply Rate"
            value={`${stats.smsReplyRate}%`}
          />

          <Metric
            label="Volunteer Conversions"
            value={stats.volunteerConversions}
          />

          <Metric
            label="Donor Conversions"
            value={stats.donorConversions}
          />

          <Metric
            label="Social Engagement"
            value={`${stats.socialEngagementRate}%`}
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
  value: number | string
}) {

  return (

    <div className="border rounded p-3">

      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="text-lg font-semibold">
        {typeof value === "number"
          ? value.toLocaleString()
          : value}
      </div>

    </div>

  )

}
