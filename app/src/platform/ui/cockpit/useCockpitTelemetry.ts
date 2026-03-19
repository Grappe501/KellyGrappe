import { useEffect, useState } from "react"
import { cockpitTelemetryEngine } from "./cockpit.telemetry.engine"
import type { CockpitTelemetryEvent } from "./cockpit.telemetry.types"

export function useCockpitTelemetry(channel: string) {
  const [events, setEvents] = useState<CockpitTelemetryEvent[]>(
    cockpitTelemetryEngine.getEvents(channel),
  )

  useEffect(() => {
    setEvents(cockpitTelemetryEngine.getEvents(channel))

    const unsubscribe = cockpitTelemetryEngine.subscribe(channel, () => {
      setEvents(cockpitTelemetryEngine.getEvents(channel))
    })

    return unsubscribe
  }, [channel])

  return { events }
}
