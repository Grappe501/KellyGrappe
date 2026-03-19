export interface CockpitUsageSignal {
  userId: string
  timestamp: string
  windowId?: string
  dashboardKey?: string
  cardKey?: string
  action:
    | "open"
    | "focus"
    | "minimize"
    | "restore"
    | "close"
    | "promote"
    | "telemetry_view"
    | "utility_click"
}

export interface CockpitLayoutPreferenceProfile {
  userId: string
  favoriteDashboardKeys: Record<string, number>
  favoriteCardKeys: Record<string, number>
  favoriteWindowIds: Record<string, number>
  favoriteUtilityActions: Record<string, number>
  focusScores: Record<string, number>
  minimizeScores: Record<string, number>
  restoreScores: Record<string, number>
  recentSequence: string[]
  updatedAt?: string
}

export interface CockpitLayoutOptimizationResult {
  promotedDashboardKey?: string
  suggestedLeftDock: string[]
  suggestedRightDock: string[]
  suggestedBottomDock: string[]
  suggestedUtilityKeys: string[]
  reasons: string[]
}
