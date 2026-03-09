export type CardCategory =
  | "command"
  | "metrics"
  | "messaging"
  | "operations"
  | "fundraising"
  | "ai"
  | "intelligence"

export type CardWidth = 1 | 2 | 3 | 4 | 6 | 12
export type CardHeight = 1 | 2 | 3 | 4 | 6 | 12

export type CardDisplayMode =
  | "full"
  | "compact"
  | "minimal"

export type FeatureKey = string
export type UserRole = string

export interface BaseCardProps {
  cardId: string
  cardKey: string
  title: string
  subtitle?: string
  category: CardCategory
  workspace?: any
}

export interface DashboardCardInstance {
  id: string
  cardKey: string
  visible?: boolean
  placement?: {
    w?: CardWidth
    h?: CardHeight
  }
}

export interface DashboardTemplate {
  key: string
  title?: string
  cards: DashboardCardInstance[]
}

export interface DashboardRuntimeContext {
  workspace?: any
}

export interface BrandDefinition {
  key: string
  title: string
  primaryColor?: string
  secondaryColor?: string
}