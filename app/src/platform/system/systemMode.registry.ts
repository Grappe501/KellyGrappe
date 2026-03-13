/**
 * systemMode.registry.ts
 *
 * System Mode Registry
 *
 * This layer allows the same platform core to operate as different system types:
 * - civic
 * - business
 * - education
 * - nonprofit
 * - church
 * - media
 * - custom
 *
 * The registry defines:
 * - labels
 * - enabled circles
 * - default dashboards
 * - role language
 * - training language
 *
 * This is the foundation for turning CivicOS into a universal organizational OS.
 */

export type SystemMode =
  | "civic"
  | "business"
  | "education"
  | "nonprofit"
  | "church"
  | "media"
  | "custom"

export interface SystemModeEntityLabels {
  contact: string
  organization: string
  audience: string
  campaign?: string
  volunteer?: string
  donor?: string
  trainingPath?: string
  dashboard?: string
}

export interface SystemModeDefinition {
  id: SystemMode
  label: string
  description: string

  entityLabels: SystemModeEntityLabels

  /**
   * Platform circles enabled for this mode
   */
  circles: string[]

  /**
   * Default dashboards to show in top-level navigation
   */
  defaultDashboards: string[]

  /**
   * Default training path language
   */
  trainingPaths?: string[]

  /**
   * Optional tags / categories that can drive future UI decisions
   */
  tags?: string[]
}

export const SYSTEM_MODES: Record<SystemMode, SystemModeDefinition> = {
  civic: {
    id: "civic",
    label: "CivicOS",
    description:
      "Civic, campaign, organizing, nonprofit, and public-interest operating system.",
    entityLabels: {
      contact: "Constituent",
      organization: "Campaign",
      audience: "Voter Segment",
      campaign: "Campaign",
      volunteer: "Volunteer",
      donor: "Donor",
      trainingPath: "Organizer Path",
      dashboard: "Command Center"
    },
    circles: [
      "communication",
      "field",
      "training",
      "identity",
      "operations",
      "analytics",
      "leadership"
    ],
    defaultDashboards: [
      "WarRoomDashboard",
      "MessagingDashboard",
      "TrainingDashboard",
      "AudienceDashboard"
    ],
    trainingPaths: [
      "Organizer Onboarding",
      "Volunteer Leadership",
      "Communications Training",
      "Field Operations Training"
    ],
    tags: ["civic", "campaign", "organizing"]
  },

  business: {
    id: "business",
    label: "Business OS",
    description:
      "Commercial CRM, marketing, operations, training, and leadership system.",
    entityLabels: {
      contact: "Customer",
      organization: "Company",
      audience: "Market Segment",
      campaign: "Campaign",
      volunteer: "Team Member",
      donor: "Customer",
      trainingPath: "Learning Path",
      dashboard: "Operations Center"
    },
    circles: [
      "communication",
      "sales",
      "operations",
      "training",
      "identity",
      "analytics",
      "leadership"
    ],
    defaultDashboards: [
      "SalesDashboard",
      "MessagingDashboard",
      "TrainingDashboard",
      "OperationsDashboard"
    ],
    trainingPaths: [
      "Employee Onboarding",
      "Sales Enablement",
      "Leadership Development",
      "Customer Success Training"
    ],
    tags: ["business", "crm", "sales", "operations"]
  },

  education: {
    id: "education",
    label: "Education OS",
    description:
      "Student progress, teacher development, curriculum, and institutional operations system.",
    entityLabels: {
      contact: "Student",
      organization: "School",
      audience: "Class Group",
      campaign: "Initiative",
      volunteer: "Teacher",
      donor: "Supporter",
      trainingPath: "Learning Path",
      dashboard: "Learning Dashboard"
    },
    circles: [
      "training",
      "identity",
      "communication",
      "analytics",
      "curriculum",
      "leadership"
    ],
    defaultDashboards: [
      "StudentProgressDashboard",
      "TeacherTrainingDashboard",
      "MessagingDashboard",
      "TrainingDashboard"
    ],
    trainingPaths: [
      "Student Learning Path",
      "Teacher Professional Development",
      "Administrator Readiness",
      "Certification Track"
    ],
    tags: ["education", "student", "teacher", "curriculum"]
  },

  nonprofit: {
    id: "nonprofit",
    label: "Nonprofit OS",
    description:
      "Donor, volunteer, program, training, and outreach operating system for mission-driven organizations.",
    entityLabels: {
      contact: "Supporter",
      organization: "Organization",
      audience: "Supporter Segment",
      campaign: "Initiative",
      volunteer: "Volunteer",
      donor: "Donor",
      trainingPath: "Volunteer Path",
      dashboard: "Mission Center"
    },
    circles: [
      "communication",
      "operations",
      "training",
      "identity",
      "analytics",
      "leadership"
    ],
    defaultDashboards: [
      "MessagingDashboard",
      "TrainingDashboard",
      "AudienceDashboard",
      "OperationsDashboard"
    ],
    trainingPaths: [
      "Volunteer Onboarding",
      "Program Training",
      "Fundraising Readiness",
      "Leadership Development"
    ],
    tags: ["nonprofit", "mission", "fundraising"]
  },

  church: {
    id: "church",
    label: "Church OS",
    description:
      "Congregation, ministry, discipleship, communication, and leadership platform.",
    entityLabels: {
      contact: "Member",
      organization: "Church",
      audience: "Ministry Group",
      campaign: "Ministry Initiative",
      volunteer: "Volunteer",
      donor: "Giver",
      trainingPath: "Discipleship Path",
      dashboard: "Ministry Center"
    },
    circles: [
      "communication",
      "training",
      "identity",
      "operations",
      "leadership"
    ],
    defaultDashboards: [
      "MessagingDashboard",
      "TrainingDashboard",
      "MinistryDashboard"
    ],
    trainingPaths: [
      "Volunteer Onboarding",
      "Leadership Track",
      "Discipleship Track",
      "Ministry Readiness"
    ],
    tags: ["church", "ministry", "discipleship"]
  },

  media: {
    id: "media",
    label: "Media OS",
    description:
      "Audience, publishing, production, training, and engagement platform.",
    entityLabels: {
      contact: "Audience Member",
      organization: "Media Brand",
      audience: "Audience Segment",
      campaign: "Content Campaign",
      volunteer: "Contributor",
      donor: "Subscriber",
      trainingPath: "Production Path",
      dashboard: "Publishing Center"
    },
    circles: [
      "communication",
      "training",
      "identity",
      "analytics",
      "operations"
    ],
    defaultDashboards: [
      "MessagingDashboard",
      "PublishingDashboard",
      "TrainingDashboard"
    ],
    trainingPaths: [
      "Production Onboarding",
      "Host Training",
      "Editor Track",
      "Audience Growth Training"
    ],
    tags: ["media", "publishing", "audience"]
  },

  custom: {
    id: "custom",
    label: "Custom OS",
    description:
      "Flexible organizational operating system with customizable terminology and circles.",
    entityLabels: {
      contact: "Contact",
      organization: "Organization",
      audience: "Audience",
      campaign: "Campaign",
      volunteer: "Participant",
      donor: "Supporter",
      trainingPath: "Training Path",
      dashboard: "Dashboard"
    },
    circles: [
      "communication",
      "training",
      "identity",
      "operations",
      "analytics"
    ],
    defaultDashboards: [
      "MessagingDashboard",
      "TrainingDashboard"
    ],
    trainingPaths: [
      "Onboarding",
      "Core Training",
      "Leadership Path"
    ],
    tags: ["custom", "flexible"]
  }
}

export function getSystemModeDefinition(mode: SystemMode): SystemModeDefinition {
  return SYSTEM_MODES[mode]
}

export function listSystemModes(): SystemModeDefinition[] {
  return Object.values(SYSTEM_MODES)
}

export function isSystemMode(value: unknown): value is SystemMode {
  return typeof value === "string" && value in SYSTEM_MODES
}
