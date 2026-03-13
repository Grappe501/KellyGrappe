/**
 * organizer.progression.engine.ts
 *
 * Organizer Progression Engine
 *
 * Purpose:
 * - model organizer advancement from individual volunteer to movement architect
 * - compute progression based on training, certifications, and field activity
 * - provide next-step guidance for users building teams and organizations
 *
 * This engine is intentionally domain-flexible and will later support:
 * - civic organizing
 * - business team building
 * - church outreach
 * - student organizing
 * - community leadership development
 */

import { supabase } from "@shared/lib/supabase"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type OrganizerLevelKey =
  | "level_1_volunteer"
  | "level_2_organizer"
  | "level_3_team_builder"
  | "level_4_organization_builder"
  | "level_5_regional_leader"
  | "level_6_movement_architect"

export interface OrganizerLevelDefinition {
  key: OrganizerLevelKey
  rank: number
  title: string
  description: string

  requirements: {
    completedPaths: number
    certifications: number
    eventsLogged: number
    teamMembersRecruited: number
    organizationsLaunched: number
  }

  nextFocus: string[]
}

export interface OrganizerProgressMetrics {
  completedPaths: number
  certifications: number
  eventsLogged: number
  teamMembersRecruited: number
  organizationsLaunched: number
}

export interface OrganizerProgressResult {
  userId: string
  currentLevel: OrganizerLevelDefinition
  nextLevel: OrganizerLevelDefinition | null
  metrics: OrganizerProgressMetrics
  readinessPercent: number
  missingRequirements: string[]
  recommendedActions: string[]
}

/* -------------------------------------------------------------------------- */
/* LEVEL DEFINITIONS                                                          */
/* -------------------------------------------------------------------------- */

export const ORGANIZER_LEVELS: OrganizerLevelDefinition[] = [
  {
    key: "level_1_volunteer",
    rank: 1,
    title: "Volunteer",
    description:
      "Beginning stage focused on personal readiness, local participation, and foundational community engagement.",
    requirements: {
      completedPaths: 0,
      certifications: 0,
      eventsLogged: 0,
      teamMembersRecruited: 0,
      organizationsLaunched: 0
    },
    nextFocus: [
      "Complete organizer onboarding",
      "Attend local events",
      "Start relationship mapping",
      "Learn core communication habits"
    ]
  },
  {
    key: "level_2_organizer",
    rank: 2,
    title: "Organizer",
    description:
      "Able to coordinate outreach, host activities, and begin structured grassroots relationship building.",
    requirements: {
      completedPaths: 1,
      certifications: 0,
      eventsLogged: 3,
      teamMembersRecruited: 2,
      organizationsLaunched: 0
    },
    nextFocus: [
      "Recruit initial team members",
      "Practice event follow-up",
      "Build a neighborhood or community contact list",
      "Develop a repeatable outreach rhythm"
    ]
  },
  {
    key: "level_3_team_builder",
    rank: 3,
    title: "Team Builder",
    description:
      "Can recruit and support a small team, distribute work, and maintain consistent organizing systems.",
    requirements: {
      completedPaths: 2,
      certifications: 1,
      eventsLogged: 8,
      teamMembersRecruited: 5,
      organizationsLaunched: 0
    },
    nextFocus: [
      "Build and support a functioning team",
      "Train new volunteers",
      "Run recurring meetings",
      "Track team activity and accountability"
    ]
  },
  {
    key: "level_4_organization_builder",
    rank: 4,
    title: "Organization Builder",
    description:
      "Able to establish durable systems, launch structured teams, and create local organizational infrastructure.",
    requirements: {
      completedPaths: 3,
      certifications: 2,
      eventsLogged: 15,
      teamMembersRecruited: 12,
      organizationsLaunched: 1
    },
    nextFocus: [
      "Stand up durable systems",
      "Create role-based training",
      "Develop leaders under you",
      "Launch or stabilize a local organization"
    ]
  },
  {
    key: "level_5_regional_leader",
    rank: 5,
    title: "Regional Leader",
    description:
      "Coordinates multiple teams or organizations across a region and develops leadership pipelines.",
    requirements: {
      completedPaths: 4,
      certifications: 3,
      eventsLogged: 30,
      teamMembersRecruited: 25,
      organizationsLaunched: 2
    },
    nextFocus: [
      "Coordinate multiple local leaders",
      "Standardize reporting and accountability",
      "Support expansion into new communities",
      "Strengthen leadership coaching systems"
    ]
  },
  {
    key: "level_6_movement_architect",
    rank: 6,
    title: "Movement Architect",
    description:
      "Designs large-scale systems, develops institutions, and coordinates complex multi-team organizing strategy.",
    requirements: {
      completedPaths: 5,
      certifications: 4,
      eventsLogged: 50,
      teamMembersRecruited: 50,
      organizationsLaunched: 4
    },
    nextFocus: [
      "Design scalable organizing infrastructure",
      "Build institutions that outlast campaigns",
      "Develop advanced strategy and training systems",
      "Mentor regional leaders and organization builders"
    ]
  }
]

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function calculateRequirementProgress(
  current: number,
  required: number
): number {
  if (required <= 0) return 1
  return Math.min(current / required, 1)
}

function buildMissingRequirements(
  metrics: OrganizerProgressMetrics,
  nextLevel: OrganizerLevelDefinition
): string[] {
  const missing: string[] = []

  if (metrics.completedPaths < nextLevel.requirements.completedPaths) {
    missing.push(
      `Complete ${nextLevel.requirements.completedPaths - metrics.completedPaths} more training path(s)`
    )
  }

  if (metrics.certifications < nextLevel.requirements.certifications) {
    missing.push(
      `Earn ${nextLevel.requirements.certifications - metrics.certifications} more certification(s)`
    )
  }

  if (metrics.eventsLogged < nextLevel.requirements.eventsLogged) {
    missing.push(
      `Log ${nextLevel.requirements.eventsLogged - metrics.eventsLogged} more organizing event(s)`
    )
  }

  if (metrics.teamMembersRecruited < nextLevel.requirements.teamMembersRecruited) {
    missing.push(
      `Recruit ${nextLevel.requirements.teamMembersRecruited - metrics.teamMembersRecruited} more team member(s)`
    )
  }

  if (metrics.organizationsLaunched < nextLevel.requirements.organizationsLaunched) {
    missing.push(
      `Launch ${nextLevel.requirements.organizationsLaunched - metrics.organizationsLaunched} more organization(s)`
    )
  }

  return missing
}

function calculateReadinessPercent(
  metrics: OrganizerProgressMetrics,
  nextLevel: OrganizerLevelDefinition | null
): number {
  if (!nextLevel) return 100

  const requirementScores = [
    calculateRequirementProgress(
      metrics.completedPaths,
      nextLevel.requirements.completedPaths
    ),
    calculateRequirementProgress(
      metrics.certifications,
      nextLevel.requirements.certifications
    ),
    calculateRequirementProgress(
      metrics.eventsLogged,
      nextLevel.requirements.eventsLogged
    ),
    calculateRequirementProgress(
      metrics.teamMembersRecruited,
      nextLevel.requirements.teamMembersRecruited
    ),
    calculateRequirementProgress(
      metrics.organizationsLaunched,
      nextLevel.requirements.organizationsLaunched
    )
  ]

  const average =
    requirementScores.reduce((sum, value) => sum + value, 0) /
    requirementScores.length

  return Math.round(average * 100)
}

function resolveCurrentLevel(
  metrics: OrganizerProgressMetrics
): OrganizerLevelDefinition {
  let currentLevel = ORGANIZER_LEVELS[0]

  for (const level of ORGANIZER_LEVELS) {
    const qualifies =
      metrics.completedPaths >= level.requirements.completedPaths &&
      metrics.certifications >= level.requirements.certifications &&
      metrics.eventsLogged >= level.requirements.eventsLogged &&
      metrics.teamMembersRecruited >= level.requirements.teamMembersRecruited &&
      metrics.organizationsLaunched >= level.requirements.organizationsLaunched

    if (qualifies) {
      currentLevel = level
    }
  }

  return currentLevel
}

function resolveNextLevel(
  currentLevel: OrganizerLevelDefinition
): OrganizerLevelDefinition | null {
  return (
    ORGANIZER_LEVELS.find((level) => level.rank === currentLevel.rank + 1) ?? null
  )
}

/* -------------------------------------------------------------------------- */
/* DATA LOADERS                                                               */
/* -------------------------------------------------------------------------- */

async function getCompletedPathsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("training_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed")

  if (error) {
    throw error
  }

  return count ?? 0
}

async function getCertificationsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("training_certifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    throw error
  }

  return count ?? 0
}

async function getEventsLoggedCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("training_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    throw error
  }

  return count ?? 0
}

/**
 * Future-ready placeholders for deeper organizing tables.
 * For now these safely return 0 if the source table does not yet exist.
 */

async function getTeamMembersRecruitedCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("organizer_assignments")
      .select("*", { count: "exact", head: true })
      .eq("leader_id", userId)

    if (error) {
      return 0
    }

    return count ?? 0
  } catch {
    return 0
  }
}

async function getOrganizationsLaunchedCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId)

    if (error) {
      return 0
    }

    return count ?? 0
  } catch {
    return 0
  }
}

/* -------------------------------------------------------------------------- */
/* PUBLIC ENGINE                                                              */
/* -------------------------------------------------------------------------- */

export async function getOrganizerProgressMetrics(
  userId: string
): Promise<OrganizerProgressMetrics> {
  const [
    completedPaths,
    certifications,
    eventsLogged,
    teamMembersRecruited,
    organizationsLaunched
  ] = await Promise.all([
    getCompletedPathsCount(userId),
    getCertificationsCount(userId),
    getEventsLoggedCount(userId),
    getTeamMembersRecruitedCount(userId),
    getOrganizationsLaunchedCount(userId)
  ])

  return {
    completedPaths,
    certifications,
    eventsLogged,
    teamMembersRecruited,
    organizationsLaunched
  }
}

export async function getOrganizerProgress(
  userId: string
): Promise<OrganizerProgressResult> {
  const metrics = await getOrganizerProgressMetrics(userId)

  const currentLevel = resolveCurrentLevel(metrics)
  const nextLevel = resolveNextLevel(currentLevel)

  const readinessPercent = calculateReadinessPercent(metrics, nextLevel)
  const missingRequirements = nextLevel
    ? buildMissingRequirements(metrics, nextLevel)
    : []

  const recommendedActions =
    nextLevel?.nextFocus ?? [
      "Continue mentoring leaders",
      "Refine your systems",
      "Expand organizational reach"
    ]

  return {
    userId,
    currentLevel,
    nextLevel,
    metrics,
    readinessPercent,
    missingRequirements,
    recommendedActions
  }
}

export function listOrganizerLevels(): OrganizerLevelDefinition[] {
  return ORGANIZER_LEVELS
}
