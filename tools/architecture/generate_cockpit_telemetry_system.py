import os
import argparse
from pathlib import Path

FILES = {
    "app/src/platform/ui/cockpit/cockpit.telemetry.types.ts": """
export type CockpitTelemetrySeverity =
  | "info"
  | "success"
  | "warning"
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
  source?: string
  payload?: Record<string, unknown>
}

export interface CockpitTelemetrySubscription {
  id: string
  channel: CockpitTelemetryChannel | string
  callback: (event: CockpitTelemetryEvent) => void
}

export interface CockpitTelemetrySnapshot {
  channel: CockpitTelemetryChannel | string
  events: CockpitTelemetryEvent[]
  unreadCount: number
}
""",

    "app/src/platform/ui/cockpit/cockpit.telemetry.engine.ts": """
import { CockpitTelemetryEvent } from "./cockpit.telemetry.types"

function makeId() {
  return "telemetry_" + Date.now() + "_" + Math.random().toString(36).slice(2)
}

export class CockpitTelemetryEngine {

  private events: Record<string, CockpitTelemetryEvent[]> = {}
  private subscribers: Record<string, Function[]> = {}

  publish(eventInput: Omit<CockpitTelemetryEvent,"id"|"timestamp">): CockpitTelemetryEvent {

    const event: CockpitTelemetryEvent = {
      ...eventInput,
      id: makeId(),
      timestamp: new Date().toISOString()
    }

    const channel = event.channel

    if (!this.events[channel]) {
      this.events[channel] = []
    }

    this.events[channel].unshift(event)

    if (this.subscribers[channel]) {
      for (const cb of this.subscribers[channel]) {
        cb(event)
      }
    }

    return event
  }

  subscribe(channel:string,callback:(event:CockpitTelemetryEvent)=>void) {

    if (!this.subscribers[channel]) {
      this.subscribers[channel] = []
    }

    this.subscribers[channel].push(callback)

    return () => {
      this.subscribers[channel] =
        this.subscribers[channel].filter(cb => cb !== callback)
    }
  }

  getEvents(channel:string) {
    return this.events[channel] || []
  }

}

export const cockpitTelemetryEngine = new CockpitTelemetryEngine()
""",

    "app/src/platform/ui/cockpit/cockpit.telemetry.demo.ts": """
import { cockpitTelemetryEngine } from "./cockpit.telemetry.engine"

let seeded = false

export function seedCockpitTelemetryDemo() {

  if (seeded) return
  seeded = true

  cockpitTelemetryEngine.publish({
    channel:"live_contacts",
    title:"New voter contact",
    message:"3 new contacts added from canvass upload",
    severity:"info",
    source:"field"
  })

  cockpitTelemetryEngine.publish({
    channel:"donations",
    title:"Donation spike",
    message:"Small dollar donations up today",
    severity:"success",
    source:"fundraising"
  })

  cockpitTelemetryEngine.publish({
    channel:"ai_alerts",
    title:"AI strategy alert",
    message:"Polling shift detected",
    severity:"warning",
    source:"strategy-ai"
  })
}
""",

    "app/src/platform/ui/cockpit/useCockpitTelemetry.ts": """
import { useEffect,useState } from "react"
import { cockpitTelemetryEngine } from "./cockpit.telemetry.engine"

export function useCockpitTelemetry(channel:string){

  const [events,setEvents] = useState(
    cockpitTelemetryEngine.getEvents(channel)
  )

  useEffect(()=>{

    const unsubscribe = cockpitTelemetryEngine.subscribe(
      channel,
      ()=> setEvents([...cockpitTelemetryEngine.getEvents(channel)])
    )

    return unsubscribe

  },[channel])

  return {events}
}
""",

    "app/src/platform/ui/cockpit/CockpitTelemetryPanel.tsx": """
import React from "react"
import { useCockpitTelemetry } from "./useCockpitTelemetry"

export default function CockpitTelemetryPanel(props:{channel:string,title?:string}){

  const {events} = useCockpitTelemetry(props.channel)

  return (

    <div style={{display:"grid",gap:"10px"}}>

      <strong>{props.title || props.channel}</strong>

      {events.map(event=>(
        <div key={event.id}
          style={{
            border:"1px solid #1e293b",
            padding:"10px",
            borderRadius:"10px",
            background:"#020617"
          }}
        >

          <div style={{color:"#f8fafc",fontWeight:600}}>
            {event.title}
          </div>

          <div style={{color:"#cbd5e1",fontSize:"13px"}}>
            {event.message}
          </div>

        </div>
      ))}

    </div>

  )
}
"""
}

def write_file(path,content,force):
    path = Path(path)

    if path.exists() and not force:
        print("skip",path)
        return

    path.parent.mkdir(parents=True,exist_ok=True)

    with open(path,"w",encoding="utf8") as f:
        f.write(content.strip()+"\n")

    print("created",path)

def main():

    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root",default=".")
    parser.add_argument("--force",action="store_true")

    args = parser.parse_args()

    os.chdir(args.repo_root)

    print("\\nGenerating Cockpit Telemetry System...\\n")

    for path,content in FILES.items():
        write_file(path,content,args.force)

    print("\\nCockpit telemetry scaffold complete.\\n")

if __name__ == "__main__":
    main()