export const featureRegistry = {
  "action-queue": {
    key: "action-queue",
    category: "command",
    enabledByDefault: true,
    aiEnabled: false,
    flags: [],
  },
  "command-search": {
    key: "command-search",
    category: "command",
    enabledByDefault: true,
    aiEnabled: true,
    flags: [],
  },
  "command-summary": {
    key: "command-summary",
    category: "command",
    enabledByDefault: true,
    aiEnabled: true,
    flags: [],
  },
  "contacts": {
    key: "contacts",
    category: "metrics",
    enabledByDefault: true,
    aiEnabled: false,
    flags: [],
  },
  "follow-up-breakdown": {
    key: "follow-up-breakdown",
    category: "metrics",
    enabledByDefault: true,
    aiEnabled: false,
    flags: [],
  },
  "follow-ups": {
    key: "follow-ups",
    category: "metrics",
    enabledByDefault: true,
    aiEnabled: false,
    flags: [],
  },
  "messaging-center": {
    key: "messaging-center",
    category: "messaging",
    enabledByDefault: true,
    aiEnabled: true,
    flags: [],
  },
  "power-of5": {
    key: "power-of5",
    category: "metrics",
    enabledByDefault: true,
    aiEnabled: false,
    flags: [],
  },
  "vote-goal": {
    key: "vote-goal",
    category: "metrics",
    enabledByDefault: true,
    aiEnabled: false,
    flags: [],
  },
} as const;

export default featureRegistry;
