import React, { Suspense, lazy } from "react"

import { CardRegistry } from "@platform/registry"
import type {
  DashboardCardInstance,
  DashboardRuntimeContext
} from "@cards/types"

type CardRendererProps = {
  instance: DashboardCardInstance
  runtime: DashboardRuntimeContext
}

export default function CardRenderer({
  instance,
  runtime
}: CardRendererProps) {
  const definition = CardRegistry.get(instance.cardKey)

  if (!definition) {
    return (
      <div className="p-4 border rounded text-red-500">
        Card not registered: {instance.cardKey}
      </div>
    )
  }

  const LazyComponent = lazy(definition.componentLoader)

  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <LazyComponent
        cardId={instance.id}
        cardKey={definition.key}
        title={definition.title}
        subtitle={definition.subtitle}
        category={definition.category}
        workspace={runtime.workspace}
      />
    </Suspense>
  )
}