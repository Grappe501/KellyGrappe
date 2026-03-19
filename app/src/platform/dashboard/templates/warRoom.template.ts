// app/src/platform/dashboard/templates/warRoom.template.ts

import { DashboardRegistry } from "@platform/registry"
import type { DashboardTemplate } from "@cards/types"

const warRoomTemplate: DashboardTemplate = {
  key: "war_room",
  title: "War Room",
  description: "Primary campaign command center",
  category: "war_room",
  version: 1,
  aiEnabled: true,
  defaultLayoutMode: "grid",
  cards: [
    {
      id: "action-queue-1",
      cardKey: "action-queue",
      placement: { w: 6, h: "md" }
    },
    {
      id: "command-search-1",
      cardKey: "command-search",
      placement: { w: 6, h: "md" }
    },
    {
      id: "vote-goal-1",
      cardKey: "vote-goal",
      placement: { w: 3, h: "md" }
    },
    {
      id: "contacts-1",
      cardKey: "contacts",
      placement: { w: 3, h: "md" }
    },
    {
      id: "follow-ups-1",
      cardKey: "follow-ups",
      placement: { w: 3, h: "md" }
    },
    {
      id: "power-of5-1",
      cardKey: "power-of5",
      placement: { w: 3, h: "md" }
    },
    {
      id: "messaging-center-1",
      cardKey: "messaging-center",
      placement: { w: 12, h: "lg" }
    }
  ]
}

export function registerWarRoomTemplate() {
  DashboardRegistry.register(warRoomTemplate)
}

export { warRoomTemplate }