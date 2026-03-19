import React from "react"
import { dashboardRuntimeEngine } from "@platform/dashboard/dashboardRuntime.engine"
import { CardRegistry } from "@platform/registry/card.registry"

type CockpitMountRequest = {
  dashboardKey?: string
  cardKey?: string
}

export class CockpitDashboardIntegration {
  mount(request: CockpitMountRequest) {
    if (request.cardKey) {
      return this.renderCard(request.cardKey)
    }

    if (request.dashboardKey) {
      return this.renderDashboard(request.dashboardKey)
    }

    return <div>No cockpit content</div>
  }

  renderDashboard(dashboardKey?: string) {
    if (!dashboardKey) {
      return <div>No dashboard</div>
    }

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

  renderCard(cardKey?: string) {
    if (!cardKey) {
      return <div>No card</div>
    }

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

export const cockpitDashboardIntegration = new CockpitDashboardIntegration()