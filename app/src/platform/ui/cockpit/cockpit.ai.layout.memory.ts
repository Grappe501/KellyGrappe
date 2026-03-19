import type {
  CockpitLayoutPreferenceProfile,
  CockpitUsageSignal
} from "./cockpit.ai.layout.types"

const RECENT_SEQUENCE_LIMIT = 25

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function incrementCounter(
  target: Record<string, number>,
  key: string,
  amount = 1
): void {
  const normalized = safeString(key)
  if (!normalized) return
  target[normalized] = (target[normalized] ?? 0) + amount
}

function pushRecent(
  target: string[],
  value: string
): string[] {
  const normalized = safeString(value)
  if (!normalized) return target

  return [
    normalized,
    ...target.filter((item) => item !== normalized)
  ].slice(0, RECENT_SEQUENCE_LIMIT)
}

export class CockpitAiLayoutMemory {
  private profiles: Record<string, CockpitLayoutPreferenceProfile> = {}

  record(signal: CockpitUsageSignal): CockpitLayoutPreferenceProfile {
    const profile = this.ensureProfile(signal.userId)

    if (signal.dashboardKey) {
      incrementCounter(profile.favoriteDashboardKeys, signal.dashboardKey)
    }

    if (signal.cardKey) {
      incrementCounter(profile.favoriteCardKeys, signal.cardKey)
    }

    if (signal.windowId) {
      incrementCounter(profile.favoriteWindowIds, signal.windowId)
    }

    if (signal.action === "focus" || signal.action === "promote") {
      if (signal.dashboardKey) {
        incrementCounter(profile.focusScores, signal.dashboardKey, 3)
      }
      if (signal.cardKey) {
        incrementCounter(profile.focusScores, signal.cardKey, 2)
      }
    }

    if (signal.action === "minimize") {
      if (signal.dashboardKey) {
        incrementCounter(profile.minimizeScores, signal.dashboardKey, 2)
      }
      if (signal.cardKey) {
        incrementCounter(profile.minimizeScores, signal.cardKey, 1)
      }
    }

    if (signal.action === "restore") {
      if (signal.dashboardKey) {
        incrementCounter(profile.restoreScores, signal.dashboardKey, 2)
      }
      if (signal.cardKey) {
        incrementCounter(profile.restoreScores, signal.cardKey, 1)
      }
    }

    if (signal.action === "utility_click" && signal.cardKey) {
      incrementCounter(profile.favoriteUtilityActions, signal.cardKey, 2)
    }

    profile.recentSequence = pushRecent(
      profile.recentSequence,
      signal.dashboardKey ?? signal.cardKey ?? signal.windowId ?? signal.action
    )

    profile.updatedAt = signal.timestamp
    return profile
  }

  get(userId: string): CockpitLayoutPreferenceProfile | null {
    return this.profiles[safeString(userId)] ?? null
  }

  clear(userId: string): void {
    delete this.profiles[safeString(userId)]
  }

  private ensureProfile(userId: string): CockpitLayoutPreferenceProfile {
    const normalized = safeString(userId)

    if (!this.profiles[normalized]) {
      this.profiles[normalized] = {
        userId: normalized,
        favoriteDashboardKeys: {},
        favoriteCardKeys: {},
        favoriteWindowIds: {},
        favoriteUtilityActions: {},
        focusScores: {},
        minimizeScores: {},
        restoreScores: {},
        recentSequence: []
      }
    }

    return this.profiles[normalized]
  }
}

export const cockpitAiLayoutMemory = new CockpitAiLayoutMemory()
