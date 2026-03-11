type BrandTheme = {
  name: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  successColor: string
  warningColor: string
  dangerColor: string
  surfaceColor: string
  surfaceAltColor: string
  borderColor: string
  textColor: string
  textMutedColor: string
  headingColor: string
  radius: string
  shadowStyle: string
  fontFamilySans: string
  fontFamilyDisplay: string
}

export type BrandDefinition = {
  key: string
  name: string
  organizationType: string
  workspaceType: string
  theme: BrandTheme
}

const registry = new Map<string, BrandDefinition>()

export const BrandRegistry = {

  register(brand: BrandDefinition) {
    registry.set(brand.key, brand)
  },

  get(key: string): BrandDefinition | undefined {
    return registry.get(key)
  },

  getAll(): BrandDefinition[] {
    return Array.from(registry.values())
  }

}