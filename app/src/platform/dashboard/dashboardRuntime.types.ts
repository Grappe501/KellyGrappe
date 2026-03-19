// app/src/platform/dashboard/dashboardRuntime.types.ts

import type {
    DashboardCardInstance,
    DashboardRuntimeContext,
    DashboardTemplate,
    WorkspaceContext
  } from "@cards/types"
  
  export interface RuntimeCardDefinitionLike {
    key: string
    title?: string
    subtitle?: string
    category?: string
    tags?: string[]
    componentLoader?: () => Promise<{ default: React.ComponentType<any> }>
    component?: React.ComponentType<any>
  }
  
  export interface ResolvedDashboardCard {
    id: string
    key: string
    instance: DashboardCardInstance
    definition?: RuntimeCardDefinitionLike
    warnings: string[]
  }
  
  export interface DashboardRuntimeResult {
    template: DashboardTemplate
    context: DashboardRuntimeContext
    cards: ResolvedDashboardCard[]
    warnings: string[]
    organization: unknown | null
    found: boolean
  }
  
  export interface DashboardRuntimeRequest {
    dashboardKey?: string
    organizationId?: string
    sessionId?: string
  }