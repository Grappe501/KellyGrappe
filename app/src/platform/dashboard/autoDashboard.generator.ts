import { CardRegistry } from "@platform/registry"
import type { CardCategory, DashboardCardInstance } from "@cards/types"

export function generateDashboard(category?: CardCategory) {
  const cards = CardRegistry.getAll()

  const filtered = category
    ? cards.filter((card) => card.category === category)
    : cards

  return filtered.map((card, index): DashboardCardInstance => ({
    id: `${card.key}-${index + 1}`,
    cardKey: card.key,
    visible: true,
    placement: {
      w: card.defaultWidth === "full" ? 12 : Number(card.defaultWidth),
      h: card.defaultHeight ?? "md"
    }
  }))
}