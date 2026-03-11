type OrganizationDefinition = {
  key: string
  title?: string
  orgType?: string
  defaultRoles?: readonly string[]
  defaultDashboards?: readonly string[]
  enabledMicrorooms?: readonly string[]
  dataBoundary?: Record<string, unknown>
}

const registry = new Map<string, OrganizationDefinition>()

export const OrganizationRegistry = {
  register(org: OrganizationDefinition) {
    registry.set(org.key, org)
  },

  get(key: string): OrganizationDefinition | undefined {
    return registry.get(key)
  },

  getAll(): OrganizationDefinition[] {
    return Array.from(registry.values())
  }
}