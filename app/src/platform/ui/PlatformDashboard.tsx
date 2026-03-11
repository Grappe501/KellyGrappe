import React, { Suspense } from "react"
import bootPlatform from "@platform/kernel/platformBootLoader"

type Props = {
  organizationKey?: string
  dashboardId?: string
}

function MissingCard() {
  return (
    <div
      style={{
        border: "1px dashed #cbd5e1",
        padding: "16px",
        borderRadius: "8px",
        background: "#f8fafc",
        fontSize: "14px"
      }}
    >
      Card not registered
    </div>
  )
}

export default function PlatformDashboard(props: Props) {

  const boot = bootPlatform({
    organizationKey: props.organizationKey,
    dashboardId: props.dashboardId
  })

  const cards = boot.dashboard.cards

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        padding: "16px"
      }}
    >

      {cards.map((card, i) => {

        const loader =
          card.componentLoader ??
          (async () => ({ default: MissingCard }))

        const Loader = React.lazy(loader)

        return (
          <Suspense key={i} fallback={<div>Loading...</div>}>
            <Loader {...card.props} />
          </Suspense>
        )

      })}

    </div>
  )

}