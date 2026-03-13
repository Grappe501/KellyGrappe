/**
 * training.dashboard.ts
 *
 * Training Dashboard definition
 *
 * Primary command center for the Training Circle.
 */

import type { PlatformDashboardDefinition } from "@platform/types/platform.types"

export const TrainingDashboard: PlatformDashboardDefinition = {
  key: "TrainingDashboard",
  title: "Training Command Center",
  description:
    "Command center for learning progress, certifications, coaching, and readiness.",
  circle: "training",
  icon: "graduation-cap",
  category: "operations",
  order: 2,

  cards: [
    "TrainingCommandCenterCard",
    "LearningPathSummaryCard",
    "TrainingProgressCard",
    "CertificationStatusCard",
    "TrainingFollowUpCard",
    "TrainingAnalyticsSummaryCard"
  ],

  optionalCards: [
    "TrainingAssignmentQueueCard",
    "TrainingSkillsGraphCard",
    "ManagerCoachingQueueCard",
    "TrainingContentHealthCard"
  ],

  dataSources: [
    "training_courses",
    "training_modules",
    "training_paths",
    "training_progress",
    "training_certifications",
    "training_events"
  ],

  services: [
    "training",
    "training_paths",
    "training_progress",
    "training_certifications",
    "training_reporting"
  ],

  aiCapabilities: [
    "ai.training.strategist",
    "ai.training.coach",
    "ai.training.path.builder",
    "ai.training.analytics"
  ],

  route: "/dashboard/training",

  permissions: [
    "campaign_admin",
    "communications_director",
    "organizer",
    "volunteer"
  ],

  featureFlags: [
    "training",
    "training_tracking",
    "certifications",
    "coaching",
    "manager_reporting"
  ]
}

export default TrainingDashboard
