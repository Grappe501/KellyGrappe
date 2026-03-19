import React from "react"
import CockpitWindowControls from "./CockpitWindowControls"
import { cockpitDashboardIntegration } from "./cockpit.dashboard.integration"

type Props = {
  title: string
  children?: React.ReactNode
  onMinimize?: () => void
  onRestore?: () => void
  onMaximize?: () => void
}

export default function CockpitDockWindow(props: Props) {
  const renderContent = () => {
    if (!props.children) return null

    if (typeof props.children === "string") {
      return cockpitDashboardIntegration.renderDashboard(props.children)
    }

    return props.children
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid #334155",
        borderRadius: "12px",
        background: "#0f172a",
        color: "#e2e8f0",
        minHeight: "220px",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)"
      }}
    >
      {/* Window Header */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 12px",
          borderBottom: "1px solid #1e293b",
          background: "#020617",
          fontSize: "13px",
          letterSpacing: "0.04em"
        }}
      >
        <strong
          style={{
            fontWeight: 600,
            color: "#f1f5f9"
          }}
        >
          {props.title}
        </strong>

        <CockpitWindowControls
          onMinimize={props.onMinimize}
          onRestore={props.onRestore}
          onMaximize={props.onMaximize}
        />
      </div>

      {/* Window Body */}

      <div
        style={{
          flex: 1,
          padding: "12px",
          overflow: "auto",
          fontSize: "14px"
        }}
      >
        {renderContent()}
      </div>
    </div>
  )
}