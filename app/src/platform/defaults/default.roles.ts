import { RoleRegistry } from "../registry";
import type { RoleDashboardDefinition } from "@cards/types";

const DEFAULT_ROLES: RoleDashboardDefinition[] = [
  {
    role: "platform_admin",
    defaultDashboardTemplateKey: "war_room",
    aiAccessLevel: "admin",
    maxAIPromptsPerDay: 1000,
    defaultFeatures: {
      admin: true,
      ai: true,
      messaging: true,
      fundraising: true,
      social: true,
      analytics: true
    }
  },
  {
    role: "campaign_manager",
    defaultDashboardTemplateKey: "war_room",
    aiAccessLevel: "generate",
    maxAIPromptsPerDay: 250,
    defaultFeatures: {
      ai: true,
      messaging: true,
      sms: true,
      email: true,
      analytics: true,
      field: true
    }
  },
  {
    role: "field_director",
    defaultDashboardTemplateKey: "war_room",
    aiAccessLevel: "assist",
    maxAIPromptsPerDay: 100,
    defaultFeatures: {
      field: true,
      contacts: true,
      followups: true,
      analytics: true
    }
  },
  {
    role: "volunteer",
    defaultDashboardTemplateKey: "war_room",
    aiAccessLevel: "read_only",
    maxAIPromptsPerDay: 20,
    defaultFeatures: {
      contacts: true,
      followups: true
    }
  }
];

export function registerDefaultRoles() {
  DEFAULT_ROLES.forEach((role) => RoleRegistry.register(role));
}