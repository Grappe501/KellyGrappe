import { FeatureRegistry } from "@platform/registry/feature.registry"
import LiveContactsListPage from "./LiveContactsListPage"

export function registerModule() {
  if (!FeatureRegistry.has?.("liveContacts")) {
    FeatureRegistry.register({
      key: "liveContacts",
      title: "Live Contacts",
      route: "/live",
      component: LiveContactsListPage,
      category: "module",
      enabledByDefault: true,
      aiEnabled: false,
      flags: []
    })
  }
}

registerModule()

export default registerModule
