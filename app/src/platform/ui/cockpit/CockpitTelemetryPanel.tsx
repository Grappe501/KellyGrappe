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
