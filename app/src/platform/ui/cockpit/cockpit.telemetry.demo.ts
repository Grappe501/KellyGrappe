import { cockpitTelemetryEngine } from "./cockpit.telemetry.engine"

let seeded = false

export function seedCockpitTelemetryDemo(): void {
  if (seeded) return
  seeded = true

  cockpitTelemetryEngine.publish({
    channel: "live_contacts",
    title: "New voter contact",
    message: "3 new contacts added from canvass upload",
    severity: "info",
    source: "field",
  })

  cockpitTelemetryEngine.publish({
    channel: "donations",
    title: "Donation spike",
    message: "Small dollar donations up today",
    severity: "success",
    source: "fundraising",
  })

  cockpitTelemetryEngine.publish({
    channel: "ai_alerts",
    title: "AI strategy alert",
    message: "Polling shift detected",
    severity: "warning",
    source: "strategy-ai",
  })
}
