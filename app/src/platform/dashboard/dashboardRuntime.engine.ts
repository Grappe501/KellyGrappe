// app/src/platform/dashboard/dashboardRuntime.engine.ts

import React from "react"

import type {
  DashboardCardInstance,
  DashboardRuntimeContext,
  DashboardTemplate,
  WorkspaceContext
} from "@cards/types"

import {
  CardRegistry,
  DashboardRegistry
} from "@platform/registry"

import { OrganizationRegistry } from "@platform/registry/organization.registry"

import type {
  DashboardRuntimeRequest,
  DashboardRuntimeResult,
  ResolvedDashboardCard,
  RuntimeCardDefinitionLike
} from "./dashboardRuntime.types"

const FALLBACK_DASHBOARD_KEY = "war_room"



/* -------------------------------------------------- */
/* Utility helpers */
/* -------------------------------------------------- */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeLookupKey(value: unknown): string {
  return safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}



/* -------------------------------------------------- */
/* Safe template conversion */
/* -------------------------------------------------- */

function asDashboardTemplate(value: unknown): DashboardTemplate | null {

  if (!isRecord(value)) return null

  if (typeof value.key !== "string") return null
  if (!Array.isArray(value.cards)) return null

  /*
  IMPORTANT:
  TS requires casting through unknown
  to safely convert runtime registry objects.
  */

  return value as unknown as DashboardTemplate
}



/* -------------------------------------------------- */
/* Registry readers */
/* -------------------------------------------------- */

function getAllDashboardTemplates(): DashboardTemplate[] {

  if (typeof DashboardRegistry.getAll !== "function") {
    return []
  }

  return DashboardRegistry
    .getAll()
    .map(asDashboardTemplate)
    .filter((template): template is DashboardTemplate => !!template)
}



/* -------------------------------------------------- */
/* Dashboard resolution */
/* -------------------------------------------------- */

function resolveDashboardTemplate(
  requestedKey?: string
): { template: DashboardTemplate; found: boolean; warnings: string[] } {

  const warnings: string[] = []

  const normalizedRequested = normalizeLookupKey(requestedKey)

  const templates = getAllDashboardTemplates()



  /* Direct lookup */

  const directTemplate =
    safeString(requestedKey) &&
    typeof DashboardRegistry.get === "function"
      ? asDashboardTemplate(DashboardRegistry.get(safeString(requestedKey)))
      : null

  if (directTemplate) {

    return {
      template: directTemplate,
      found: true,
      warnings
    }

  }



  /* Normalized lookup */

  if (normalizedRequested) {

    const normalizedMatch = templates.find(
      (template) =>
        normalizeLookupKey(template.key) === normalizedRequested
    )

    if (normalizedMatch) {

      return {
        template: normalizedMatch,
        found: true,
        warnings
      }

    }

    warnings.push(`Dashboard template not found: ${requestedKey}`)
  }



  /* Fallback */

  const fallbackTemplate =
    templates.find(
      (template) =>
        normalizeLookupKey(template.key) === normalizeLookupKey(FALLBACK_DASHBOARD_KEY)
    ) ?? templates[0]



  if (fallbackTemplate) {

    return {
      template: fallbackTemplate,
      found: normalizedRequested.length === 0,
      warnings
    }

  }



  /* Last-resort fallback */

  return {

    template: {
      key: FALLBACK_DASHBOARD_KEY,
      title: "Fallback Dashboard",
      description: "Runtime fallback dashboard",
      category: "custom",
      version: 1,
      cards: []
    },

    found: false,
    warnings: [...warnings, "No dashboard templates are registered"]
  }

}



/* -------------------------------------------------- */
/* Card registry helpers */
/* -------------------------------------------------- */

function getAllCardDefinitions(): RuntimeCardDefinitionLike[] {

  if (typeof CardRegistry.getAll !== "function") {
    return []
  }

  return CardRegistry
    .getAll()
    .filter(
      (definition: unknown): definition is RuntimeCardDefinitionLike =>
        isRecord(definition) && typeof definition.key === "string"
    )

}



function toComponentLoader(
  definition: RuntimeCardDefinitionLike | undefined
):
  | (() => Promise<{ default: React.ComponentType<any> }>)
  | undefined {

  if (!definition) return undefined

  if (typeof definition.componentLoader === "function") {
    return definition.componentLoader
  }

  if (definition.component) {

    return async () => ({
      default: definition.component as React.ComponentType<any>
    })

  }

  return undefined

}



function resolveCardDefinition(
  cardKey: string
): { definition?: RuntimeCardDefinitionLike; warnings: string[] } {

  const warnings: string[] = []



  /* Direct lookup */

  const directDefinition =
    typeof CardRegistry.get === "function"
      ? (CardRegistry.get(cardKey) as RuntimeCardDefinitionLike | undefined)
      : undefined



  if (directDefinition) {

    return {
      definition: {
        ...directDefinition,
        componentLoader: toComponentLoader(directDefinition)
      },
      warnings
    }

  }



  /* Normalized lookup */

  const normalizedCardKey = normalizeLookupKey(cardKey)

  const normalizedMatch =
    getAllCardDefinitions().find(
      (definition) =>
        normalizeLookupKey(definition.key) === normalizedCardKey
    )



  if (normalizedMatch) {

    warnings.push(
      `Card key normalized from "${cardKey}" to "${normalizedMatch.key}"`
    )

    return {
      definition: {
        ...normalizedMatch,
        componentLoader: toComponentLoader(normalizedMatch)
      },
      warnings
    }

  }



  warnings.push(`Card not registered: ${cardKey}`)

  return { warnings }

}



/* -------------------------------------------------- */
/* Organization lookup */
/* -------------------------------------------------- */

function resolveOrganization(organizationId?: string): unknown | null {

  const requestedOrganizationId = safeString(organizationId)

  if (!requestedOrganizationId) return null

  if (typeof OrganizationRegistry.get !== "function") {
    return null
  }

  return OrganizationRegistry.get(requestedOrganizationId) ?? null

}



/* -------------------------------------------------- */
/* Context builders */
/* -------------------------------------------------- */

function buildWorkspaceContext(
  organizationId?: string
): WorkspaceContext {

  return {
    organizationId: safeString(organizationId) || undefined
  }

}



function buildRuntimeContext(
  template: DashboardTemplate,
  organizationId?: string,
  sessionId?: string
): DashboardRuntimeContext {

  return {
    dashboardKey: template.key,
    dashboardTitle: template.title,
    sessionId: safeString(sessionId) || undefined,
    workspace: buildWorkspaceContext(organizationId),
    filters: template.defaultFilters
  }

}



/* -------------------------------------------------- */
/* Card resolution */
/* -------------------------------------------------- */

function resolveDashboardCard(
  instance: DashboardCardInstance
): ResolvedDashboardCard {

  const cardWarnings: string[] = []

  const resolution = resolveCardDefinition(instance.cardKey)

  cardWarnings.push(...resolution.warnings)



  return {

    id: instance.id,
    key: instance.cardKey,
    instance,
    definition: resolution.definition,
    warnings: cardWarnings

  }

}



/* -------------------------------------------------- */
/* Runtime Engine */
/* -------------------------------------------------- */

export class DashboardRuntimeEngine {

  createRuntime(
    request: DashboardRuntimeRequest = {}
  ): DashboardRuntimeResult {

    const templateResolution =
      resolveDashboardTemplate(request.dashboardKey)



    const context = buildRuntimeContext(
      templateResolution.template,
      request.organizationId,
      request.sessionId
    )



    const cards =
      templateResolution.template.cards.map(resolveDashboardCard)



    const warnings = [

      ...templateResolution.warnings,

      ...cards.flatMap((card) => card.warnings)

    ]



    return {

      template: templateResolution.template,

      context,

      cards,

      warnings,

      organization: resolveOrganization(request.organizationId),

      found: templateResolution.found

    }

  }

}



/* -------------------------------------------------- */
/* Singleton */
/* -------------------------------------------------- */

export const dashboardRuntimeEngine =
  new DashboardRuntimeEngine()