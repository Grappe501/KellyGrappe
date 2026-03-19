import type {
  CockpitLayoutState,
  CockpitWindowDimensions,
  CockpitWindowSize,
  CockpitWindowState
} from "./cockpit.types"

const SIZE_TO_DIMENSIONS: Record<CockpitWindowSize, CockpitWindowDimensions> = {
  tiny: { columns: 1, rows: 1 },
  small: { columns: 2, rows: 1 },
  medium: { columns: 3, rows: 2 },
  large: { columns: 4, rows: 2 },
  main: { columns: 8, rows: 4 }
}

export interface CockpitGridPlacement {
  windowId: string
  columnSpan: number
  rowSpan: number
  order: number
}

export interface CockpitGridLayout {
  left: CockpitGridPlacement[]
  center?: CockpitGridPlacement
  right: CockpitGridPlacement[]
  bottom: CockpitGridPlacement[]
  utilities: CockpitGridPlacement[]
}

function toPlacement(
  window: CockpitWindowState,
  order: number
): CockpitGridPlacement {
  const dimensions = SIZE_TO_DIMENSIONS[window.size]

  return {
    windowId: window.id,
    columnSpan: dimensions.columns,
    rowSpan: dimensions.rows ?? 1,
    order
  }
}

export class CockpitGridEngine {
  buildGrid(layout: CockpitLayoutState): CockpitGridLayout {
    const left = layout.windows
      .filter((window) => window.region === "leftDock" && !window.minimized)
      .sort((a, b) => b.priority - a.priority)
      .map((window, index) => toPlacement(window, index))

    const right = layout.windows
      .filter((window) => window.region === "rightDock" && !window.minimized)
      .sort((a, b) => b.priority - a.priority)
      .map((window, index) => toPlacement(window, index))

    const bottom = layout.windows
      .filter((window) => window.region === "bottomDock" && !window.minimized)
      .sort((a, b) => b.priority - a.priority)
      .map((window, index) => toPlacement(window, index))

    const utilities = layout.utilities
      .filter((window) => !window.minimized)
      .sort((a, b) => b.priority - a.priority)
      .map((window, index) => toPlacement(window, index))

    return {
      left,
      center: layout.center && !layout.center.minimized
        ? toPlacement(layout.center, 0)
        : undefined,
      right,
      bottom,
      utilities
    }
  }
}

export const cockpitGridEngine = new CockpitGridEngine()
