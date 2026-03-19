import React from "react"
import { cockpitWidgetEngine } from "./cockpit.widget.engine"

export default function CockpitUtilityRing() {

  const widgets = cockpitWidgetEngine.getDefaultWidgets()

  return (
    <div className="cockpit-utility-ring">
      {widgets.map(w => (
        <button key={w.id}>{w.label}</button>
      ))}
    </div>
  )

}
