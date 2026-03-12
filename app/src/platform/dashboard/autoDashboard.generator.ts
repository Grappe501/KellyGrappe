import { CardRegistry } from "@platform/registry/card.registry"

type CardWidth = "small" | "medium" | "large" | "full"
type CardHeight = "small" | "medium" | "large"

export type GeneratedDashboardCard = {
  type: string
  x: number
  y: number
  width: CardWidth
  height: CardHeight
}

export type GeneratedDashboard = {
  id: string
  cards: GeneratedDashboardCard[]
}

/**
 * Layout rules by card category
 */
const CARD_LAYOUT_RULES = {
  metrics: { width: "small", height: "small" } as const,
  command: { width: "medium", height: "medium" } as const,
  messaging: { width: "medium", height: "medium" } as const,
  intelligence: { width: "large", height: "medium" } as const,
  default: { width: "medium", height: "medium" } as const
}

/**
 * Determine card size automatically
 */
function getCardSize(card: any) {

  const category = card?.category ?? "default"

  return (
    CARD_LAYOUT_RULES[category as keyof typeof CARD_LAYOUT_RULES] ??
    CARD_LAYOUT_RULES.default
  )

}

/**
 * Sort cards by priority if available
 */
function sortCards(cards: any[]) {

  return [...cards].sort((a, b) => {

    const pA = a?.priority ?? 100
    const pB = b?.priority ?? 100

    return pA - pB

  })

}

/**
 * Simple grid placement
 */
function generateGridLayout(cards: any[]): GeneratedDashboardCard[] {

  const sortedCards = sortCards(cards)

  const result: GeneratedDashboardCard[] = []

  let x = 0
  let y = 0

  const maxColumns = 3

  sortedCards.forEach((card) => {

    if (!card?.key) return

    const size = getCardSize(card)

    result.push({

      type: card.key,

      x,
      y,

      width: size.width,
      height: size.height

    })

    x++

    if (x >= maxColumns) {

      x = 0
      y++

    }

  })

  return result

}

/**
 * Generate automatic dashboard from registered cards
 */
export function generateAutoDashboard(): GeneratedDashboard {

  const cards = CardRegistry.getAll()

  if (!cards || cards.length === 0) {

    return {
      id: "auto-dashboard",
      cards: []
    }

  }

  const layout = generateGridLayout(cards)

  return {
    id: "auto-dashboard",
    cards: layout
  }

}
