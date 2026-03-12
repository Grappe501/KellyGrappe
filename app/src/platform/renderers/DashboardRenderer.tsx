import React from "react"

import type {
  DashboardRuntimeContext,
  DashboardTemplate,
  DashboardCardInstance,
  DashboardCategory
} from "@cards/types"

import CardRenderer from "./CardRenderer"

import { generateAutoDashboard } from "@platform/dashboard/autoDashboard.generator"

type DashboardRendererProps = {
  template?: DashboardTemplate
  runtime: DashboardRuntimeContext
}

function widthClass(w?: number) {

  switch (w) {

    case 1:
      return "xl:col-span-1"

    case 2:
      return "xl:col-span-2"

    case 3:
      return "xl:col-span-3"

    case 4:
      return "xl:col-span-4"

    case 6:
      return "xl:col-span-6"

    case 12:
    default:
      return "xl:col-span-12"

  }

}

export default function DashboardRenderer({
  template,
  runtime
}: DashboardRendererProps) {

  let effectiveTemplate: DashboardTemplate | undefined = template

  /**
   * AUTO DASHBOARD FALLBACK
   */

  if (!template?.cards || template.cards.length === 0) {

    const auto = generateAutoDashboard()

    const cards: DashboardCardInstance[] = auto.cards.map((card, index) => ({

      id: `${card.type}-${index}`,

      cardKey: card.type,

      visible: true,

      placement: {
        w:
          card.width === "small"
            ? 3
            : card.width === "medium"
            ? 4
            : card.width === "large"
            ? 6
            : 12
      }

    }))

    effectiveTemplate = {

      key: auto.id,

      title: "Auto Dashboard",

      /**
       * Cast required because this dashboard is generated
       * and not part of the static template registry.
       */
      category: "generated" as unknown as DashboardCategory,

      version: 1,

      cards

    }

  }

  if (!effectiveTemplate) {
    return <div>No dashboard template available</div>
  }

  const visibleCards = effectiveTemplate.cards.filter(
    (card) => card.visible !== false
  )

  return (

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

      {visibleCards.map((instance) => (

        <div
          key={instance.id}
          className={widthClass(instance.placement?.w)}
        >

          <CardRenderer
            instance={instance}
            runtime={runtime}
          />

        </div>

      ))}

    </div>

  )

}
