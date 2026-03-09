import { MicroRoomRegistry } from "../registry";
import type { MicroRoomDefinition } from "@cards/types";

const DEFAULT_MICROROOMS: MicroRoomDefinition[] = [
  {
    key: "event_room",
    title: "Event Room",
    type: "event_room",
    dashboardTemplateKey: "war_room",
    defaultCards: ["actionQueue", "commandSearch", "contacts", "followUps"],
    aiEnabled: true
  },
  {
    key: "field_room",
    title: "Field Room",
    type: "field_room",
    dashboardTemplateKey: "war_room",
    defaultCards: ["voteGoal", "contacts", "followUps", "commandSearch"],
    aiEnabled: true
  },
  {
    key: "fundraising_room",
    title: "Fundraising Room",
    type: "fundraising_room",
    dashboardTemplateKey: "war_room",
    defaultCards: ["contacts", "messagingCenter"],
    aiEnabled: true
  },
  {
    key: "county_room",
    title: "County Room",
    type: "county_room",
    dashboardTemplateKey: "war_room",
    defaultCards: ["actionQueue", "contacts", "followUps"],
    aiEnabled: true
  }
];

export function registerDefaultMicroRooms() {
  DEFAULT_MICROROOMS.forEach((room) => MicroRoomRegistry.register(room));
}