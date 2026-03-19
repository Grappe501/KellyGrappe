import React from "react"
import { dashboardRuntimeEngine } from "@platform/dashboard/dashboardRuntime.engine"
import { CardRegistry } from "@platform/registry/card.registry"

export type CockpitMountRequest = {
  dashboardKey?: string
  cardKey?: string
}

class CockpitCardMountEngine {
  mount(request: CockpitMountRequest): React.ReactNode {
    if (request.cardKey) {
      return this.mountCard(request.cardKey)
    }

    if (request.dashboardKey) {
      return this.mountDashboard(request.dashboardKey)
    }

    return <div>No cockpit content</div>
  }

  private mountDashboard(dashboardKey: string): React.ReactNode {
    const runtime = dashboardRuntimeEngine.createRuntime({
      dashboardKey
    })

    if (!runtime || !runtime.cards) {
      return (
        <div
          style={{
            padding: "16px",
            color: "#f87171"
          }}
        >
          Dashboard not found: {dashboardKey}
        </div>
      )
    }

    return (
      <div
        style={{
          display: "grid",
          gap: "12px"
        }}
      >
        {runtime.cards.map((card: any, index: number) => (
          <div key={card?.key ?? card?.id ?? `${dashboardKey}-${index}`}>
            {typeof card?.render === "function"
              ? card.render()
              : card?.instance?.cardKey
              ? CardRegistry.mount(card.instance.cardKey)
              : (
                <div
                  style={{
                    padding: "16px",
                    color: "#f59e0b"
                  }}
                >
                  Dashboard card is not renderable
                </div>
              )}
          </div>
        ))}
      </div>
    )
  }

  private mountCard(cardKey: string): React.ReactNode {
    if (!CardRegistry.has(cardKey)) {
      return (
        <div
          style={{
            padding: "16px",
            color: "#f87171"
          }}
        >
          Card not found: {cardKey}
        </div>
      )
    }

    try {
      return CardRegistry.mount(cardKey)
    } catch {
      return (
        <div
          style={{
            padding: "16px",
            color: "#f87171"
          }}
        >
          Failed to render card: {cardKey}
        </div>
      )
    }
  }
}

export const cockpitCardMountEngine = new CockpitCardMountEngine()