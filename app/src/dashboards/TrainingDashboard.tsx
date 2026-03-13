/**
 * TrainingDashboard.tsx
 *
 * Training Circle / Training Command Center
 *
 * Registry-driven dashboard shell.
 */

import React from "react"

import Container from "@components/Container"
import { Card, CardHeader, CardContent } from "@components/Card"

import TrainingDashboardConfig from "@platform/dashboard/training.dashboard"

import TrainingCommandCenterCard from "@cards/TrainingCommandCenterCard"

/* -------------------------------------------------------------------------- */
/* TEMP CARD PLACEHOLDERS                                                     */
/* These will be replaced by real cards as the training circle expands.       */
/* -------------------------------------------------------------------------- */

function PlaceholderCard({
  title,
  subtitle
}: {
  title: string
  subtitle: string
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
      />
      <CardContent>
        <div className="text-sm text-slate-500">
          This training card is registered and ready for build-out.
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* CARD REGISTRY                                                              */
/* -------------------------------------------------------------------------- */

const CARD_REGISTRY: Record<string, React.ComponentType> = {
  TrainingCommandCenterCard,

  LearningPathSummaryCard: () => (
    <PlaceholderCard
      title="Learning Path Summary"
      subtitle="Role paths and learner assignments"
    />
  ),

  TrainingProgressCard: () => (
    <PlaceholderCard
      title="Training Progress"
      subtitle="Progress across modules and paths"
    />
  ),

  CertificationStatusCard: () => (
    <PlaceholderCard
      title="Certification Status"
      subtitle="Issued, expiring, and pending certifications"
    />
  ),

  TrainingFollowUpCard: () => (
    <PlaceholderCard
      title="Training Follow-Up"
      subtitle="Reminders, escalations, and coaching actions"
    />
  ),

  TrainingAnalyticsSummaryCard: () => (
    <PlaceholderCard
      title="Training Analytics"
      subtitle="Engagement, completion, and performance trends"
    />
  )
}

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

export default function TrainingDashboard() {
  const dashboard = TrainingDashboardConfig

  return (
    <Container>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {dashboard.title}
          </h1>

          <p className="text-sm text-slate-600">
            {dashboard.description}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {dashboard.cards.map((cardKey: string) => renderCard(cardKey))}
        </div>
      </div>
    </Container>
  )
}
