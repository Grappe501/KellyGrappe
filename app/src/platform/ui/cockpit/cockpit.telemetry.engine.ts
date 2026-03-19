import type {
  CockpitTelemetryChannel,
  CockpitTelemetryEvent,
  CockpitTelemetrySeverity,
  CockpitTelemetrySnapshot,
  CockpitTelemetrySubscription,
} from "./cockpit.telemetry.types"

type PublishEventInput = Omit<CockpitTelemetryEvent, "id" | "timestamp"> & {
  severity?: CockpitTelemetrySeverity
}

class CockpitTelemetryEngine {
  private events: CockpitTelemetryEvent[] = []
  private subscriptions = new Map<string, CockpitTelemetrySubscription>()

  publish(event: PublishEventInput): CockpitTelemetryEvent {
    const fullEvent: CockpitTelemetryEvent = {
      id:
        globalThis.crypto?.randomUUID?.() ??
        `telemetry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      severity: event.severity ?? "info",
      ...event,
    }

    this.events.unshift(fullEvent)
    this.notify(fullEvent)
    return fullEvent
  }

  getEvents(channel?: CockpitTelemetryChannel | string): CockpitTelemetryEvent[] {
    const events = !channel
      ? this.events
      : this.events.filter((event) => event.channel === channel)

    return [...events]
  }

  getSnapshot(channel: CockpitTelemetryChannel | string): CockpitTelemetrySnapshot {
    const events = this.getEvents(channel)

    return {
      channel,
      events,
      unreadCount: events.filter((event) => !event.read).length,
    }
  }

  getChannelEvents(channel: CockpitTelemetryChannel | string): CockpitTelemetryEvent[] {
    return this.getEvents(channel)
  }

  markRead(channel: CockpitTelemetryChannel | string): void {
    let changed = false

    this.events = this.events.map((event) => {
      if (event.channel !== channel || event.read) {
        return event
      }

      changed = true
      return {
        ...event,
        read: true,
      }
    })

    if (changed) {
      this.notify()
    }
  }

  clearChannel(channel: CockpitTelemetryChannel | string): void {
    const nextEvents = this.events.filter((event) => event.channel !== channel)

    if (nextEvents.length === this.events.length) {
      return
    }

    this.events = nextEvents
    this.notify()
  }

  subscribe(
    channelOrCallback: CockpitTelemetryChannel | string | (() => void),
    maybeCallback?: () => void,
  ): () => void {
    const channel =
      typeof channelOrCallback === "function" ? undefined : channelOrCallback
    const callback =
      typeof channelOrCallback === "function" ? channelOrCallback : maybeCallback

    if (!callback) {
      throw new Error("CockpitTelemetryEngine.subscribe requires a callback")
    }

    const id =
      globalThis.crypto?.randomUUID?.() ??
      `subscription-${Date.now()}-${Math.random().toString(36).slice(2)}`

    this.subscriptions.set(id, {
      id,
      channel,
      callback,
    })

    return () => {
      this.subscriptions.delete(id)
    }
  }

  seedDemoData(): void {
    this.publish({
      channel: "system",
      title: "Cockpit Initialized",
      severity: "info",
    })

    this.publish({
      channel: "ai_alerts",
      title: "AI Engines Online",
      severity: "info",
    })

    this.publish({
      channel: "field_reports",
      title: "Field Operations Ready",
      severity: "info",
    })
  }

  private notify(event?: CockpitTelemetryEvent): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.channel && event && subscription.channel !== event.channel) {
        continue
      }

      subscription.callback()
    }
  }
}

export const cockpitTelemetryEngine = new CockpitTelemetryEngine()
