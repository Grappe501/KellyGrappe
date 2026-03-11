type RoleDefinition = {
    key: string
    capabilities?: readonly string[]
    dashboards?: readonly string[]
  }
  
  const registry = new Map<string, RoleDefinition>()
  
  export const RoleRegistry = {
    register(role: RoleDefinition) {
      registry.set(role.key, role)
    },
  
    get(key: string): RoleDefinition | undefined {
      return registry.get(key)
    },
  
    getAll(): RoleDefinition[] {
      return Array.from(registry.values())
    }
  }