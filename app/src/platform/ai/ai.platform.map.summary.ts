import { buildPlatformMap } from "./ai.platform.map"

export function buildPlatformMapSummary() {
  const map = buildPlatformMap()

  const lines: string[] = []

  lines.push("Platform Architecture Map")
  lines.push("")

  lines.push(`Modules: ${map.modules.length}`)
  for (const mod of map.modules) {
    lines.push(`- ${mod.name} (${mod.files.length} files)`)
  }

  lines.push("")
  lines.push(`Cards: ${map.cards.length}`)
  for (const card of map.cards) {
    lines.push(`- ${card.category}/${card.name}`)
  }

  lines.push("")
  lines.push(`Services: ${map.services.length}`)
  for (const service of map.services) {
    lines.push(`- ${service.name}`)
  }

  lines.push("")
  lines.push(`Dashboards: ${map.dashboards.length}`)
  for (const dashboard of map.dashboards) {
    lines.push(`- ${dashboard.name}`)
  }

  lines.push("")
  lines.push(`AI Files: ${map.aiFiles.length}`)
  for (const aiFile of map.aiFiles) {
    lines.push(`- ${aiFile.name}`)
  }

  return lines.join("\n")
}
