import type {
  CockpitLayoutRequest,
  CockpitLayoutState,
  CockpitRegion,
  CockpitWindowDimensions,
  CockpitWindowSize,
  CockpitWindowState
} from "./cockpit.types"

const SIZE_TO_DIMENSIONS: Record<CockpitWindowSize, CockpitWindowDimensions> = {
  tiny: { columns: 1 },
  small: { columns: 2 },
  medium: { columns: 3 },
  large: { columns: 4 },
  main: { columns: 8 }
}

function buildWindow(
  id: string,
  title: string,
  region: CockpitRegion,
  size: CockpitWindowSize,
  priority: number,
  dashboardKey?: string,
  cardKey?: string
): CockpitWindowState {
  return {
    id,
    title,
    region,
    size,
    minimized: false,
    visible: true,
    priority,
    dashboardKey: dashboardKey ?? undefined,
    cardKey: cardKey ?? undefined
  }
}

export class CockpitLayoutEngine {

  buildDefaultLayout(): CockpitLayoutState {
    return this.buildLayout({
      primaryDashboardKey: "war_room",
      surroundingDashboardKeys: [
        "strategy_room",
        "survey_polling_room"
      ],
      utilityKeys: [
        "circles",
        "dashboards",
        "ai",
        "profile"
      ]
    })
  }

  buildLayout(request: CockpitLayoutRequest): CockpitLayoutState {

    const center = buildWindow(
      "center-main",
      request.primaryDashboardKey,
      "center",
      "main",
      100,
      request.primaryDashboardKey
    )

    const surrounding = (request.surroundingDashboardKeys ?? []).map((key, index) => {

      const region: CockpitRegion =
        index === 0
          ? "leftDock"
          : index === 1
          ? "rightDock"
          : "bottomDock"

      const size: CockpitWindowSize =
        index < 2
          ? "large"
          : "medium"

      return buildWindow(
        `dock-${index + 1}`,
        key,
        region,
        size,
        50 - index,
        key
      )
    })

    const utilities = (request.utilityKeys ?? []).map((key, index) =>
      buildWindow(
        `utility-${index + 1}`,
        key,
        "utility",
        "tiny",
        10 - index,
        undefined,
        key
      )
    )

    return {
      center,
      windows: surrounding,
      utilities
    }
  }

  minimizeWindow(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {

    const minimize = (window: CockpitWindowState): CockpitWindowState =>
      window.id === windowId
        ? { ...window, minimized: true }
        : window

    return {
      ...layout,
      center: layout.center ? minimize(layout.center) : layout.center,
      windows: layout.windows.map(minimize),
      utilities: layout.utilities.map(minimize)
    }
  }

  restoreWindow(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {

    const restore = (window: CockpitWindowState): CockpitWindowState =>
      window.id === windowId
        ? { ...window, minimized: false }
        : window

    return {
      ...layout,
      center: layout.center ? restore(layout.center) : layout.center,
      windows: layout.windows.map(restore),
      utilities: layout.utilities.map(restore)
    }
  }

  maximizeToCenter(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {

    const selected =
      layout.center?.id === windowId
        ? layout.center
        : layout.windows.find(w => w.id === windowId)

    if (!selected) return layout

    const demotedCenter =
      layout.center && layout.center.id !== selected.id
        ? {
            ...layout.center,
            region: "rightDock" as CockpitRegion,
            size: "medium" as CockpitWindowSize
          }
        : undefined

    const remainingWindows =
      layout.windows.filter(w => w.id !== windowId)

    return {
      ...layout,
      center: {
        ...selected,
        region: "center",
        size: "main",
        minimized: false
      },
      windows: [
        ...(demotedCenter ? [demotedCenter] : []),
        ...remainingWindows
      ]
    }
  }

  getDimensions(size: CockpitWindowSize): CockpitWindowDimensions {
    return SIZE_TO_DIMENSIONS[size]
  }
}

export const cockpitLayoutEngine = new CockpitLayoutEngine()