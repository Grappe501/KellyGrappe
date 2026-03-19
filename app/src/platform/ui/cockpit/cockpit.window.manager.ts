import type { CockpitLayoutState } from "./cockpit.types"
import { cockpitLayoutEngine } from "./cockpit.layout.engine"

export class CockpitWindowManager {
  minimize(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    return cockpitLayoutEngine.minimizeWindow(layout, windowId)
  }

  restore(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    return cockpitLayoutEngine.restoreWindow(layout, windowId)
  }

  maximize(layout: CockpitLayoutState, windowId: string): CockpitLayoutState {
    return cockpitLayoutEngine.maximizeToCenter(layout, windowId)
  }
}

export const cockpitWindowManager = new CockpitWindowManager()