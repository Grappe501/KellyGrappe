import React from "react"

export interface CardRegistryEntry {
  key: string
  title?: string
  subtitle?: string
  category?: string
  circle?: string
  tags?: string[]
  dependencies?: string[]
  componentLoader?: () => Promise<any>
  component?: React.ComponentType<any>
  render?: () => React.ReactNode
}

const registry: Record<string, CardRegistryEntry> = {}

export const CardRegistry = {
  register(entry: CardRegistryEntry) {
    registry[entry.key] = entry
  },

  get(key: string): CardRegistryEntry | undefined {
    return registry[key]
  },

  getAll(): CardRegistryEntry[] {
    return Object.values(registry)
  },

  has(key: string): boolean {
    return key in registry
  },

  mount(key: string): React.ReactNode {
    const entry = registry[key]

    if (!entry) {
      return React.createElement(
        "div",
        {
          style: {
            padding: "16px",
            color: "#f87171"
          }
        },
        `Card not found: ${key}`
      )
    }

    if (typeof entry.render === "function") {
      return entry.render()
    }

    if (entry.component) {
      return React.createElement(entry.component)
    }

    return React.createElement(
      "div",
      {
        style: {
          padding: "16px",
          color: "#f59e0b"
        }
      },
      `Card has no renderable component: ${key}`
    )
  }
}