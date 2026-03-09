import { DashboardRegistry } from "@platform/registry";
import type { DashboardTemplate } from "@cards/types";

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
      id: "actionQueue-1",
      cardKey: "actionQueue",
      placement: { w: 6, h: "md" }
    },
    {
      id: "commandSearch-1",
      cardKey: "commandSearch",
      placement: { w: 6, h: "md" }
    },
    {
      id: "voteGoal-1",
      cardKey: "voteGoal",
      placement: { w: 3, h: "md" }
    },
    {
      id: "contacts-1",
      cardKey: "contacts",
      placement: { w: 3, h: "md" }
    },
    {
      id: "followUps-1",
      cardKey: "followUps",
      placement: { w: 3, h: "md" }
    },
    {
      id: "powerOf5-1",
      cardKey: "powerOf5",
      placement: { w: 3, h: "md" }
    },
    {
      id: "messagingCenter-1",
      cardKey: "messagingCenter",
      placement: { w: 12, h: "lg" }
    }
  ]
};

export function registerWarRoomTemplate() {
  DashboardRegistry.register(warRoomTemplate);
}