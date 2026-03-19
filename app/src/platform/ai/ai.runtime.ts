import { aiRegistry } from "./ai.registry"

export class AIRuntime {
  start(): void {
    console.log("[AIRuntime] started", {
      registeredTools: aiRegistry.getAllTools().length,
      registeredActions: aiRegistry.getAllActions().length,
    })
  }
}

export const aiRuntime = new AIRuntime()
