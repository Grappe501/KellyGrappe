import React from "react"

type Props = {
  onMinimize?: () => void
  onRestore?: () => void
  onMaximize?: () => void
}

export default function CockpitWindowControls(props: Props) {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      <button onClick={props.onMinimize}>_</button>
      <button onClick={props.onRestore}>◱</button>
      <button onClick={props.onMaximize}>▣</button>
    </div>
  )
}