import { CardRegistry } from "@platform/registry/card.registry"
import { OrganizationRegistry } from "@platform/registry/organization.registry"
import { DashboardRegistry } from "@platform/registry/dashboard.registry"
import { FeatureRegistry } from "@platform/registry/feature.registry"
import { MicroRoomRegistry } from "@platform/registry/microroom.registry"
import { RoleRegistry } from "@platform/registry/role.registry"

import { warRoomTemplate } from "../../dashboard/templates/warRoom.template"

export type PlatformBootContext = {
  organizationKey?: string
  dashboardId?: string
}

export type PlatformBootResult = {
  organization: any | null
  dashboard: {
    id: string
    cards: Array<{
      type: string
      componentLoader: () => Promise<any>
      props?: Record<string, any>
    }>
  }
  registries: {
    cards: typeof CardRegistry
    organizations: typeof OrganizationRegistry
    dashboards: typeof DashboardRegistry
    features: typeof FeatureRegistry
    microrooms: typeof MicroRoomRegistry
    roles: typeof RoleRegistry
  }
}

function resolveDashboardTemplate(dashboardId?: string) {
  if (!dashboardId || dashboardId === "warRoom") {
    return warRoomTemplate
  }

  const registryMatch = DashboardRegistry.get(dashboardId)

  if (registryMatch?.cards?.length) {
    return {
      id: registryMatch.key || dashboardId,
      cards: registryMatch.cards.map((type: string) => ({ type }))
    }
  }

  return warRoomTemplate
}

function normalizeCardType(type: string) {
  return (type || "").trim()
}

export function bootPlatform(
  context: PlatformBootContext = {}
): PlatformBootResult {

  const organizationKey = context.organizationKey || "campaign"
  const dashboardId = context.dashboardId || "warRoom"

  const organization =
    OrganizationRegistry.get(organizationKey) ?? null

  const template = resolveDashboardTemplate(dashboardId)

  const resolvedCards = (template.cards || []).map((card: any) => {

    const type = normalizeCardType(card.type)

    const definition = CardRegistry.get(type)

    return {
      type,
      componentLoader: definition?.componentLoader,
      props: card.props || {}
    }

  })

  return {
    organization,
    dashboard: {
      id: template.id || dashboardId,
      cards: resolvedCards
    },
    registries: {
      cards: CardRegistry,
      organizations: OrganizationRegistry,
      dashboards: DashboardRegistry,
      features: FeatureRegistry,
      microrooms: MicroRoomRegistry,
      roles: RoleRegistry
    }
  }

}

export default bootPlatform