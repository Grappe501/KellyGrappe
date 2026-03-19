import type {
  CockpitLayoutState,
  CockpitWindowSize,
  CockpitWindowState
} from "./cockpit.types"

function resizeWindow(
  window: CockpitWindowState,
  size: CockpitWindowSize
): CockpitWindowState {
  return {
    ...window,
    size
  }
}

export class CockpitResizeEngine {
  rebalance(layout: CockpitLayoutState): CockpitLayoutState {
    const visibleDockWindows = layout.windows.filter((window) => !window.minimized)

    const resizedWindows = layout.windows.map((window) => {
      if (window.minimized) return window

      if (visibleDockWindows.length <= 2) {
        return resizeWindow(window, "large")
      }

      if (visibleDockWindows.length <= 4) {
        return resizeWindow(window, "medium")
      }

      return resizeWindow(window, "small")
    })

    return {
      ...layout,
      windows: resizedWindows
    }
  }

  fullscreenCenter(layout: CockpitLayoutState): CockpitLayoutState {
    if (!layout.center) return layout

    return {
      ...layout,
      center: {
        ...layout.center,
        size: "main",
        minimized: false
      },
      windows: layout.windows.map((window) => ({
        ...window,
        minimized: true
      }))
    }
  }
}

export const cockpitResizeEngine = new CockpitResizeEngine()
