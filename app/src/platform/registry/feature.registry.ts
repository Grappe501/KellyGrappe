type FeatureDefinition = {
    key: string
    category?: string
    enabledByDefault?: boolean
    aiEnabled?: boolean
    flags?: readonly string[]
  }
  
  const registry = new Map<string, FeatureDefinition>()
  
  export const FeatureRegistry = {
    register(feature: FeatureDefinition) {
      registry.set(feature.key, feature)
    },
  
    enable(key: string) {
      const current = registry.get(key)
      if (!current) {
        registry.set(key, {
          key,
          enabledByDefault: true,
          flags: []
        })
        return
      }
  
      registry.set(key, {
        ...current,
        enabledByDefault: true
      })
    },
  
    get(key: string): FeatureDefinition | undefined {
      return registry.get(key)
    },
  
    getAll(): FeatureDefinition[] {
      return Array.from(registry.values())
    }
  }