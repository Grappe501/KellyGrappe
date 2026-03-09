import React from "react"

export type CardCategory =
  | "command"
  | "metrics"
  | "messaging"
  | "strategy"
  | "intelligence"

export type CardWidth =
  | "1"
  | "2"
  | "3"
  | "full"

export type CardHeight =
  | "sm"
  | "md"
  | "lg"

export type CardDisplayMode =
  | "standard"
  | "compact"
  | "expanded"

export type FeatureKey = string

export type UserRole =
  | "admin"
  | "staff"
  | "volunteer"
  | "viewer"

export interface BaseCardProps<TData = unknown, TFilters = unknown> {
  data?: TData
  filters?: TFilters
}

export interface CardDefinition<TData = unknown, TFilters = unknown> {

  key: string

  title: string
  subtitle?: string

  category: CardCategory
  version: number

  description?: string
  icon?: string

  defaultWidth: CardWidth
  defaultHeight?: CardHeight

  defaultDisplayMode?: CardDisplayMode

  featureKey?: FeatureKey

  allowedRoles?: readonly UserRole[]

  tags?: readonly string[]

  featureFlags?: readonly string[]

  serviceDependencies?: readonly string[]

  aiEnabled?: boolean

  componentLoader: () => Promise<{
    default: React.ComponentType<BaseCardProps<TData, TFilters>>
  }>
}