import { AIRegistry } from "@platform/ai/ai.registry"

export function registerVolunteerIntelligenceAI() {

  if (!AIRegistry.hasTool("volunteerintelligence.summarize")) {
    AIRegistry.registerTool({
      key: "volunteerintelligence.summarize",
      moduleKey: "volunteerintelligence",
      title: "Summarize VolunteerIntelligence",
      description: "Summarize data and status for the VolunteerIntelligence module.",
      actionType: "read",
      keywords: ["volunteerintelligence", "summarize", "volunteer-intelligence"]
    })
  }

  if (!AIRegistry.hasAction("volunteerintelligence.draft")) {
    AIRegistry.registerAction({
      key: "volunteerintelligence.draft",
      moduleKey: "volunteerintelligence",
      title: "Draft VolunteerIntelligence content",
      description: "Draft module-specific content or outreach for VolunteerIntelligence.",
      actionType: "write",
      keywords: ["volunteerintelligence", "draft", "volunteer-intelligence"]
    })
  }

}

registerVolunteerIntelligenceAI()
