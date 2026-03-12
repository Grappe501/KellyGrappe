/**
 * platform.types.ts
 *
 * Core platform type system used across the CivicOS runtime.
 *
 * This file defines shared architecture contracts for:
 * - dashboards
 * - cards
 * - services
 * - modules
 * - AI tools
 *
 * Everything in the platform registers against these contracts.
 */

/* -------------------------------------------------------------------------- */
/* DASHBOARD DEFINITIONS                                                      */
/* -------------------------------------------------------------------------- */

export interface PlatformDashboardDefinition {

    key: string
  
    title: string
  
    description?: string
  
    /**
     * Logical grouping for dashboards
     * Example:
     * communication
     * field
     * fundraising
     * identity
     * admin
     */
    circle?: string
  
    /**
     * Icon identifier used in navigation
     */
    icon?: string
  
    /**
     * Navigation category
     */
    category?: string
  
    /**
     * Sort order in navigation
     */
    order?: number
  
    /**
     * Cards rendered inside this dashboard
     */
    cards: string[]
  
    /**
     * Optional cards that may render depending on features
     */
    optionalCards?: string[]
  
    /**
     * Data dependencies used by cards
     */
    dataSources?: string[]
  
    /**
     * Services required by the dashboard
     */
    services?: string[]
  
    /**
     * AI capabilities exposed in this dashboard
     */
    aiCapabilities?: string[]
  
    /**
     * Router path
     */
    route?: string
  
    /**
     * Permission gates
     */
    permissions?: string[]
  
    /**
     * Feature flags
     */
    featureFlags?: string[]
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* CARD DEFINITIONS                                                           */
  /* -------------------------------------------------------------------------- */
  
  export interface PlatformCardDefinition {
  
    key: string
  
    title: string
  
    description?: string
  
    /**
     * Dashboard where this card belongs
     */
    dashboard?: string
  
    /**
     * Card display size
     */
    size?: "small" | "medium" | "large" | "full"
  
    /**
     * Sort order
     */
    order?: number
  
    /**
     * Data dependencies
     */
    dataSources?: string[]
  
    /**
     * Required services
     */
    services?: string[]
  
    /**
     * AI capabilities used by the card
     */
    aiCapabilities?: string[]
  
    /**
     * Feature flags
     */
    featureFlags?: string[]
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* SERVICE DEFINITIONS                                                        */
  /* -------------------------------------------------------------------------- */
  
  export interface PlatformServiceDefinition {
  
    key: string
  
    title: string
  
    description?: string
  
    version?: string
  
    enabled?: boolean
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* MODULE DEFINITIONS                                                         */
  /* -------------------------------------------------------------------------- */
  
  export interface PlatformModuleDefinition {
  
    key: string
  
    title: string
  
    description?: string
  
    version?: string
  
    services?: string[]
  
    dashboards?: string[]
  
    cards?: string[]
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* AI TOOL DEFINITIONS                                                        */
  /* -------------------------------------------------------------------------- */
  
  export interface PlatformAIToolDefinition {
  
    key: string
  
    title: string
  
    description?: string
  
    moduleKey?: string
  
    requiresApproval?: boolean
  
  }
  
  /* -------------------------------------------------------------------------- */
  /* AI ACTION DEFINITIONS                                                      */
  /* -------------------------------------------------------------------------- */
  
  export interface PlatformAIActionDefinition {
  
    key: string
  
    title: string
  
    description?: string
  
    moduleKey?: string
  
    requiresApproval?: boolean
  
  }
  