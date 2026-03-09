import React from "react"
import cardRegistry from "./registry"

export type CardConfig = {
  type: string
  props?: Record<string, any>
}

export function loadCard(config: CardConfig) {

  const CardComponent = cardRegistry[config.type]

  if (!CardComponent) {
    return (
      <div style={{ padding: 16, border: "1px solid red" }}>
        Unknown card type: {config.type}
      </div>
    )
  }

  return <CardComponent {...(config.props || {})} />
}