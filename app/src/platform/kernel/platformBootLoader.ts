import cardRegistry from "@cards/registry"
import { warRoomTemplate } from "../../dashboards/templates/warRoom.template"
import organizationRegistry from "../registry/organization.registry"
import dashboardRegistry from "../registry/dashboard.registry"
import featureRegistry from "../registry/feature.registry"
import microroomRegistry from "../registry/microroom.registry"
import roleRegistry from "../registry/role.registry"

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
      component: any
      props?: Record<string, any>
    }>
  }
  registries: {
    cards: typeof cardRegistry
    organizations: typeof organizationRegistry
    dashboards: typeof dashboardRegistry
    features: typeof featureRegistry
    microrooms: typeof microroomRegistry
    roles: typeof roleRegistry
  }
}

function resolveDashboardTemplate(dashboardId?: string) {
  if (!dashboardId || dashboardId === "warRoom") {
    return warRoomTemplate
  }

  const registryMatch = (dashboardRegistry as any)?.[dashboardId]

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
    (organizationRegistry as any)?.[organizationKey] || null

  const template = resolveDashboardTemplate(dashboardId)

  const resolvedCards = (template.cards || []).map((card: any) => {
    const type = normalizeCardType(card.type)
    const component = (cardRegistry as any)?.[type] || null

    return {
      type,
      component,
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
      cards: cardRegistry,
      organizations: organizationRegistry,
      dashboards: dashboardRegistry,
      features: featureRegistry,
      microrooms: microroomRegistry,
      roles: roleRegistry
    }
  }
}

export default bootPlatform
