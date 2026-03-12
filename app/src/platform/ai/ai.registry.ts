export type AIActionType = "read" | "write" | "send" | "analyze"

export type AIToolDefinition = {
  key: string
  moduleKey: string
  title: string
  description?: string
  actionType: AIActionType
  requiresApproval?: boolean
  keywords?: string[]
}

export type AIActionDefinition = {
  key: string
  moduleKey: string
  title: string
  description?: string
  actionType: AIActionType
  requiresApproval?: boolean
  keywords?: string[]
}

class AIRegistryClass {
  private tools = new Map<string, AIToolDefinition>()
  private actions = new Map<string, AIActionDefinition>()

  registerTool(tool: AIToolDefinition) {
    this.tools.set(tool.key, tool)
  }

  registerAction(action: AIActionDefinition) {
    this.actions.set(action.key, action)
  }

  hasTool(key: string) {
    return this.tools.has(key)
  }

  hasAction(key: string) {
    return this.actions.has(key)
  }

  getTool(key: string) {
    return this.tools.get(key)
  }

  getAction(key: string) {
    return this.actions.get(key)
  }

  getToolsByModule(moduleKey: string) {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.moduleKey === moduleKey
    )
  }

  getActionsByModule(moduleKey: string) {
    return Array.from(this.actions.values()).filter(
      (action) => action.moduleKey === moduleKey
    )
  }

  getAllTools() {
    return Array.from(this.tools.values())
  }

  getAllActions() {
    return Array.from(this.actions.values())
  }

  search(prompt: string) {
    const normalized = prompt.trim().toLowerCase()

    const tools = this.getAllTools().filter((tool) => {
      const haystack = [
        tool.key,
        tool.moduleKey,
        tool.title,
        tool.description,
        ...(tool.keywords ?? [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalized) || normalized.split(/\s+/).some((term) => haystack.includes(term))
    })

    const actions = this.getAllActions().filter((action) => {
      const haystack = [
        action.key,
        action.moduleKey,
        action.title,
        action.description,
        ...(action.keywords ?? [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalized) || normalized.split(/\s+/).some((term) => haystack.includes(term))
    })

    return { tools, actions }
  }

  reset() {
    this.tools.clear()
    this.actions.clear()
  }
}

export const AIRegistry = new AIRegistryClass()
