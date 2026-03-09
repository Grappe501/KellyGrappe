export const dashboardRegistry = {
  "communications": {
    key: "communications",
    title: "Communications",
    categories: ["messaging", "social", "metrics", "ai"],
    cards: ["contacts", "follow-up-breakdown", "follow-ups", "messaging-center", "power-of5", "vote-goal"],
  },
  "data-intelligence": {
    key: "data-intelligence",
    title: "Data Intelligence",
    categories: ["metrics", "operations", "ai"],
    cards: ["contacts", "follow-up-breakdown", "follow-ups", "power-of5", "vote-goal"],
  },
  "field-operations": {
    key: "field-operations",
    title: "Field Operations",
    categories: ["operations", "intake", "metrics"],
    cards: ["contacts", "follow-up-breakdown", "follow-ups", "power-of5", "vote-goal"],
  },
  "fundraising": {
    key: "fundraising",
    title: "Fundraising",
    categories: ["fundraising", "metrics"],
    cards: ["contacts", "follow-up-breakdown", "follow-ups", "power-of5", "vote-goal"],
  },
  "war-room": {
    key: "war-room",
    title: "War Room",
    categories: ["command", "metrics", "messaging", "operations"],
    cards: ["action-queue", "command-search", "command-summary", "contacts", "follow-up-breakdown", "follow-ups", "messaging-center", "power-of5", "vote-goal"],
  },
} as const;

export default dashboardRegistry;
