import { FeatureRegistry } from "@platform/registry/feature.registry"

export function registerModule() {
  if (!FeatureRegistry.has("volunteerintelligence")) {
    FeatureRegistry.register({
      key: "volunteerintelligence",
      title: "VolunteerIntelligence",
      route: "/volunteer-intelligence",
      category: "module",
      enabledByDefault: true,
      aiEnabled: true,
      flags: []
    })
  }
}

registerModule()

export default registerModule
