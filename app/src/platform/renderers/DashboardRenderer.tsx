import React from "react";

import type {
  DashboardRuntimeContext,
  DashboardTemplate
} from "@cards/types";

import CardRenderer from "./CardRenderer";

type DashboardRendererProps = {
  template: DashboardTemplate;
  runtime: DashboardRuntimeContext;
};

function widthClass(w?: number) {
  switch (w) {
    case 1:
      return "xl:col-span-1";
    case 2:
      return "xl:col-span-2";
    case 3:
      return "xl:col-span-3";
    case 4:
      return "xl:col-span-4";
    case 6:
      return "xl:col-span-6";
    case 12:
    default:
      return "xl:col-span-12";
  }
}

export default function DashboardRenderer({
  template,
  runtime
}: DashboardRendererProps) {
  const visibleCards = template.cards.filter((card) => card.visible !== false);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {visibleCards.map((instance) => (
        <div
          key={instance.id}
          className={widthClass(instance.placement?.w)}
        >
          <CardRenderer
            instance={instance}
            runtime={runtime}
          />
        </div>
      ))}
    </div>
  );
}