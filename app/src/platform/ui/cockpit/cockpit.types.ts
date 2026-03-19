export type CockpitWindowSize =
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "main"

export type CockpitRegion =
  | "center"
  | "leftDock"
  | "rightDock"
  | "bottomDock"
  | "utility"

export interface CockpitWindowState {
  id: string
  title: string
  dashboardKey?: string
  cardKey?: string
  region: CockpitRegion
  size: CockpitWindowSize
  minimized: boolean
  visible: boolean
  pinned?: boolean
  priority: number
}

export interface CockpitLayoutState {
  center?: CockpitWindowState
  windows: CockpitWindowState[]
  utilities: CockpitWindowState[]
}

export interface CockpitLayoutRequest {
  primaryDashboardKey: string
  surroundingDashboardKeys?: string[]
  utilityKeys?: string[]
}

export interface CockpitUserPreferences {
  userId: string
  preferredWindows: string[]
  preferredCards: string[]
}

export interface CockpitWindowDimensions {
  columns: number
  rows?: number
}