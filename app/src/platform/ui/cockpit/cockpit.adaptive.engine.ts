import { userPathIntelligenceEngine } from "@platform/monitoring/userPathIntelligence.engine"
import type { CockpitLayoutState } from "./cockpit.types"

export class CockpitAdaptiveEngine {
  adaptLayoutForUser(
    userId: string,
    layout: CockpitLayoutState
  ): CockpitLayoutState {
    const report = userPathIntelligenceEngine.buildReport(userId)
    if (!report) return layout

    const recommendedKeys = new Set(
      report.recommendations.slice(0, 5).map((item) => item.key)
    )

    return {
      ...layout,
      windows: layout.windows
        .map((window) => ({
          ...window,
          priority: recommendedKeys.has(window.dashboardKey ?? "")
            ? window.priority + 15
            : window.priority
        }))
        .sort((a, b) => b.priority - a.priority),
      utilities: layout.utilities
        .map((utility) => ({
          ...utility,
          priority: recommendedKeys.has(utility.cardKey ?? "")
            ? utility.priority + 10
            : utility.priority
        }))
        .sort((a, b) => b.priority - a.priority)
    }
  }
}

export const cockpitAdaptiveEngine = new CockpitAdaptiveEngine()