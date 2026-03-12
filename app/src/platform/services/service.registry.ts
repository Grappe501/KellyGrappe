/**
 * Platform Service Registry
 *
 * Central access point for all platform services.
 *
 * Responsibilities:
 *  - Core service registration
 *  - Module service registration
 *  - Safe service discovery
 *  - AI command router access
 *  - Future lazy service loading
 */

import * as contacts from "@services/contacts.service"
import * as followups from "@services/followups.service"
import * as media from "@services/media.service"
import * as origins from "@services/origins.service"
import * as voters from "@services/voter.service"

export type PlatformService = Record<string, any>

export type CoreServiceRegistryShape = {
  contacts: typeof contacts
  followups: typeof followups
  media: typeof media
  origins: typeof origins
  voters: typeof voters
}

export type ServiceRegistryShape = CoreServiceRegistryShape & {
  [key: string]: PlatformService
}

/**
 * Core services (cannot be removed)
 */
const coreServices: CoreServiceRegistryShape = {
  contacts,
  followups,
  media,
  origins,
  voters
}

/**
 * Internal service map
 */
const serviceMap: ServiceRegistryShape = {
  ...coreServices
}

/**
 * Public Services object
 *
 * Keeps compatibility with existing code:
 *
 * Services.contacts
 * Services.followups
 */
export const Services: ServiceRegistryShape = serviceMap

/**
 * Get service safely
 */
export function getService<K extends keyof ServiceRegistryShape>(
  name: K
): ServiceRegistryShape[K] {

  const service = serviceMap[name]

  if (!service) {
    throw new Error(`Service "${String(name)}" not found in ServiceRegistry`)
  }

  return service
}

/**
 * Check if service exists
 */
export function hasService(name: string): boolean {
  return name in serviceMap
}

/**
 * Register new service (used by modules)
 */
export function registerService(
  key: string,
  service: PlatformService
) {

  if (!key) {
    throw new Error("Service key is required")
  }

  if (serviceMap[key]) {
    console.warn(
      `[platform] service "${key}" already registered — overriding`
    )
  }

  serviceMap[key] = service
}

/**
 * Get all registered services
 */
export function getAllServices(): ServiceRegistryShape {
  return serviceMap
}

/**
 * List service keys
 */
export function listServices(): string[] {
  return Object.keys(serviceMap)
}

/**
 * Reset registry (testing/dev only)
 */
export function resetServiceRegistry() {

  for (const key of Object.keys(serviceMap)) {

    if (!(key in coreServices)) {
      delete serviceMap[key]
    }

  }

}
