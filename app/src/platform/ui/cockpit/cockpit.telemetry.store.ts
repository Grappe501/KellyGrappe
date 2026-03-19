import type {
  CockpitTelemetryChannel,
  CockpitTelemetryEvent,
  CockpitTelemetrySnapshot,
} from "./cockpit.telemetry.types"
import { cockpitTelemetryEngine } from "./cockpit.telemetry.engine"

export class CockpitTelemetryStore {
  getSnapshot(channel: CockpitTelemetryChannel | string): CockpitTelemetrySnapshot {
    return cockpitTelemetryEngine.getSnapshot(channel)
  }

  getRecent(
    channel: CockpitTelemetryChannel | string,
    limit = 10,
  ): CockpitTelemetryEvent[] {
    return cockpitTelemetryEngine.getChannelEvents(channel).slice(0, limit)
  }

  markRead(channel: CockpitTelemetryChannel | string): void {
    cockpitTelemetryEngine.markRead(channel)
  }

  clear(channel: CockpitTelemetryChannel | string): void {
    cockpitTelemetryEngine.clearChannel(channel)
  }
}

export const cockpitTelemetryStore = new CockpitTelemetryStore()
