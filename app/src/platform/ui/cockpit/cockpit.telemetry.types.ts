export type CockpitTelemetrySeverity =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "critical"

export type CockpitTelemetryChannel =
  | "live_contacts"
  | "donations"
  | "field_reports"
  | "ai_alerts"
  | "polling"
  | "fundraising_progress"
  | "system"
  | "custom"

export interface CockpitTelemetryEvent {
  id: string
  channel: CockpitTelemetryChannel | string
  title: string
  message?: string
  severity: CockpitTelemetrySeverity
  timestamp: string
  read?: boolean
  source?: string
  payload?: Record<string, unknown>
}

export interface CockpitTelemetrySubscription {
  id: string
  channel?: CockpitTelemetryChannel | string
  callback: () => void
}

export interface CockpitTelemetrySnapshot {
  channel: CockpitTelemetryChannel | string
  events: CockpitTelemetryEvent[]
  unreadCount: number
}
