import React, { useEffect } from "react"

import type { CockpitLayoutState } from "./cockpit.types"
import { cockpitTelemetryStore } from "./cockpit.telemetry.store"
import { seedCockpitTelemetryDemo } from "./cockpit.telemetry.demo"

type Props = {
  layout: CockpitLayoutState
}

export default function CockpitStatusBar(props: Props) {
  useEffect(() => {
    seedCockpitTelemetryDemo()
  }, [])

  const visibleWindows =
    props.layout.windows.filter((window) => !window.minimized).length +
    props.layout.utilities.filter((window) => !window.minimized).length +
    (props.layout.center && !props.layout.center.minimized ? 1 : 0)

  const aiAlerts = cockpitTelemetryStore.getSnapshot("ai_alerts").unreadCount
  const contacts = cockpitTelemetryStore.getSnapshot("live_contacts").unreadCount
  const donations = cockpitTelemetryStore.getSnapshot("donations").unreadCount

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
        fontSize: "13px",
        flexWrap: "wrap"
      }}
    >
      <span>Visible Systems: {visibleWindows}</span>
      <span>Center: {props.layout.center?.title ?? "None"}</span>
      <span>AI Alerts: {aiAlerts}</span>
      <span>Contacts: {contacts}</span>
      <span>Donations: {donations}</span>
      <span>Cockpit Mode: Active</span>
    </div>
  )
}