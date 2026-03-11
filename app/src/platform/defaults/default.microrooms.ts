import { MicroRoomRegistry } from "../registry/microroom.registry"

type DefaultMicroRoom = {
  key: string
  title: string
  type: string
  dashboardTemplateKey: string
  defaultCards: string[]
  dashboards: string[]
  aiEnabled: boolean
}

const DEFAULT_MICROROOMS: DefaultMicroRoom[] = [
  {
    key: "event_room",
    title: "Event Room",
    type: "event_room",
    dashboardTemplateKey: "war_room",
    dashboards: ["war-room"],
    defaultCards: [
      "action-queue",
      "command-search",
      "contacts",
      "follow-ups"
    ],
    aiEnabled: true
  },

  {
    key: "field_room",
    title: "Field Room",
    type: "field_room",
    dashboardTemplateKey: "war_room",
    dashboards: ["war-room"],
    defaultCards: [
      "vote-goal",
      "contacts",
      "follow-ups",
      "command-search"
    ],
    aiEnabled: true
  },

  {
    key: "fundraising_room",
    title: "Fundraising Room",
    type: "fundraising_room",
    dashboardTemplateKey: "war_room",
    dashboards: ["war-room"],
    defaultCards: [
      "contacts",
      "messaging-center"
    ],
    aiEnabled: true
  },

  {
    key: "county_room",
    title: "County Room",
    type: "county_room",
    dashboardTemplateKey: "war_room",
    dashboards: ["war-room"],
    defaultCards: [
      "action-queue",
      "contacts",
      "follow-ups"
    ],
    aiEnabled: true
  }
]

export function registerDefaultMicroRooms() {

  DEFAULT_MICROROOMS.forEach((room) => {

    MicroRoomRegistry.register({
      ...room
    })

  })

}