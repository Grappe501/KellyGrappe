import { cockpitAiLayoutOptimizerV2 } from "./cockpit.ai.layout.optimizer.v2"

let seeded = false

export function seedCockpitAiLayoutDemo(userId = "demo-user"): void {
  if (seeded) return
  seeded = true

  const now = new Date().toISOString()

  cockpitAiLayoutOptimizerV2.recordSignal({
    userId,
    timestamp: now,
    dashboardKey: "war_room",
    windowId: "center-main",
    action: "focus"
  })

  cockpitAiLayoutOptimizerV2.recordSignal({
    userId,
    timestamp: now,
    dashboardKey: "strategy_room",
    windowId: "dock-1",
    action: "promote"
  })

  cockpitAiLayoutOptimizerV2.recordSignal({
    userId,
    timestamp: now,
    dashboardKey: "survey_polling_room",
    windowId: "dock-2",
    action: "focus"
  })

  cockpitAiLayoutOptimizerV2.recordSignal({
    userId,
    timestamp: now,
    cardKey: "ai",
    action: "utility_click"
  })
}
