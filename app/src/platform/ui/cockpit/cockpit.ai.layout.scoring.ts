import type {
  CockpitLayoutOptimizationResult,
  CockpitLayoutPreferenceProfile
} from "./cockpit.ai.layout.types"

function rankMap(scores: Record<string, number>): string[] {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key)
}

function subtractPenalty(
  positives: Record<string, number>,
  penalties: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {}

  const keys = new Set([
    ...Object.keys(positives),
    ...Object.keys(penalties)
  ])

  for (const key of keys) {
    result[key] = (positives[key] ?? 0) - (penalties[key] ?? 0)
  }

  return result
}

export class CockpitAiLayoutScoring {
  optimize(profile: CockpitLayoutPreferenceProfile): CockpitLayoutOptimizationResult {
    const dashboardNet = subtractPenalty(
      profile.focusScores,
      profile.minimizeScores
    )

    const rankedDashboards = rankMap(dashboardNet)
    const rankedUtilities = rankMap(profile.favoriteUtilityActions)

    const promotedDashboardKey = rankedDashboards[0]

    const remainingDashboards = rankedDashboards.filter(
      (key) => key !== promotedDashboardKey
    )

    return {
      promotedDashboardKey,
      suggestedLeftDock: remainingDashboards.slice(0, 2),
      suggestedRightDock: remainingDashboards.slice(2, 4),
      suggestedBottomDock: remainingDashboards.slice(4, 7),
      suggestedUtilityKeys: rankedUtilities.slice(0, 6),
      reasons: [
        promotedDashboardKey
          ? `Promoted ${promotedDashboardKey} based on focus behavior`
          : "No promoted dashboard available",
        `Recent sequence length: ${profile.recentSequence.length}`
      ]
    }
  }
}

export const cockpitAiLayoutScoring = new CockpitAiLayoutScoring()
