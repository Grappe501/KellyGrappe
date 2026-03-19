import { CockpitUserPreferences } from "./cockpit.types"

export class CockpitPreferenceEngine {

  private store: Record<string, CockpitUserPreferences> = {}

  get(userId: string): CockpitUserPreferences | null {
    return this.store[userId] ?? null
  }

  save(prefs: CockpitUserPreferences) {
    this.store[prefs.userId] = prefs
  }

}

export const cockpitPreferenceEngine = new CockpitPreferenceEngine()
