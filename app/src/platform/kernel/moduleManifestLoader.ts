import React from "react"

import { FeatureRegistry } from "@platform/registry/feature.registry"
import type {
  PlatformModuleManifest,
  ModuleRouteManifest,
  ModuleFeatureManifest
} from "./moduleManifest.types"

type ModulePageImporter = () => Promise<{ default: React.ComponentType<any> }>

type RegisteredRoute = {
  path: string
  title?: string
  requiresAuth?: boolean
  componentLoader: ModulePageImporter
  moduleName: string
  featureKey?: string
}

const discoveredRoutes = new Map<string, RegisteredRoute>()
let modulesLoaded = false

function normalizePath(path: string): string {
  if (!path) return "/"
  if (path === "/") return "/"
  return path.startsWith("/") ? path : `/${path}`
}

function buildPageImporter(moduleDir: string, pageName: string): ModulePageImporter | null {
  const candidates = import.meta.glob("../../modules/**/*Page.{tsx,jsx}")
  const normalizedDir = moduleDir.replace(/\\/g, "/")
  const targetTsx = `${normalizedDir}/${pageName}.tsx`
  const targetJsx = `${normalizedDir}/${pageName}.jsx`

  const match =
    (candidates[targetTsx] as ModulePageImporter | undefined) ??
    (candidates[targetJsx] as ModulePageImporter | undefined)

  return match ?? null
}

function registerFeature(
  moduleName: string,
  feature: ModuleFeatureManifest,
  routeMap: Map<string, RegisteredRoute>
) {
  const featureKey = feature.key.trim()
  if (!featureKey) return

  const featureRoute = feature.route ? normalizePath(feature.route) : undefined

  if (typeof FeatureRegistry.register === "function") {
    FeatureRegistry.register({
      key: featureKey,
      title: feature.title ?? featureKey,
      category: "module",
      enabledByDefault: feature.enabledByDefault ?? true,
      aiEnabled: feature.aiEnabled ?? false,
      flags: feature.flags ?? [],
      route: featureRoute
    })
  }

  if (featureRoute && routeMap.has(featureRoute)) {
    const existing = routeMap.get(featureRoute)!
    routeMap.set(featureRoute, {
      ...existing,
      featureKey
    })
  }

  console.log(`[platform] feature registered from module "${moduleName}": ${featureKey}`)
}

function registerRoute(
  moduleName: string,
  moduleDir: string,
  route: ModuleRouteManifest,
  routeMap: Map<string, RegisteredRoute>
) {
  const path = normalizePath(route.path)
  const importer = buildPageImporter(moduleDir, route.page)

  if (!importer) {
    console.warn(
      `[platform] route page not found for module "${moduleName}": ${route.page} in ${moduleDir}`
    )
    return
  }

  routeMap.set(path, {
    path,
    title: route.title,
    requiresAuth: route.requiresAuth,
    componentLoader: importer,
    moduleName
  })

  console.log(`[platform] route registered from module "${moduleName}": ${path}`)
}

export function loadModuleManifests() {
  if (modulesLoaded) {
    return {
      routes: Array.from(discoveredRoutes.values())
    }
  }

  const manifestFiles = import.meta.glob("../../modules/**/module.json", {
    eager: true,
    import: "default"
  }) as Record<string, PlatformModuleManifest>

  for (const [manifestPath, manifest] of Object.entries(manifestFiles)) {
    const moduleDir = manifestPath.replace(/\/module\.json$/, "")
    const moduleName = manifest.name?.trim() || moduleDir.split("/").pop() || "unknown-module"

    const routeMap = new Map<string, RegisteredRoute>()

    for (const route of manifest.routes ?? []) {
      registerRoute(moduleName, moduleDir, route, routeMap)
    }

    for (const feature of manifest.features ?? []) {
      registerFeature(moduleName, feature, routeMap)
    }

    for (const [path, registered] of routeMap.entries()) {
      discoveredRoutes.set(path, registered)
    }

    if ((manifest.dashboards ?? []).length) {
      console.log(
        `[platform] module "${moduleName}" dashboard attachments loaded:`,
        manifest.dashboards
      )
    }
  }

  modulesLoaded = true

  return {
    routes: Array.from(discoveredRoutes.values())
  }
}

export function getRegisteredModuleRoutes() {
  if (!modulesLoaded) {
    loadModuleManifests()
  }

  return Array.from(discoveredRoutes.values())
}
