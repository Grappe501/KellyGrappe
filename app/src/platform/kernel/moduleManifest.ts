export type ModuleRouteManifest = {
    path: string
    page: string
    title?: string
    requiresAuth?: boolean
  }
  
  export type ModuleFeatureManifest = {
    key: string
    title?: string
    route?: string
    page?: string
    enabledByDefault?: boolean
    aiEnabled?: boolean
    flags?: string[]
  }
  
  export type ModuleDashboardAttachment = {
    dashboardKey: string
    cards?: string[]
  }
  
  export type PlatformModuleManifest = {
    name: string
    version: string
    title?: string
    description?: string
  
    routes?: ModuleRouteManifest[]
    features?: ModuleFeatureManifest[]
    dashboards?: ModuleDashboardAttachment[]
  }
  