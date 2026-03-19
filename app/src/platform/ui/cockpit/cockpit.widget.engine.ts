export interface CockpitWidgetButton {
  id: string
  label: string
  icon?: string
  action: string
}

export class CockpitWidgetEngine {

  getDefaultWidgets(): CockpitWidgetButton[] {
    return [
      { id: "circles", label: "Circles", action: "open_circles" },
      { id: "dashboards", label: "Dashboards", action: "open_dashboards" },
      { id: "ai", label: "AI Copilot", action: "open_ai" },
      { id: "profile", label: "My Page", action: "open_profile" }
    ]
  }

}

export const cockpitWidgetEngine = new CockpitWidgetEngine()
