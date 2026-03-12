import { CardRegistry } from "@platform/registry/card.registry"
import { OrganizationRegistry } from "@platform/registry/organization.registry"
import { DashboardRegistry } from "@platform/registry/dashboard.registry"
import { FeatureRegistry } from "@platform/registry/feature.registry"
import { MicroRoomRegistry } from "@platform/registry/microroom.registry"
import { RoleRegistry } from "@platform/registry/role.registry"

import { registerDefaultRoles } from "@platform/defaults/default.roles"
import { registerDefaultFeatures } from "@platform/defaults/default.features"
import { registerDefaultMicroRooms } from "@platform/defaults/default.microrooms"
import { registerDefaultBrands } from "@platform/defaults/default.brands"

import { registerWarRoomTemplate } from "@platform/dashboard/templates/warRoom.template"

type RegistryBundle = {
  cards: typeof CardRegistry
  organizations: typeof OrganizationRegistry
  dashboards: typeof DashboardRegistry
  features: typeof FeatureRegistry
  microrooms: typeof MicroRoomRegistry
  roles: typeof RoleRegistry
}

type RegisterModuleFn = (registries: RegistryBundle) => void

type ModuleEntry = {
  registerModule?: RegisterModuleFn
}

type DashboardCardLike =
  | string
  | {
      type?: string
      props?: Record<string, unknown>
    }

type DashboardTemplateLike = {
  id?: string
  key?: string
  cards?: DashboardCardLike[]
}

export type PlatformBootContext = {
  organizationKey?: string
  dashboardId?: string
}

export type PlatformBootResult = {
  organization: unknown | null
  dashboard: {
    id: string
    cards: Array<{
      type: string
      componentLoader?: () => Promise<any>
      props?: Record<string, unknown>
    }>
  }
  registries: RegistryBundle
}

const REGISTRIES: RegistryBundle = {
  cards: CardRegistry,
  organizations: OrganizationRegistry,
  dashboards: DashboardRegistry,
  features: FeatureRegistry,
  microrooms: MicroRoomRegistry,
  roles: RoleRegistry
}

let platformBooted = false
let modulesDiscovered = false

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeCardType(type: unknown): string {
  return safeString(type)
}

function normalizeCardInput(card: DashboardCardLike): {
  type: string
  props?: Record<string, unknown>
} {
  if (typeof card === "string") {
    return {
      type: normalizeCardType(card)
    }
  }

  return {
    type: normalizeCardType(card?.type),
    props: card?.props ?? {}
  }
}

function getDefaultDashboardTemplate(): DashboardTemplateLike {
  const registryMatch = DashboardRegistry.get("warRoom") as
    | DashboardTemplateLike
    | undefined

  if (registryMatch) {
    return registryMatch
  }

  return {
    id: "warRoom",
    key: "warRoom",
    cards: []
  }
}

function discoverAndRegisterModules() {
  if (modulesDiscovered) return

  const modules = import.meta.glob<ModuleEntry>(
    "../../modules/**/index.{ts,tsx,js,jsx}",
    { eager: true }
  )

  for (const [path, mod] of Object.entries(modules)) {
    if (!mod) continue

    if (typeof mod.registerModule === "function") {
      try {
        mod.registerModule(REGISTRIES)
        console.log(`[platform] module registered: ${path}`)
      } catch (error) {
        console.warn("[platform] module registration failed:", path, error)
      }
    }
  }

  modulesDiscovered = true
}

function registerPlatformDefaults() {
  try {
    registerDefaultRoles()
  } catch (error) {
    console.warn("[platform] default role registration failed:", error)
  }

  try {
    registerDefaultFeatures()
  } catch (error) {
    console.warn("[platform] default feature registration failed:", error)
  }

  try {
    registerDefaultMicroRooms()
  } catch (error) {
    console.warn("[platform] default microroom registration failed:", error)
  }

  try {
    registerDefaultBrands()
  } catch (error) {
    console.warn("[platform] default brand registration failed:", error)
  }

  try {
    if (!DashboardRegistry.get("warRoom")) {
      registerWarRoomTemplate()
    }
  } catch (error) {
    console.warn("[platform] war room template registration failed:", error)
  }
}

function ensurePlatformBooted() {
  if (platformBooted) return

  console.log("🚀 Booting Civic Platform Kernel")

  registerPlatformDefaults()
  discoverAndRegisterModules()

  platformBooted = true

  console.log("✅ Platform Kernel Boot Complete")
}

function resolveDashboardTemplate(dashboardId?: string): DashboardTemplateLike {
  const normalizedDashboardId = safeString(dashboardId)

  if (!normalizedDashboardId || normalizedDashboardId === "warRoom") {
    return getDefaultDashboardTemplate()
  }

  const registryMatch = DashboardRegistry.get(normalizedDashboardId) as
    | DashboardTemplateLike
    | undefined

  if (registryMatch?.cards?.length) {
    return {
      id: safeString(registryMatch.key) || normalizedDashboardId,
      cards: registryMatch.cards
    }
  }

  return getDefaultDashboardTemplate()
}

function resolveOrganization(organizationKey?: string): unknown | null {
  const normalizedOrganizationKey = safeString(organizationKey) || "campaign"
  return OrganizationRegistry.get(normalizedOrganizationKey) ?? null
}

function resolveDashboardCards(template: DashboardTemplateLike) {
  const rawCards = Array.isArray(template.cards) ? template.cards : []

  return rawCards
    .map(normalizeCardInput)
    .filter((card) => Boolean(card.type))
    .map((card) => {
      const definition = CardRegistry.get(card.type)

      return {
        type: card.type,
        componentLoader: definition?.componentLoader,
        props: card.props ?? {}
      }
    })
}

export function bootPlatform(
  context: PlatformBootContext = {}
): PlatformBootResult {
  ensurePlatformBooted()

  const dashboardId = safeString(context.dashboardId) || "warRoom"
  const organization = resolveOrganization(context.organizationKey)
  const template = resolveDashboardTemplate(dashboardId)
  const resolvedCards = resolveDashboardCards(template)

  return {
    organization,
    dashboard: {
      id: safeString(template.id || template.key) || dashboardId,
      cards: resolvedCards
    },
    registries: REGISTRIES
  }
}

export function resetPlatformBootStateForTesting() {
  platformBooted = false
  modulesDiscovered = false
}

export default bootPlatform
