import { CardRegistry } from "../registry/card.registry"

type CardWidth = "small" | "medium" | "large" | "full"
type CardHeight = "small" | "medium" | "large"

type GeneratedDashboardCard = {
  type: string
  x: number
  y: number
  width: CardWidth
  height: CardHeight
}

type GeneratedDashboard = {
  id: string
  cards: GeneratedDashboardCard[]
}

export function generateAutoDashboard(): GeneratedDashboard {

  const cards = CardRegistry.getAll()

  const generatedCards: GeneratedDashboardCard[] = cards.map((card, index) => ({
    type: card.key,
    x: index % 3,
    y: Math.floor(index / 3),
    width: "medium",
    height: "medium"
  }))

  return {
    id: "auto-dashboard",
    cards: generatedCards
  }

}