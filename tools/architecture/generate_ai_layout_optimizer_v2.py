import argparse
import os
from pathlib import Path

FILES = {
    "app/src/platform/ui/cockpit/cockpit.ai.layout.types.ts": """
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
""",
    "app/src/platform/ui/cockpit/cockpit.ai.layout.memory.ts": """
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
""",
    "app/src/platform/ui/cockpit/cockpit.ai.layout.scoring.ts": """
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
""",
    "app/src/platform/ui/cockpit/cockpit.ai.layout.optimizer.v2.ts": """
import type { CockpitLayoutState } from "./cockpit.types"
import type {
  CockpitUsageSignal
} from "./cockpit.ai.layout.types"
import { cockpitAiLayoutMemory } from "./cockpit.ai.layout.memory"
import { cockpitAiLayoutScoring } from "./cockpit.ai.layout.scoring"

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export class CockpitAiLayoutOptimizerV2 {
  recordSignal(signal: CockpitUsageSignal): void {
    cockpitAiLayoutMemory.record(signal)
  }

  optimizeLayoutForUser(
    userId: string,
    layout: CockpitLayoutState
  ): CockpitLayoutState {
    const profile = cockpitAiLayoutMemory.get(userId)
    if (!profile) return layout

    const result = cockpitAiLayoutScoring.optimize(profile)

    let nextLayout: CockpitLayoutState = {
      ...layout,
      windows: [...layout.windows],
      utilities: [...layout.utilities]
    }

    if (result.promotedDashboardKey) {
      const match = nextLayout.windows.find(
        (window) => window.dashboardKey === result.promotedDashboardKey
      )

      if (match) {
        const remaining = nextLayout.windows.filter(
          (window) => window.id !== match.id
        )

        const demotedCenter = nextLayout.center
          ? {
              ...nextLayout.center,
              region: "rightDock" as const,
              size: "medium" as const
            }
          : undefined

        nextLayout = {
          ...nextLayout,
          center: {
            ...match,
            region: "center",
            size: "main",
            minimized: false,
            priority: match.priority + 20
          },
          windows: [
            ...(demotedCenter ? [demotedCenter] : []),
            ...remaining
          ]
        }
      }
    }

    nextLayout.windows = nextLayout.windows
      .map((window) => {
        const key = safeString(window.dashboardKey)
        const isPreferredLeft = result.suggestedLeftDock.includes(key)
        const isPreferredRight = result.suggestedRightDock.includes(key)
        const isPreferredBottom = result.suggestedBottomDock.includes(key)

        if (isPreferredLeft) {
          return {
            ...window,
            region: "leftDock" as const,
            minimized: false,
            priority: window.priority + 8
          }
        }

        if (isPreferredRight) {
          return {
            ...window,
            region: "rightDock" as const,
            minimized: false,
            priority: window.priority + 6
          }
        }

        if (isPreferredBottom) {
          return {
            ...window,
            region: "bottomDock" as const,
            minimized: false,
            priority: window.priority + 4
          }
        }

        return window
      })
      .sort((a, b) => b.priority - a.priority)

    nextLayout.utilities = nextLayout.utilities
      .map((utility) => {
        const key = safeString(utility.cardKey)
        return result.suggestedUtilityKeys.includes(key)
          ? {
              ...utility,
              minimized: false,
              priority: utility.priority + 10
            }
          : utility
      })
      .sort((a, b) => b.priority - a.priority)

    return nextLayout
  }
}

export const cockpitAiLayoutOptimizerV2 = new CockpitAiLayoutOptimizerV2()
""",
    "app/src/platform/ui/cockpit/cockpit.ai.layout.demo.ts": """
import { cockpitAiLayoutOptimizerV2 } from "./cockpit.ai.layout.optimizer.v2"

let seeded = false

export function seedCockpitAiLayoutDemo(userId = "demo-user"): void {
  if (seeded) return
  seeded = true

  const now = new Date().toISOString()

  cockpitAiLayoutOptimizerV2.recordSignal({
    userId,
    timestamp: now,
    dashboardKey: "war_room",
    windowId: "center-main",
    action: "focus"
  })

  cockpitAiLayoutOptimizerV2.recordSignal({
    userId,
    timestamp: now,
    dashboardKey: "strategy_room",
    windowId: "dock-1",
    action: "promote"
  })

  cockpitAiLayoutOptimizerV2.recordSignal({
    userId,
    timestamp: now,
    dashboardKey: "survey_polling_room",
    windowId: "dock-2",
    action: "focus"
  })

  cockpitAiLayoutOptimizerV2.recordSignal({
    userId,
    timestamp: now,
    cardKey: "ai",
    action: "utility_click"
  })
}
""",
    "app/src/platform/ui/cockpit/useCockpitAiLayout.ts": """
import { useEffect, useMemo, useState } from "react"

import type { CockpitLayoutState } from "./cockpit.types"
import type { CockpitUsageSignal } from "./cockpit.ai.layout.types"
import { cockpitAiLayoutOptimizerV2 } from "./cockpit.ai.layout.optimizer.v2"

export function useCockpitAiLayout(
  userId: string | undefined,
  baseLayout: CockpitLayoutState
) {
  const [layout, setLayout] = useState<CockpitLayoutState>(baseLayout)

  useEffect(() => {
    if (!userId) {
      setLayout(baseLayout)
      return
    }

    setLayout(
      cockpitAiLayoutOptimizerV2.optimizeLayoutForUser(userId, baseLayout)
    )
  }, [userId, baseLayout])

  const recordSignal = useMemo(() => {
    return (signal: Omit<CockpitUsageSignal, "userId" | "timestamp">) => {
      if (!userId) return

      cockpitAiLayoutOptimizerV2.recordSignal({
        ...signal,
        userId,
        timestamp: new Date().toISOString()
      })

      setLayout((current) =>
        cockpitAiLayoutOptimizerV2.optimizeLayoutForUser(userId, current)
      )
    }
  }, [userId])

  return {
    layout,
    setLayout,
    recordSignal
  }
}
"""
}

def write_file(path: Path, content: str, force: bool) -> None:
    if path.exists() and not force:
        print(f"skip {path}")
        return

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\\n", encoding="utf-8")
    print(f"created {path}")

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    os.chdir(args.repo_root)

    print("\\nGenerating AI Layout Optimizer V2...\\n")

    for relative_path, content in FILES.items():
        write_file(Path(relative_path), content, args.force)

    print("\\nAI Layout Optimizer V2 scaffold complete.\\n")

if __name__ == "__main__":
    main()