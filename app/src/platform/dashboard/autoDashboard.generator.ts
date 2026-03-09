import { CardRegistry } from "../registry";
import type {
  CardCategory,
  DashboardTemplate,
  DashboardCardInstance
} from "../../cards/types";

export function generateDashboardFromCategories(
  key: string,
  title: string,
  categories: CardCategory[]
): DashboardTemplate {
  const cards = CardRegistry.getAll().filter((card) =>
    categories.includes(card.category)
  );

  const instances: DashboardCardInstance[] = cards.map((card, index) => ({
    id: `${card.key}-${index + 1}`,
    cardKey: card.key,
    placement: {
      x: 0,
      y: index,
      w: card.defaultWidth,
      h: card.defaultHeight ?? "md"
    }
  }));

  return {
    key,
    title,
    category: "custom",
    version: 1,
    aiEnabled: true,
    defaultLayoutMode: "grid",
    cards: instances
  };
}