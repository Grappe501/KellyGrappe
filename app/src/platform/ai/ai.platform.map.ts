import fs from "fs"
import path from "path"

export type PlatformMap = {
  modules: Array<{
    name: string
    path: string
    files: string[]
  }>
  cards: Array<{
    category: string
    name: string
    path: string
  }>
  services: Array<{
    name: string
    path: string
  }>
  dashboards: Array<{
    name: string
    path: string
  }>
  aiFiles: Array<{
    name: string
    path: string
  }>
}

function projectRoot() {
  return process.cwd()
}

function safeReadDir(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
  } catch {
    return []
  }
}

function safeReadDirWithTypes(dir: string) {
  try {
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

function isCodeFile(name: string) {
  return /\.(ts|tsx|js|jsx|json)$/i.test(name)
}

export function buildPlatformMap(): PlatformMap {
  const root = projectRoot()

  const modulesDir = path.join(root, "app", "src", "modules")
  const cardsDir = path.join(root, "app", "src", "cards")
  const servicesDir = path.join(root, "app", "src", "shared", "utils", "db", "services")
  const dashboardsDir = path.join(root, "app", "src", "platform", "dashboard", "templates")
  const aiDir = path.join(root, "app", "src", "platform", "ai")

  const modules = safeReadDirWithTypes(modulesDir)
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const modulePath = path.join(modulesDir, entry.name)
      const files = safeReadDir(modulePath).filter(isCodeFile)

      return {
        name: entry.name,
        path: modulePath,
        files
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const cardCategories = safeReadDirWithTypes(cardsDir)
    .filter((entry) => entry.isDirectory())

  const cards = cardCategories
    .flatMap((categoryEntry) => {
      const categoryPath = path.join(cardsDir, categoryEntry.name)

      return safeReadDir(categoryPath)
        .filter((file) => /\.tsx?$/i.test(file))
        .map((file) => ({
          category: categoryEntry.name,
          name: file.replace(/\.(ts|tsx)$/i, ""),
          path: path.join(categoryPath, file)
        }))
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const services = safeReadDir(servicesDir)
    .filter((file) => /\.service\.ts$/i.test(file))
    .map((file) => ({
      name: file.replace(/\.service\.ts$/i, ""),
      path: path.join(servicesDir, file)
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const dashboards = safeReadDir(dashboardsDir)
    .filter((file) => /\.template\.ts$/i.test(file))
    .map((file) => ({
      name: file.replace(/\.template\.ts$/i, ""),
      path: path.join(dashboardsDir, file)
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const aiFiles = safeReadDir(aiDir)
    .filter((file) => /\.ts$/i.test(file))
    .map((file) => ({
      name: file.replace(/\.ts$/i, ""),
      path: path.join(aiDir, file)
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    modules,
    cards,
    services,
    dashboards,
    aiFiles
  }
}
