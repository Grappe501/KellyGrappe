export const microroomRegistry = {
  "campaign-hq": {
    key: "campaign-hq",
    dashboards: ["war-room", "communications", "data-intelligence"],
  },
  "field-ops": {
    key: "field-ops",
    dashboards: ["field-operations", "war-room"],
  },
  "engagement-hub": {
    key: "engagement-hub",
    dashboards: ["communications", "field-operations"],
  },
  "fundraising-hub": {
    key: "fundraising-hub",
    dashboards: ["fundraising", "data-intelligence"],
  },
} as const;

export default microroomRegistry;
