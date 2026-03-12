import { FeatureRegistry } from "@platform/registry/feature.registry";

export function getPlatformRoutes() {
  const features = FeatureRegistry.getAll();

  return features
    .filter((feature: any) => feature.route && feature.component)
    .map((feature: any) => ({
      path: feature.route,
      component: feature.component,
    }));
}

import { getRegisteredModuleRoutes } from "@platform/kernel/moduleManifestLoader"

export function getPlatformRoutes() {
  return getRegisteredModuleRoutes().map((route) => ({
    path: route.path,
    title: route.title,
    requiresAuth: route.requiresAuth,
    componentLoader: route.componentLoader,
    moduleName: route.moduleName,
    featureKey: route.featureKey
  }))
}
