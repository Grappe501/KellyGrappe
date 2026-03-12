import { getRegisteredModuleRoutes } from "@platform/kernel/moduleManifestLoader"

export interface PlatformRoute {
  path: string
  title?: string
  requiresAuth?: boolean
  componentLoader: () => Promise<any>
  moduleName?: string
  featureKey?: string
}

export function getPlatformRoutes(): PlatformRoute[] {
  return getRegisteredModuleRoutes().map((route) => ({
    path: route.path,
    title: route.title,
    requiresAuth: route.requiresAuth,
    componentLoader: route.componentLoader,
    moduleName: route.moduleName,
    featureKey: route.featureKey
  }))
}
