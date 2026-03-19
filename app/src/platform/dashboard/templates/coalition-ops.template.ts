// app/src/platform/dashboard/templates/coalition-ops.template.ts

import type { DashboardTemplate } from "@cards/types"
import { DashboardRegistry } from "@platform/registry/dashboard.registry"

export const CoalitionOpsTemplate: DashboardTemplate = {
  key: "coalition-ops",
  title: "Coalition Ops",
  description: "Coalition operations workspace",
  category: "custom",
  version: 1,
  cards: []
}

export function registerCoalitionOpsDashboard() {
  DashboardRegistry.register(CoalitionOpsTemplate)
}