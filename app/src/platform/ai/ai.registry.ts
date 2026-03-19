export type AIToolDefinition = {
  key: string
  moduleKey: string
  title: string
  description?: string
  keywords?: string[]
  actionType?: string
  requiresApproval?: boolean
  execute?: (input: any) => Promise<any> | any
}

export type AIActionDefinition = {
  key: string
  moduleKey: string
  title: string
  description?: string
  keywords?: string[]
  actionType?: string
  requiresApproval?: boolean
  run?: (input: any) => Promise<any> | any
}

class AIRegistryInternal {

  private tools = new Map<string, AIToolDefinition>()
  private actions = new Map<string, AIActionDefinition>()

  /* -------------------------
     TOOL REGISTRY
  --------------------------*/

  hasTool(key: string) {
    return this.tools.has(key)
  }

  registerTool(tool: AIToolDefinition) {
    this.tools.set(tool.key, tool)
  }

  getTool(key: string) {
    return this.tools.get(key)
  }

  getAllTools() {
    return Array.from(this.tools.values())
  }

  getToolsByModule(moduleKey: string) {
    return this.getAllTools().filter(t => t.moduleKey === moduleKey)
  }

  /* -------------------------
     ACTION REGISTRY
  --------------------------*/

  hasAction(key: string) {
    return this.actions.has(key)
  }

  registerAction(action: AIActionDefinition) {
    this.actions.set(action.key, action)
  }

  getAction(key: string) {
    return this.actions.get(key)
  }

  getAllActions() {
    return Array.from(this.actions.values())
  }

  getActionsByModule(moduleKey: string) {
    return this.getAllActions().filter(a => a.moduleKey === moduleKey)
  }

}

export const AIRegistry = new AIRegistryInternal()

/*
Backward compatibility for earlier imports
*/
export const aiRegistry = AIRegistry