import React, { Suspense } from "react"
import bootPlatform from "@platform/kernel/platformBootLoader"

type Props = {
  organizationKey?: string
  dashboardId?: string
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

        const Loader = React.lazy(card.componentLoader)

        return (
          <Suspense key={i} fallback={<div>Loading...</div>}>
            <Loader {...card.props} />
          </Suspense>
        )

      })}

    </div>
  )
}