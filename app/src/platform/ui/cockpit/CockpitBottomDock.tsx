import React from "react"

import type { CockpitWindowState } from "./cockpit.types"
import CockpitDockWindow from "./CockpitDockWindow"
import CockpitTelemetryPanel from "./CockpitTelemetryPanel"

type Props = {
  windows: CockpitWindowState[]
  onMinimize?: (windowId: string) => void
  onRestore?: (windowId: string) => void
  onMaximize?: (windowId: string) => void
}

function renderBottomContent(window: CockpitWindowState) {
  if (window.cardKey === "live_contacts_feed") {
    return <CockpitTelemetryPanel channel="live_contacts" title="Live Contacts" />
  }

  if (window.cardKey === "donation_stream") {
    return <CockpitTelemetryPanel channel="donations" title="Donation Stream" />
  }

  if (window.cardKey === "ai_alert_stream") {
    return <CockpitTelemetryPanel channel="ai_alerts" title="AI Alerts" />
  }

  return window.dashboardKey ?? window.cardKey ?? window.title
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
          {renderBottomContent(window)}
        </CockpitDockWindow>
      ))}
    </div>
  )
}