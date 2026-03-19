from pathlib import Path

ROOT = Path("app/src/platform/ui/cockpit")

FILES = {
    "cockpit.types.ts": """
export type CockpitWindowSize = "tiny" | "small" | "medium" | "large" | "main"

export type CockpitRegion =
  | "center"
  | "leftDock"
  | "rightDock"
  | "bottomDock"
  | "utility"

export interface CockpitWindowState {
  id: string
  dashboardKey?: string
  cardKey?: string
  title: string
  region: CockpitRegion
  size: CockpitWindowSize
  minimized: boolean
  visible: boolean
  pinned?: boolean
  priority: number
}

export interface CockpitLayoutState {
  center?: CockpitWindowState
  windows: CockpitWindowState[]
  utilities: CockpitWindowState[]
}

export interface CockpitUserPreferences {
  userId: string
  preferredWindows: string[]
  preferredCards: string[]
}

export interface CockpitLayoutRequest {
  primaryDashboardKey: string
  surroundingDashboardKeys?: string[]
  utilityKeys?: string[]
}

export interface CockpitWindowDimensions {
  columns: number
  rows?: number
}
""",
    "cockpit.layout.engine.ts": """
import type {
  CockpitLayoutRequest,
  CockpitLayoutState,
  CockpitRegion,
  CockpitWindowDimensions,
  CockpitWindowSize,
  CockpitWindowState
} from "./cockpit.types"

const SIZE_TO_DIMENSIONS: Record<CockpitWindowSize, CockpitWindowDimensions> = {
  tiny: { columns: 1 },
  small: { columns: 2 },
  medium: { columns: 3 },
  large: { columns: 4 },
  main: { columns: 8 }
}

function buildWindow(
  id: string,
  title: string,
  region: CockpitRegion,
  size: CockpitWindowSize,
  priority: number,
  dashboardKey?: string,
  cardKey?: string
): CockpitWindowState {
  return {
    id,
    title,
    region,
    size,
    minimized: false,
    visible: true,
    priority,
    dashboardKey,
    cardKey
  }
}

export class CockpitLayoutEngine {
  buildDefaultLayout(): CockpitLayoutState {
    return this.buildLayout({
      primaryDashboardKey: "war_room",
      surroundingDashboardKeys: ["strategy_room", "survey_polling_room"],
      utilityKeys: ["circles", "dashboards", "ai", "profile"]
    })
  }

  buildLayout(request: CockpitLayoutRequest): CockpitLayoutState {
    const center = buildWindow(
      "center-main",
      request.primaryDashboardKey,
      "center",
      "main",
      100,
      request.primaryDashboardKey
    )

    const surrounding = (request.surroundingDashboardKeys ?? []).map((key, index) => {
      const region: CockpitRegion =
        index === 0 ? "leftDock" :
        index === 1 ? "rightDock" :
        "bottomDock"

      const size: CockpitWindowSize =
        index < 2 ? "large" : "medium"

      return buildWindow(
        `dock-${index + 1}`,
        key,
        region,
        size,
        50 - index,
        key
      )
    })

    const utilities = (request.utilityKeys ?? []).map((key, index) =>
      buildWindow(
        `utility-${index + 1}`,
        key,
        "utility",
        "tiny",
        10 - index,
        undefined,
        key
      )
    )

    return {
      center,
      windows: surrounding,
      utilities
    }
  }

  minimizeWindow(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    return {
      ...layout,
      center:
        layout.center?.id === windowId
          ? { ...layout.center, minimized: true }
          : layout.center,
      windows: layout.windows.map((window) =>
        window.id === windowId ? { ...window, minimized: true } : window
      ),
      utilities: layout.utilities.map((window) =>
        window.id === windowId ? { ...window, minimized: true } : window
      )
    }
  }

  restoreWindow(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    return {
      ...layout,
      center:
        layout.center?.id === windowId
          ? { ...layout.center, minimized: false }
          : layout.center,
      windows: layout.windows.map((window) =>
        window.id === windowId ? { ...window, minimized: false } : window
      ),
      utilities: layout.utilities.map((window) =>
        window.id === windowId ? { ...window, minimized: false } : window
      )
    }
  }

  maximizeToCenter(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    const selected =
      layout.center?.id === windowId
        ? layout.center
        : layout.windows.find((window) => window.id === windowId)

    if (!selected) return layout

    const demotedCenter = layout.center && layout.center.id !== selected.id
      ? { ...layout.center, region: "rightDock" as CockpitRegion, size: "medium" as CockpitWindowSize }
      : undefined

    const remainingWindows = layout.windows.filter((window) => window.id !== windowId)

    return {
      ...layout,
      center: {
        ...selected,
        region: "center",
        size: "main",
        minimized: false
      },
      windows: [
        ...(demotedCenter ? [demotedCenter] : []),
        ...remainingWindows.map((window) =>
          window.id === windowId
            ? window
            : window
        )
      ]
    }
  }

  getDimensions(size: CockpitWindowSize): CockpitWindowDimensions {
    return SIZE_TO_DIMENSIONS[size]
  }
}

export const cockpitLayoutEngine = new CockpitLayoutEngine()
""",
    "cockpit.window.manager.ts": """
import type { CockpitLayoutState } from "./cockpit.types"
import { cockpitLayoutEngine } from "./cockpit.layout.engine"

export class CockpitWindowManager {
  minimize(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    return cockpitLayoutEngine.minimizeWindow(layout, windowId)
  }

  restore(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    return cockpitLayoutEngine.restoreWindow(layout, windowId)
  }

  maximize(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    return cockpitLayoutEngine.maximizeToCenter(layout, windowId)
  }
}

export const cockpitWindowManager = new CockpitWindowManager()
""",
    "cockpit.preference.engine.ts": """
import type { CockpitLayoutState, CockpitUserPreferences } from "./cockpit.types"

export class CockpitPreferenceEngine {
  private store: Record<string, CockpitUserPreferences> = {}

  get(userId: string): CockpitUserPreferences | null {
    return this.store[userId] ?? null
  }

  save(preferences: CockpitUserPreferences): void {
    this.store[preferences.userId] = preferences
  }

  applyLayoutPreferences(
    userId: string,
    layout: CockpitLayoutState
  ): CockpitLayoutState {
    const preferences = this.get(userId)
    if (!preferences) return layout

    const preferredWindowSet = new Set(preferences.preferredWindows)

    return {
      ...layout,
      windows: layout.windows
        .map((window) => ({
          ...window,
          priority: preferredWindowSet.has(window.dashboardKey ?? "")
            ? window.priority + 20
            : window.priority
        }))
        .sort((a, b) => b.priority - a.priority)
    }
  }
}

export const cockpitPreferenceEngine = new CockpitPreferenceEngine()
""",
    "cockpit.widget.engine.ts": """
export interface CockpitWidgetButton {
  id: string
  label: string
  action: string
  priority: number
}

export class CockpitWidgetEngine {
  getDefaultWidgets(): CockpitWidgetButton[] {
    return [
      { id: "circles", label: "Circles", action: "open_circles", priority: 100 },
      { id: "dashboards", label: "Dashboards", action: "open_dashboards", priority: 95 },
      { id: "ai", label: "AI Copilot", action: "open_ai", priority: 90 },
      { id: "profile", label: "My Page", action: "open_profile", priority: 85 },
      { id: "system", label: "System", action: "open_system", priority: 80 }
    ]
  }
}

export const cockpitWidgetEngine = new CockpitWidgetEngine()
""",
    "cockpit.adaptive.engine.ts": """
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
""",
    "CockpitWindowControls.tsx": """
import React from "react"

type Props = {
  onMinimize?: () => void
  onRestore?: () => void
  onMaximize?: () => void
}

export default function CockpitWindowControls(props: Props) {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      <button onClick={props.onMinimize}>_</button>
      <button onClick={props.onRestore}>◱</button>
      <button onClick={props.onMaximize}>▣</button>
    </div>
  )
}
""",
    "CockpitDockWindow.tsx": """
import React from "react"
import CockpitWindowControls from "./CockpitWindowControls"

type Props = {
  title: string
  children?: React.ReactNode
  onMinimize?: () => void
  onRestore?: () => void
  onMaximize?: () => void
}

export default function CockpitDockWindow(props: Props) {
  return (
    <div
      style={{
        border: "1px solid #334155",
        borderRadius: "12px",
        background: "#0f172a",
        color: "#e2e8f0",
        padding: "12px",
        minHeight: "180px"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px"
        }}
      >
        <strong>{props.title}</strong>
        <CockpitWindowControls
          onMinimize={props.onMinimize}
          onRestore={props.onRestore}
          onMaximize={props.onMaximize}
        />
      </div>

      <div>{props.children}</div>
    </div>
  )
}
""",
    "CockpitMainViewport.tsx": """
import React from "react"

type Props = {
  title: string
  children?: React.ReactNode
}

export default function CockpitMainViewport(props: Props) {
  return (
    <div
      style={{
        border: "1px solid #1e293b",
        borderRadius: "16px",
        background: "#020617",
        color: "#f8fafc",
        padding: "16px",
        minHeight: "420px"
      }}
    >
      <div style={{ marginBottom: "12px", fontSize: "20px", fontWeight: 700 }}>
        {props.title}
      </div>

      <div>{props.children}</div>
    </div>
  )
}
""",
    "CockpitUtilityRing.tsx": """
import React from "react"
import { cockpitWidgetEngine } from "./cockpit.widget.engine"

type Props = {
  onAction?: (action: string) => void
}

export default function CockpitUtilityRing(props: Props) {
  const widgets = cockpitWidgetEngine.getDefaultWidgets()

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px"
      }}
    >
      {widgets.map((widget) => (
        <button
          key={widget.id}
          onClick={() => props.onAction?.(widget.action)}
          style={{
            borderRadius: "999px",
            padding: "8px 12px",
            border: "1px solid #475569",
            background: "#111827",
            color: "#e5e7eb",
            cursor: "pointer"
          }}
        >
          {widget.label}
        </button>
      ))}
    </div>
  )
}
""",
    "CockpitDashboardShell.tsx": """
import React, { useMemo, useState } from "react"
import { cockpitAdaptiveEngine } from "./cockpit.adaptive.engine"
import { cockpitLayoutEngine } from "./cockpit.layout.engine"
import { cockpitWindowManager } from "./cockpit.window.manager"
import CockpitDockWindow from "./CockpitDockWindow"
import CockpitMainViewport from "./CockpitMainViewport"
import CockpitUtilityRing from "./CockpitUtilityRing"

type Props = {
  userId?: string
  primaryDashboardKey?: string
}

export default function CockpitDashboardShell(props: Props) {
  const initialLayout = useMemo(() => {
    const base = cockpitLayoutEngine.buildLayout({
      primaryDashboardKey: props.primaryDashboardKey ?? "war_room",
      surroundingDashboardKeys: [
        "strategy_room",
        "survey_polling_room",
        "communications_room"
      ],
      utilityKeys: ["circles", "dashboards", "ai", "profile", "system"]
    })

    return props.userId
      ? cockpitAdaptiveEngine.adaptLayoutForUser(props.userId, base)
      : base
  }, [props.primaryDashboardKey, props.userId])

  const [layout, setLayout] = useState(initialLayout)

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 5fr 2fr",
        gap: "16px",
        padding: "16px",
        background: "#030712",
        minHeight: "100vh"
      }}
    >
      <div style={{ display: "grid", gap: "16px" }}>
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
              onMaximize={() =>
                setLayout((current) =>
                  cockpitWindowManager.maximize(current, window.id)
                )
              }
            >
              {window.dashboardKey}
            </CockpitDockWindow>
          ))}
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        <CockpitMainViewport title={layout.center?.title ?? "Main Dashboard"}>
          {layout.center?.dashboardKey}
        </CockpitMainViewport>

        <CockpitUtilityRing />
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
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
              onMaximize={() =>
                setLayout((current) =>
                  cockpitWindowManager.maximize(current, window.id)
                )
              }
            >
              {window.dashboardKey}
            </CockpitDockWindow>
          ))}
      </div>
    </div>
  )
}
"""
}


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def generate() -> None:
    print("Generating Cockpit System v2...")

    for filename, content in FILES.items():
      file_path = ROOT / filename
      write_file(file_path, content)
      print(f"created {file_path}")

    print("Cockpit scaffold complete.")


if __name__ == "__main__":
    generate()