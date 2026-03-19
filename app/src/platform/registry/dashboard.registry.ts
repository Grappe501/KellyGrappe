// src/platform/registry/dashboard.registry.ts

import { DashboardTemplate } from "../../cards/types"

const registry: Record<string, DashboardTemplate> = {}

export const DashboardRegistry = {

  register(template: DashboardTemplate) {
    registry[template.key] = template
  },

  get(key: string): DashboardTemplate | undefined {
    return registry[key]
  },

  getAll(): DashboardTemplate[] {
    return Object.values(registry)
  },

  has(key: string): boolean {
    return key in registry
  }

}