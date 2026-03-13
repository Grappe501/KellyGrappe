/**
 * systemMode.engine.ts
 *
 * System Mode Engine
 *
 * High-level helpers that make the active mode usable across the platform.
 *
 * Responsibilities:
 * - expose active labels
 * - determine if a circle is enabled
 * - provide default dashboards
 * - support mode-aware AI and UI behavior
 */

import {
    getSystemModeDefinition,
    isSystemMode,
    listSystemModes,
    type SystemMode,
    type SystemModeDefinition
  } from "@platform/system/systemMode.registry"
  import {
    getCurrentSystemMode,
    getCurrentSystemModeDefinition,
    initializeSystemMode,
    setCurrentSystemMode
  } from "@platform/system/systemMode.store"
  
  export interface SystemModeSummary {
    id: SystemMode
    label: string
    description: string
    circles: string[]
    defaultDashboards: string[]
    trainingPaths: string[]
  }
  
  export function bootSystemMode(): SystemModeDefinition {
    initializeSystemMode()
    return getCurrentSystemModeDefinition()
  }
  
  export function getSystemModeSummary(mode?: SystemMode): SystemModeSummary {
    const definition = mode
      ? getSystemModeDefinition(mode)
      : getCurrentSystemModeDefinition()
  
    return {
      id: definition.id,
      label: definition.label,
      description: definition.description,
      circles: definition.circles,
      defaultDashboards: definition.defaultDashboards,
      trainingPaths: definition.trainingPaths ?? []
    }
  }
  
  export function listSystemModeSummaries(): SystemModeSummary[] {
    return listSystemModes().map((definition) => ({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      circles: definition.circles,
      defaultDashboards: definition.defaultDashboards,
      trainingPaths: definition.trainingPaths ?? []
    }))
  }
  
  export function switchSystemMode(mode: SystemMode): SystemModeDefinition {
    setCurrentSystemMode(mode)
    return getCurrentSystemModeDefinition()
  }
  
  export function resolveSystemMode(value?: unknown): SystemMode {
    if (isSystemMode(value)) {
      return value
    }
  
    return getCurrentSystemMode()
  }
  
  export function getModeLabel(
    key: keyof SystemModeDefinition["entityLabels"],
    mode?: SystemMode
  ): string {
    const definition = mode
      ? getSystemModeDefinition(mode)
      : getCurrentSystemModeDefinition()
  
    return definition.entityLabels[key] ?? key
  }
  
  export function isCircleEnabled(circleKey: string, mode?: SystemMode): boolean {
    const definition = mode
      ? getSystemModeDefinition(mode)
      : getCurrentSystemModeDefinition()
  
    return definition.circles.includes(circleKey)
  }
  
  export function getDefaultDashboards(mode?: SystemMode): string[] {
    const definition = mode
      ? getSystemModeDefinition(mode)
      : getCurrentSystemModeDefinition()
  
    return definition.defaultDashboards
  }
  
  export function getTrainingPaths(mode?: SystemMode): string[] {
    const definition = mode
      ? getSystemModeDefinition(mode)
      : getCurrentSystemModeDefinition()
  
    return definition.trainingPaths ?? []
  }
  
  export function buildModeAwarePromptPrefix(mode?: SystemMode): string {
    const definition = mode
      ? getSystemModeDefinition(mode)
      : getCurrentSystemModeDefinition()
  
    return [
      `System Mode: ${definition.label}`,
      `Description: ${definition.description}`,
      `Primary Contact Label: ${definition.entityLabels.contact}`,
      `Primary Organization Label: ${definition.entityLabels.organization}`,
      `Primary Audience Label: ${definition.entityLabels.audience}`
    ].join("\n")
  }
  