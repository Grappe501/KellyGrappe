export interface FeatureDefinition {
  key: string

  title?: string

  route?: string

  component?: any

  componentLoader?: () => Promise<any>

  moduleName?: string

  category?: string

  enabledByDefault?: boolean

  aiEnabled?: boolean

  flags?: string[]
}

class FeatureRegistryClass {
  private features: Record<string, FeatureDefinition> = {}

  register(feature: FeatureDefinition) {
    if (!feature.key) {
      throw new Error("Feature must have a key")
    }

    this.features[feature.key] = feature
  }

  enable(feature: FeatureDefinition) {
    this.features[feature.key] = {
      ...feature,
      enabledByDefault: true
    }
  }

  get(key: string): FeatureDefinition | undefined {
    return this.features[key]
  }

  getAll(): FeatureDefinition[] {
    return Object.values(this.features)
  }

  has(key: string): boolean {
    return key in this.features
  }

  reset() {
    this.features = {}
  }
}

export const FeatureRegistry = new FeatureRegistryClass()
