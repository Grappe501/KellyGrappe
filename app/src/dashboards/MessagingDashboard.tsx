/**
 * MessagingDashboard.tsx
 *
 * Communication Circle Messaging Command Center
 *
 * This dashboard renders the operational messaging system for the campaign.
 *
 * It dynamically loads cards defined in the MessagingDashboard registry
 * configuration located in:
 *
 *   platform/dashboard/messaging.dashboard.ts
 *
 * This allows AI generators and the platform kernel to extend the dashboard
 * without modifying UI code.
 */

import React from "react"

import Container from "@components/Container"
import { Card, CardHeader, CardContent } from "@components/Card"

import MessagingDashboardConfig from "@platform/dashboard/messaging.dashboard"

/* -------------------------------------------------------------------------- */
/* CARD IMPORTS                                                               */
/* These are the initial cards available in the messaging dashboard.         */
/* Additional cards may be dynamically loaded later by the platform kernel.  */
/* -------------------------------------------------------------------------- */

import MessagingCommandCenterCard from "@cards/MessagingCommandCenterCard"
import AudienceSegmentBuilderCard from "@cards/AudienceSegmentBuilderCard"
import ChannelStatusCard from "@cards/ChannelStatusCard"
import MessageQueueCard from "@cards/MessageQueueCard"
import EngagementPerformanceCard from "@cards/EngagementPerformanceCard"
import TemplateLibraryCard from "@cards/TemplateLibraryCard"

/* -------------------------------------------------------------------------- */
/* CARD REGISTRY                                                              */
/* Maps card keys from the dashboard definition to actual components.        */
/* -------------------------------------------------------------------------- */

const CARD_REGISTRY: Record<string, React.ComponentType<any>> = {

  MessagingCommandCenterCard,

  AudienceSegmentBuilderCard,

  ChannelStatusCard,

  MessageQueueCard,

  EngagementPerformanceCard,

  TemplateLibraryCard

}

/* -------------------------------------------------------------------------- */
/* RENDER CARD                                                                */
/* -------------------------------------------------------------------------- */

function renderCard(cardKey: string) {

  const CardComponent = CARD_REGISTRY[cardKey]

  if (!CardComponent) {

    return (

      <Card key={cardKey}>

        <CardHeader
          title={cardKey}
          subtitle="Card not yet implemented"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            This card is registered in the platform but has not yet been implemented.
          </div>

        </CardContent>

      </Card>

    )

  }

  return <CardComponent key={cardKey} />

}

/* -------------------------------------------------------------------------- */
/* DASHBOARD                                                                  */
/* -------------------------------------------------------------------------- */

export default function MessagingDashboard() {

  const dashboard = MessagingDashboardConfig

  return (

    <Container>

      <div className="p-6 space-y-6">

        {/* -------------------------------------------------------------- */}
        {/* HEADER                                                         */}
        {/* -------------------------------------------------------------- */}

        <div>

          <h1 className="text-2xl font-bold">
            {dashboard.title}
          </h1>

          <p className="text-sm text-slate-600">
            {dashboard.description}
          </p>

        </div>

        {/* -------------------------------------------------------------- */}
        {/* DASHBOARD CARDS                                                */}
        {/* -------------------------------------------------------------- */}

        <div className="grid gap-6 md:grid-cols-2">

          {dashboard.cards.map((cardKey) => renderCard(cardKey))}

        </div>

      </div>

    </Container>

  )

}
