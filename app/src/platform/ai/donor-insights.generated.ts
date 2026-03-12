import { AIRegistry } from "@platform/ai/ai.registry"

export function registerDonorInsightsAI() {

  if (!AIRegistry.hasTool("donorinsights.tool")) {
    AIRegistry.registerTool({
      key: "donorinsights.tool",
      moduleKey: "donors",
      title: "DonorInsights Tool",
      description: "Generated AI tool for DonorInsights.",
      actionType: "read",
      keywords: ["donors", "donorinsights", "tool"]
    })
  }

  if (!AIRegistry.hasAction("donorinsights.action")) {
    AIRegistry.registerAction({
      key: "donorinsights.action",
      moduleKey: "donors",
      title: "DonorInsights Action",
      description: "Generated AI action for DonorInsights.",
      actionType: "write",
      keywords: ["donors", "donorinsights", "action"]
    })
  }

}

registerDonorInsightsAI()
