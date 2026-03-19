import { userPathIntelligenceEngine } from "@platform/monitoring/userPathIntelligence.engine"
import type { CockpitLayoutState } from "./cockpit.types"

export class CockpitAiLayoutOptimizer {
  optimizeForUser(
    userId: string,
    layout: CockpitLayoutState
  ): CockpitLayoutState {
    const report = userPathIntelligenceEngine.buildReport(userId)
    if (!report) return layout

    const topDashboard = report.dashboards[0]?.dashboardKey

    if (!topDashboard) return layout

    if (layout.center?.dashboardKey === topDashboard) {
      return layout
    }

    const matchingWindow = layout.windows.find(
      (window) => window.dashboardKey === topDashboard
    )

    if (!matchingWindow) return layout

    const remainingWindows = layout.windows.filter(
      (window) => window.id !== matchingWindow.id
    )

    const demotedCenter = layout.center
      ? {
          ...layout.center,
          region: "rightDock" as const,
          size: "medium" as const,
          priority: layout.center.priority - 10
        }
      : undefined

    return {
      ...layout,
      center: {
        ...matchingWindow,
        region: "center",
        size: "main",
        priority: matchingWindow.priority + 25
      },
      windows: [
        ...(demotedCenter ? [demotedCenter] : []),
        ...remainingWindows
      ].sort((a, b) => b.priority - a.priority)
    }
  }
}

export const cockpitAiLayoutOptimizer = new CockpitAiLayoutOptimizer()
