import type { DashboardTemplate } from "@cards/types"

const registry = new Map<string, DashboardTemplate>()

export const DashboardRegistry = {
  register(template: DashboardTemplate) {
    registry.set(template.key, template)
  },

  get(key: string): DashboardTemplate | undefined {
    return registry.get(key)
  },

  getAll(): DashboardTemplate[] {
    return Array.from(registry.values())
  }
}