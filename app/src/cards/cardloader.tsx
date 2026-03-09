import React from "react"
import cardRegistry from "./registry"

export type CardConfig = {
  type: string
  props?: Record<string, unknown>
}

export function loadCard(config: CardConfig) {

  const registry = cardRegistry as Record<
    string,
    React.ComponentType<Record<string, unknown>>
  >

  const CardComponent = registry[config.type]

  if (!CardComponent) {

    return (
      <div
        style={{
          padding: 16,
          border: "1px solid red",
          borderRadius: 4,
          background: "#fff5f5",
          color: "#b91c1c",
          fontSize: 14
        }}
      >
        Unknown card type: <strong>{config.type}</strong>
      </div>
    )

  }

  return <CardComponent {...(config.props ?? {})} />

}