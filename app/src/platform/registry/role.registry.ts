export const roleRegistry = {
  "admin": {
    key: "admin",
    capabilities: ["command-search", "contacts", "follow-up-breakdown", "follow-ups", "power-of5", "vote-goal"],
    dashboards: ["communications", "data-intelligence", "field-operations", "fundraising", "war-room"],
  },
  "data": {
    key: "data",
    capabilities: ["command-summary", "messaging-center"],
    dashboards: ["communications", "war-room"],
  },
  "operations": {
    key: "operations",
    capabilities: ["command-search", "command-summary", "contacts", "follow-up-breakdown", "follow-ups", "power-of5", "vote-goal"],
    dashboards: ["communications", "data-intelligence", "field-operations", "fundraising", "war-room"],
  },
  "volunteer": {
    key: "volunteer",
    capabilities: ["action-queue", "messaging-center"],
    dashboards: ["communications", "war-room"],
  },
} as const;

export default roleRegistry;
