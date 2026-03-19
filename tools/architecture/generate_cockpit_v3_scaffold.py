from pathlib import Path

ROOT = Path("app/src/platform/ui/cockpit")

FILES = {
    "cockpit.grid.engine.ts": """
import type {
  CockpitLayoutState,
  CockpitWindowDimensions,
  CockpitWindowSize,
  CockpitWindowState
} from "./cockpit.types"

const SIZE_TO_DIMENSIONS: Record<CockpitWindowSize, CockpitWindowDimensions> = {
  tiny: { columns: 1, rows: 1 },
  small: { columns: 2, rows: 1 },
  medium: { columns: 3, rows: 2 },
  large: { columns: 4, rows: 2 },
  main: { columns: 8, rows: 4 }
}

export interface CockpitGridPlacement {
  windowId: string
  columnSpan: number
  rowSpan: number
  order: number
}

export interface CockpitGridLayout {
  left: CockpitGridPlacement[]
  center?: CockpitGridPlacement
  right: CockpitGridPlacement[]
  bottom: CockpitGridPlacement[]
  utilities: CockpitGridPlacement[]
}

function toPlacement(
  window: CockpitWindowState,
  order: number
): CockpitGridPlacement {
  const dimensions = SIZE_TO_DIMENSIONS[window.size]

  return {
    windowId: window.id,
    columnSpan: dimensions.columns,
    rowSpan: dimensions.rows ?? 1,
    order
  }
}

export class CockpitGridEngine {
  buildGrid(layout: CockpitLayoutState): CockpitGridLayout {
    const left = layout.windows
      .filter((window) => window.region === "leftDock" && !window.minimized)
      .sort((a, b) => b.priority - a.priority)
      .map((window, index) => toPlacement(window, index))

    const right = layout.windows
      .filter((window) => window.region === "rightDock" && !window.minimized)
      .sort((a, b) => b.priority - a.priority)
      .map((window, index) => toPlacement(window, index))

    const bottom = layout.windows
      .filter((window) => window.region === "bottomDock" && !window.minimized)
      .sort((a, b) => b.priority - a.priority)
      .map((window, index) => toPlacement(window, index))

    const utilities = layout.utilities
      .filter((window) => !window.minimized)
      .sort((a, b) => b.priority - a.priority)
      .map((window, index) => toPlacement(window, index))

    return {
      left,
      center: layout.center && !layout.center.minimized
        ? toPlacement(layout.center, 0)
        : undefined,
      right,
      bottom,
      utilities
    }
  }
}

export const cockpitGridEngine = new CockpitGridEngine()
""",
    "cockpit.resize.engine.ts": """
import type {
  CockpitLayoutState,
  CockpitWindowSize,
  CockpitWindowState
} from "./cockpit.types"

function resizeWindow(
  window: CockpitWindowState,
  size: CockpitWindowSize
): CockpitWindowState {
  return {
    ...window,
    size
  }
}

export class CockpitResizeEngine {
  rebalance(layout: CockpitLayoutState): CockpitLayoutState {
    const visibleDockWindows = layout.windows.filter((window) => !window.minimized)

    const resizedWindows = layout.windows.map((window) => {
      if (window.minimized) return window

      if (visibleDockWindows.length <= 2) {
        return resizeWindow(window, "large")
      }

      if (visibleDockWindows.length <= 4) {
        return resizeWindow(window, "medium")
      }

      return resizeWindow(window, "small")
    })

    return {
      ...layout,
      windows: resizedWindows
    }
  }

  fullscreenCenter(layout: CockpitLayoutState): CockpitLayoutState {
    if (!layout.center) return layout

    return {
      ...layout,
      center: {
        ...layout.center,
        size: "main",
        minimized: false
      },
      windows: layout.windows.map((window) => ({
        ...window,
        minimized: true
      }))
    }
  }
}

export const cockpitResizeEngine = new CockpitResizeEngine()
""",
    "cockpit.window.stack.engine.ts": """
import type {
  CockpitLayoutState,
  CockpitRegion,
  CockpitWindowState
} from "./cockpit.types"

function moveWindowToRegion(
  window: CockpitWindowState,
  region: CockpitRegion
): CockpitWindowState {
  return {
    ...window,
    region,
    minimized: false
  }
}

export class CockpitWindowStackEngine {
  openInDock(
    layout: CockpitLayoutState,
    dashboardKey: string,
    title?: string
  ): CockpitLayoutState {
    const nextWindow: CockpitWindowState = {
      id: `dynamic-${dashboardKey}`,
      title: title ?? dashboardKey,
      dashboardKey,
      region: "rightDock",
      size: "medium",
      minimized: false,
      visible: true,
      priority: 40
    }

    return {
      ...layout,
      windows: [...layout.windows, nextWindow]
    }
  }

  promoteToCenter(
    layout: CockpitLayoutState,
    windowId: string
  ): CockpitLayoutState {
    const selected =
      layout.center?.id === windowId
        ? layout.center
        : layout.windows.find((window) => window.id === windowId)

    if (!selected) return layout

    const remaining = layout.windows.filter((window) => window.id !== windowId)
    const demotedCenter =
      layout.center && layout.center.id !== selected.id
        ? moveWindowToRegion(layout.center, "rightDock")
        : undefined

    return {
      ...layout,
      center: moveWindowToRegion(selected, "center"),
      windows: [
        ...(demotedCenter ? [demotedCenter] : []),
        ...remaining
      ]
    }
  }

  closeWindow(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    return {
      ...layout,
      center:
        layout.center?.id === windowId
          ? undefined
          : layout.center,
      windows: layout.windows.filter((window) => window.id !== windowId),
      utilities: layout.utilities.filter((window) => window.id !== windowId)
    }
  }
}

export const cockpitWindowStackEngine = new CockpitWindowStackEngine()
""",
    "cockpit.ai.layout.optimizer.ts": """
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
""",
    "CockpitBottomDock.tsx": """
import React from "react"
import type { CockpitWindowState } from "./cockpit.types"
import CockpitDockWindow from "./CockpitDockWindow"

type Props = {
  windows: CockpitWindowState[]
  onMinimize?: (windowId: string) => void
  onRestore?: (windowId: string) => void
  onMaximize?: (windowId: string) => void
}

export default function CockpitBottomDock(props: Props) {
  const visible = props.windows.filter(
    (window) => window.region === "bottomDock" && !window.minimized
  )

  if (visible.length === 0) return null

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(visible.length, 4)}, minmax(0, 1fr))`,
        gap: "16px"
      }}
    >
      {visible.map((window) => (
        <CockpitDockWindow
          key={window.id}
          title={window.title}
          onMinimize={() => props.onMinimize?.(window.id)}
          onRestore={() => props.onRestore?.(window.id)}
          onMaximize={() => props.onMaximize?.(window.id)}
        >
          {window.dashboardKey ?? window.cardKey ?? window.title}
        </CockpitDockWindow>
      ))}
    </div>
  )
}
""",
    "CockpitStatusBar.tsx": """
import React from "react"
import type { CockpitLayoutState } from "./cockpit.types"

type Props = {
  layout: CockpitLayoutState
}

export default function CockpitStatusBar(props: Props) {
  const visibleWindows =
    props.layout.windows.filter((window) => !window.minimized).length +
    props.layout.utilities.filter((window) => !window.minimized).length +
    (props.layout.center && !props.layout.center.minimized ? 1 : 0)

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 12px",
        border: "1px solid #1f2937",
        borderRadius: "12px",
        background: "#111827",
        color: "#cbd5e1",
        fontSize: "13px"
      }}
    >
      <span>Visible Systems: {visibleWindows}</span>
      <span>Center: {props.layout.center?.title ?? "None"}</span>
      <span>Cockpit Mode: Active</span>
    </div>
  )
}
""",
    "CockpitDashboardShell.tsx": """
import React, { useMemo, useState } from "react"

import type { CockpitLayoutState } from "./cockpit.types"

import { cockpitAdaptiveEngine } from "./cockpit.adaptive.engine"
import { cockpitAiLayoutOptimizer } from "./cockpit.ai.layout.optimizer"
import { cockpitLayoutEngine } from "./cockpit.layout.engine"
import { cockpitResizeEngine } from "./cockpit.resize.engine"
import { cockpitWindowManager } from "./cockpit.window.manager"

import CockpitBottomDock from "./CockpitBottomDock"
import CockpitDockWindow from "./CockpitDockWindow"
import CockpitMainViewport from "./CockpitMainViewport"
import CockpitStatusBar from "./CockpitStatusBar"
import CockpitUtilityRing from "./CockpitUtilityRing"

type Props = {
  userId?: string
  primaryDashboardKey?: string
}

export default function CockpitDashboardShell(props: Props) {
  const initialLayout: CockpitLayoutState = useMemo(() => {
    const base = cockpitLayoutEngine.buildLayout({
      primaryDashboardKey: props.primaryDashboardKey ?? "war_room",
      surroundingDashboardKeys: [
        "strategy_room",
        "survey_polling_room",
        "communications_room",
        "fundraising_room"
      ],
      utilityKeys: ["circles", "dashboards", "ai", "profile", "system"]
    })

    const adapted = props.userId
      ? cockpitAdaptiveEngine.adaptLayoutForUser(props.userId, base)
      : base

    const optimized = props.userId
      ? cockpitAiLayoutOptimizer.optimizeForUser(props.userId, adapted)
      : adapted

    return cockpitResizeEngine.rebalance(optimized)
  }, [props.primaryDashboardKey, props.userId])

  const [layout, setLayout] = useState<CockpitLayoutState>(initialLayout)

  return (
    <div
      style={{
        display: "grid",
        gap: "16px",
        padding: "16px",
        background: "#030712",
        minHeight: "100vh"
      }}
    >
      <CockpitStatusBar layout={layout} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 5fr 2fr",
          gap: "16px"
        }}
      >
        <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
          {layout.windows
            .filter((window) => window.region === "leftDock" && !window.minimized)
            .map((window) => (
              <CockpitDockWindow
                key={window.id}
                title={window.title}
                onMinimize={() =>
                  setLayout((current) =>
                    cockpitWindowManager.minimize(current, window.id)
                  )
                }
                onRestore={() =>
                  setLayout((current) =>
                    cockpitWindowManager.restore(current, window.id)
                  )
                }
                onMaximize={() =>
                  setLayout((current) =>
                    cockpitWindowManager.maximize(current, window.id)
                  )
                }
              >
                {window.dashboardKey ?? window.title}
              </CockpitDockWindow>
            ))}
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          <CockpitMainViewport title={layout.center?.title ?? "Main Dashboard"}>
            {layout.center?.dashboardKey ?? "center"}
          </CockpitMainViewport>

          <CockpitUtilityRing />
        </div>

        <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
          {layout.windows
            .filter((window) => window.region === "rightDock" && !window.minimized)
            .map((window) => (
              <CockpitDockWindow
                key={window.id}
                title={window.title}
                onMinimize={() =>
                  setLayout((current) =>
                    cockpitWindowManager.minimize(current, window.id)
                  )
                }
                onRestore={() =>
                  setLayout((current) =>
                    cockpitWindowManager.restore(current, window.id)
                  )
                }
                onMaximize={() =>
                  setLayout((current) =>
                    cockpitWindowManager.maximize(current, window.id)
                  )
                }
              >
                {window.dashboardKey ?? window.title}
              </CockpitDockWindow>
            ))}
        </div>
      </div>

      <CockpitBottomDock
        windows={layout.windows}
        onMinimize={(windowId) =>
          setLayout((current) => cockpitWindowManager.minimize(current, windowId))
        }
        onRestore={(windowId) =>
          setLayout((current) => cockpitWindowManager.restore(current, windowId))
        }
        onMaximize={(windowId) =>
          setLayout((current) => cockpitWindowManager.maximize(current, windowId))
        }
      />
    </div>
  )
}
"""
}


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def main() -> None:
    print("Generating Cockpit V3 scaffold...")

    for filename, content in FILES.items():
        file_path = ROOT / filename
        write_file(file_path, content)
        print(f"created {file_path}")

    print("Cockpit V3 scaffold complete.")


if __name__ == "__main__":
    main()