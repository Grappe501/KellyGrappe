import { scanPlatform } from "./ai.platform.scanner"

export function buildPlatformSummary() {

  const result = scanPlatform()

  return [
    "Platform Scan:",
    "",
    `Modules: ${result.modules.length}`,
    result.modules.join(", "),
    "",
    `Cards: ${result.cards.length}`,
    result.cards.join(", "),
    "",
    `Services: ${result.services.length}`,
    result.services.join(", "),
    "",
    `Dashboards: ${result.dashboards.length}`,
    result.dashboards.join(", ")
  ].join("\n")

}
