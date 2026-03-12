import fs from "fs"
import path from "path"

export type PlatformScanResult = {
  modules: string[]
  cards: string[]
  services: string[]
  dashboards: string[]
}

function readDirSafe(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
  } catch {
    return []
  }
}

function projectRoot() {
  return process.cwd()
}

export function scanPlatform(): PlatformScanResult {

  const root = projectRoot()

  const modulesDir = path.join(root, "app", "src", "modules")
  const cardsDir = path.join(root, "app", "src", "cards")
  const servicesDir = path.join(root, "app", "src", "shared", "utils", "db", "services")
  const dashboardsDir = path.join(root, "app", "src", "dashboards")

  const modules = readDirSafe(modulesDir)
  const cards = readDirSafe(cardsDir)
  const services = readDirSafe(servicesDir)
  const dashboards = readDirSafe(dashboardsDir)

  return {
    modules,
    cards,
    services,
    dashboards
  }
}
