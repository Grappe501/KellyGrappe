import type {
  CockpitLayoutState,
  CockpitRegion,
  CockpitWindowState
} from "./cockpit.types"

function moveWindowToRegion(
  window: CockpitWindowState,
  region: CockpitRegion
): CockpitWindowState {
  return {
    ...window,
    region,
    minimized: false
  }
}

export class CockpitWindowStackEngine {
  openInDock(
    layout: CockpitLayoutState,
    dashboardKey: string,
    title?: string
  ): CockpitLayoutState {
    const nextWindow: CockpitWindowState = {
      id: `dynamic-${dashboardKey}`,
      title: title ?? dashboardKey,
      dashboardKey,
      region: "rightDock",
      size: "medium",
      minimized: false,
      visible: true,
      priority: 40
    }

    return {
      ...layout,
      windows: [...layout.windows, nextWindow]
    }
  }

  promoteToCenter(
    layout: CockpitLayoutState,
    windowId: string
  ): CockpitLayoutState {
    const selected =
      layout.center?.id === windowId
        ? layout.center
        : layout.windows.find((window) => window.id === windowId)

    if (!selected) return layout

    const remaining = layout.windows.filter((window) => window.id !== windowId)
    const demotedCenter =
      layout.center && layout.center.id !== selected.id
        ? moveWindowToRegion(layout.center, "rightDock")
        : undefined

    return {
      ...layout,
      center: moveWindowToRegion(selected, "center"),
      windows: [
        ...(demotedCenter ? [demotedCenter] : []),
        ...remaining
      ]
    }
  }

  closeWindow(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    return {
      ...layout,
      center:
        layout.center?.id === windowId
          ? undefined
          : layout.center,
      windows: layout.windows.filter((window) => window.id !== windowId),
      utilities: layout.utilities.filter((window) => window.id !== windowId)
    }
  }
}

export const cockpitWindowStackEngine = new CockpitWindowStackEngine()
