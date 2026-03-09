from pathlib import Path

ROOT = Path(".").resolve()


def write_file(path: str, content: str):
    file_path = ROOT / path

    if file_path.exists():
        print(f"SKIP (exists): {path}")
        return

    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content.strip() + "\n", encoding="utf-8")

    print(f"CREATED: {path}")


print("\nGenerating platform scaffolding...\n")


# ---------------------------------------------------
# PLATFORM BOOTSTRAP
# ---------------------------------------------------

write_file(
    "app/src/platform/PlatformBootstrap.ts",
    """
import "@/cards/registry"

import "@/platform/defaults/default.roles"
import "@/platform/defaults/default.features"
import "@/platform/defaults/default.microrooms"
import "@/platform/defaults/default.brands"

import "@/dashboards/templates/warRoom.template"

export function bootstrapPlatform() {

  console.log("Platform bootstrap complete")

}
"""
)

# ---------------------------------------------------
# CARD RENDERER
# ---------------------------------------------------

write_file(
    "app/src/platform/renderers/CardRenderer.tsx",
    """
import React from "react"
import { CardRegistry } from "@/cards/registry"

export default function CardRenderer({ cardType, props }: any) {

  const Card = CardRegistry[cardType]

  if (!Card) {
    return <div>Unknown card: {cardType}</div>
  }

  return <Card {...props} />

}
"""
)

# ---------------------------------------------------
# DASHBOARD RENDERER
# ---------------------------------------------------

write_file(
    "app/src/platform/renderers/DashboardRenderer.tsx",
    """
import React from "react"
import CardRenderer from "./CardRenderer"

export default function DashboardRenderer({ template }: any) {

  return (

    <div className="dashboard-grid">

      {template.cards.map((card: any, i: number) => (
        <CardRenderer key={i} cardType={card.type} props={card.props} />
      ))}

    </div>

  )

}
"""
)

# ---------------------------------------------------
# CARD REGISTRY
# ---------------------------------------------------

write_file(
    "app/src/cards/registry.ts",
    """
import MessagingCenterCard from "./messaging/MessagingCenterCard"
import CommandSearchCard from "./command/CommandSearchCard"

export const CardRegistry = {

  messagingCenter: MessagingCenterCard,
  commandSearch: CommandSearchCard

}
"""
)

write_file(
    "app/src/cards/index.ts",
    """
export * from "./registry"
"""
)

# ---------------------------------------------------
# DASHBOARD TEMPLATE
# ---------------------------------------------------

write_file(
    "app/src/dashboards/templates/warRoom.template.ts",
    """
export const warRoomTemplate = {

  id: "warRoom",

  cards: [

    { type: "commandSearch" },
    { type: "messagingCenter" }

  ]

}
"""
)

# ---------------------------------------------------
# BASIC CARD STUBS
# ---------------------------------------------------

write_file(
    "app/src/cards/messaging/MessagingCenterCard.tsx",
    """
import React from "react"

export default function MessagingCenterCard() {

  return (

    <div className="card">

      <h2>Messaging Center</h2>

    </div>

  )

}
"""
)

write_file(
    "app/src/cards/command/CommandSearchCard.tsx",
    """
import React from "react"

export default function CommandSearchCard() {

  return (

    <div className="card">

      <h2>Command Search</h2>

    </div>

  )

}
"""
)

# ---------------------------------------------------
# THEME SYSTEM
# ---------------------------------------------------

write_file(
    "app/src/theme/theme.tokens.ts",
    """
export const themeTokens = {

  brandPrimary: "#1E40AF",
  brandAccent: "#9333EA"

}
"""
)

write_file(
    "app/src/theme/ThemeProvider.tsx",
    """
import React from "react"

export function ThemeProvider({ children }: any) {

  return <>{children}</>

}
"""
)

# ---------------------------------------------------

print("\nPlatform scaffold generation complete.\n")