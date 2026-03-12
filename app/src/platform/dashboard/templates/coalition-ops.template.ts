import type { DashboardTemplate } from "@cards/types"
import { DashboardRegistry } from "@platform/registry/dashboard.registry"

export const CoalitionOpsTemplate: DashboardTemplate = {
  key: "coalition-ops",
  title: "CoalitionOps",
  category: "generated" as any,
  version: 1,
  cards: []
}

export function registerCoalitionOpsDashboard() {
  DashboardRegistry.register(CoalitionOpsTemplate)
}
