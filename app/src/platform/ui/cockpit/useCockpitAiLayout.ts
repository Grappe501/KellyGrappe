import { useEffect, useMemo, useState } from "react"

import type { CockpitLayoutState } from "./cockpit.types"
import type { CockpitUsageSignal } from "./cockpit.ai.layout.types"
import { cockpitAiLayoutOptimizerV2 } from "./cockpit.ai.layout.optimizer.v2"

export function useCockpitAiLayout(
  userId: string | undefined,
  baseLayout: CockpitLayoutState
) {
  const [layout, setLayout] = useState<CockpitLayoutState>(baseLayout)

  useEffect(() => {
    if (!userId) {
      setLayout(baseLayout)
      return
    }

    setLayout(
      cockpitAiLayoutOptimizerV2.optimizeLayoutForUser(userId, baseLayout)
    )
  }, [userId, baseLayout])

  const recordSignal = useMemo(() => {
    return (signal: Omit<CockpitUsageSignal, "userId" | "timestamp">) => {
      if (!userId) return

      cockpitAiLayoutOptimizerV2.recordSignal({
        ...signal,
        userId,
        timestamp: new Date().toISOString()
      })

      setLayout((current) =>
        cockpitAiLayoutOptimizerV2.optimizeLayoutForUser(userId, current)
      )
    }
  }, [userId])

  return {
    layout,
    setLayout,
    recordSignal
  }
}
