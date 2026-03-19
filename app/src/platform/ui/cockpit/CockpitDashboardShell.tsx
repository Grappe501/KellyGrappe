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
import CockpitTelemetryPanel from "./CockpitTelemetryPanel"
import CockpitUtilityRing from "./CockpitUtilityRing"

type Props = {
  userId?: string
  primaryDashboardKey?: string
}

function renderDockContent(window: { dashboardKey?: string; cardKey?: string; title: string }) {
  if (window.cardKey === "ai_alert_stream") {
    return <CockpitTelemetryPanel channel="ai_alerts" title="AI Alerts" />
  }

  if (window.cardKey === "live_contacts_feed") {
    return <CockpitTelemetryPanel channel="live_contacts" title="Live Contacts" />
  }

  return window.dashboardKey ?? window.cardKey ?? window.title
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

    const telemetryEnhanced: CockpitLayoutState = {
      ...base,
      windows: [
        ...base.windows,
        {
          id: "telemetry-ai-alerts",
          title: "AI Alerts",
          cardKey: "ai_alert_stream",
          region: "leftDock",
          size: "small",
          minimized: false,
          visible: true,
          priority: 60
        },
        {
          id: "telemetry-live-contacts",
          title: "Live Contacts",
          cardKey: "live_contacts_feed",
          region: "bottomDock",
          size: "medium",
          minimized: false,
          visible: true,
          priority: 55
        },
        {
          id: "telemetry-donations",
          title: "Donation Stream",
          cardKey: "donation_stream",
          region: "bottomDock",
          size: "medium",
          minimized: false,
          visible: true,
          priority: 50
        }
      ]
    }

    const adapted = props.userId
      ? cockpitAdaptiveEngine.adaptLayoutForUser(props.userId, telemetryEnhanced)
      : telemetryEnhanced

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
                {renderDockContent(window)}
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
                {renderDockContent(window)}
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