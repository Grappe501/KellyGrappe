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
