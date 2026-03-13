/**
 * systemMode.store.ts
 *
 * Runtime store for active system mode.
 *
 * This is intentionally lightweight and framework-agnostic.
 * It can be used by:
 * - boot loaders
 * - dashboards
 * - AI tools
 * - label engines
 * - settings pages
 *
 * Current persistence:
 * - localStorage in browser
 *
 * Future persistence:
 * - Supabase profile/org settings
 * - workspace settings
 * - server-side bootstrap payload
 */

import {
    getSystemModeDefinition,
    isSystemMode,
    type SystemMode,
    type SystemModeDefinition
  } from "@platform/system/systemMode.registry"
  
  const STORAGE_KEY = "platform.systemMode"
  const DEFAULT_SYSTEM_MODE: SystemMode = "civic"
  
  let currentSystemMode: SystemMode = DEFAULT_SYSTEM_MODE
  
  function canUseBrowserStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  }
  
  function readStoredSystemMode(): SystemMode {
    if (!canUseBrowserStorage()) {
      return DEFAULT_SYSTEM_MODE
    }
  
    const raw = window.localStorage.getItem(STORAGE_KEY)
  
    if (isSystemMode(raw)) {
      return raw
    }
  
    return DEFAULT_SYSTEM_MODE
  }
  
  function persistSystemMode(mode: SystemMode): void {
    if (!canUseBrowserStorage()) {
      return
    }
  
    window.localStorage.setItem(STORAGE_KEY, mode)
  }
  
  export function initializeSystemMode(): SystemMode {
    currentSystemMode = readStoredSystemMode()
    return currentSystemMode
  }
  
  export function getCurrentSystemMode(): SystemMode {
    return currentSystemMode
  }
  
  export function getCurrentSystemModeDefinition(): SystemModeDefinition {
    return getSystemModeDefinition(currentSystemMode)
  }
  
  export function setCurrentSystemMode(mode: SystemMode): SystemMode {
    currentSystemMode = mode
    persistSystemMode(mode)
    return currentSystemMode
  }
  
  export function resetSystemMode(): SystemMode {
    currentSystemMode = DEFAULT_SYSTEM_MODE
    persistSystemMode(DEFAULT_SYSTEM_MODE)
    return currentSystemMode
  }
  