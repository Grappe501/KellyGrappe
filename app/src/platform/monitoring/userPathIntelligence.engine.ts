// app/src/platform/monitoring/userPathIntelligence.engine.ts

import {
    platformBootLoader,
    type PlatformModuleKind,
    type PlatformTelemetryEvent,
    type RuntimeModuleRecord
  } from "@platform/kernel/platformBootLoader"
  
  export interface UserPathSnapshot {
    userId: string
    generatedAt: string
    totalEvents: number
    activeDays: number
    preferredModuleKinds: Array<{ kind: PlatformModuleKind; score: number }>
    preferredCircles: Array<{ key: string; score: number }>
    preferredTags: Array<{ key: string; score: number }>
    preferredModules: Array<{ key: string; score: number }>
    recentModules: string[]
  }
  
  export interface UserPathRecommendation {
    key: string
    score: number
    reason: string
    kind?: PlatformModuleKind
    circle?: string
    tags: string[]
  }
  
  export interface AdaptiveDashboardSuggestion {
    dashboardKey: string
    score: number
    reasons: string[]
    suggestedCards: string[]
  }
  
  export interface UserPathInsight {
    userId: string
    lastUpdatedAt?: string
    totalEvents: number
    activeDays: Record<string, true>
    moduleKindScores: Partial<Record<PlatformModuleKind, number>>
    circleScores: Record<string, number>
    tagScores: Record<string, number>
    moduleScores: Record<string, number>
    recentModules: string[]
    recommendationHistory: Array<{
      generatedAt: string
      keys: string[]
    }>
  }
  
  export interface UserPathIntelligenceReport {
    snapshot: UserPathSnapshot
    recommendations: UserPathRecommendation[]
    dashboards: AdaptiveDashboardSuggestion[]
  }
  
  const RECENT_MODULE_LIMIT = 20
  const RECOMMENDATION_HISTORY_LIMIT = 12
  const MAX_RECOMMENDATIONS = 10
  const MAX_DASHBOARD_SUGGESTIONS = 5
  
  function nowIso(): string {
    return new Date().toISOString()
  }
  
  function toDayKey(timestamp?: string): string {
    if (!timestamp) return ""
    return timestamp.slice(0, 10)
  }
  
  function safeString(value: unknown): string {
    return typeof value === "string" ? value.trim() : ""
  }
  
  function uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>()
    const result: string[] = []
  
    for (const value of values) {
      const normalized = safeString(value)
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      result.push(normalized)
    }
  
    return result
  }
  
  function incrementCounter(
    target: Record<string, number>,
    key: string,
    amount = 1
  ): void {
    const normalized = safeString(key)
    if (!normalized) return
    target[normalized] = (target[normalized] ?? 0) + amount
  }
  
  function incrementKindCounter(
    target: Partial<Record<PlatformModuleKind, number>>,
    key: PlatformModuleKind,
    amount = 1
  ): void {
    target[key] = (target[key] ?? 0) + amount
  }
  
  function sortScoreMap(
    scores: Record<string, number>
  ): Array<{ key: string; score: number }> {
    return Object.entries(scores)
      .map(([key, score]) => ({ key, score }))
      .sort((a, b) => b.score - a.score)
  }
  
  function sortKindScoreMap(
    scores: Partial<Record<PlatformModuleKind, number>>
  ): Array<{ kind: PlatformModuleKind; score: number }> {
    return Object.entries(scores)
      .map(([kind, score]) => ({
        kind: kind as PlatformModuleKind,
        score: score ?? 0
      }))
      .sort((a, b) => b.score - a.score)
  }
  
  function collectModuleTags(module: RuntimeModuleRecord): string[] {
    return Array.isArray(module.tags) ? module.tags.filter(Boolean) : []
  }
  
  function buildReason(
    module: RuntimeModuleRecord,
    insight: UserPathInsight
  ): string {
    const reasons: string[] = []
  
    if (module.circle && (insight.circleScores[module.circle] ?? 0) > 0) {
      reasons.push(`strong activity in ${module.circle}`)
    }
  
    const tags = collectModuleTags(module)
    const matchedTags = tags.filter((tag) => (insight.tagScores[tag] ?? 0) > 0)
  
    if (matchedTags.length > 0) {
      reasons.push(`matches tags: ${matchedTags.slice(0, 2).join(", ")}`)
    }
  
    if (insight.moduleKindScores[module.kind] && insight.moduleKindScores[module.kind]! > 0) {
      reasons.push(`user often opens ${module.kind} modules`)
    }
  
    if (reasons.length === 0) {
      reasons.push("high fit based on current pathway patterns")
    }
  
    return reasons.join("; ")
  }
  
  export class UserPathIntelligenceEngine {
    private insights: Record<string, UserPathInsight> = {}
  
    syncFromBootTelemetry(): void {
      const telemetry = platformBootLoader.getState().telemetry
  
      for (const event of telemetry) {
        this.ingestTelemetryEvent(event)
      }
    }
  
    ingestTelemetryEvent(event: PlatformTelemetryEvent): void {
      const userId = safeString(event.userId)
      if (!userId) return
  
      const insight = this.ensureInsight(userId)
      insight.lastUpdatedAt = event.timestamp
      insight.totalEvents += 1
  
      const dayKey = toDayKey(event.timestamp)
      if (dayKey) {
        insight.activeDays[dayKey] = true
      }
  
      const moduleKey = safeString(event.moduleKey)
      const moduleKind = event.moduleKind
      const module =
        moduleKey.length > 0
          ? platformBootLoader.getRegisteredModules().find((item) => item.key === moduleKey)
          : undefined
  
      const baseWeight = this.getEventWeight(event.type)
  
      if (moduleKind) {
        incrementKindCounter(insight.moduleKindScores, moduleKind, baseWeight)
      }
  
      if (moduleKey) {
        incrementCounter(insight.moduleScores, moduleKey, baseWeight)
        this.pushRecentModule(insight, moduleKey)
      }
  
      if (module?.circle) {
        incrementCounter(insight.circleScores, module.circle, baseWeight * 2)
      }
  
      if (module) {
        for (const tag of collectModuleTags(module)) {
          incrementCounter(insight.tagScores, tag, baseWeight)
        }
      }
  
      const pathwaySource = safeString(event.pathwaySource)
      if (pathwaySource) {
        incrementCounter(insight.tagScores, `path:${pathwaySource}`, baseWeight)
      }
  
      if (event.type === "warning" && moduleKey) {
        incrementCounter(insight.tagScores, `warning:${moduleKey}`, 1)
      }
    }
  
    getInsight(userId: string): UserPathInsight | null {
      return this.insights[safeString(userId)] ?? null
    }
  
    getSnapshot(userId: string): UserPathSnapshot | null {
      const insight = this.getInsight(userId)
      if (!insight) return null
  
      return {
        userId: insight.userId,
        generatedAt: nowIso(),
        totalEvents: insight.totalEvents,
        activeDays: Object.keys(insight.activeDays).length,
        preferredModuleKinds: sortKindScoreMap(insight.moduleKindScores).slice(0, 5),
        preferredCircles: sortScoreMap(insight.circleScores).slice(0, 8),
        preferredTags: sortScoreMap(insight.tagScores).slice(0, 10),
        preferredModules: sortScoreMap(insight.moduleScores).slice(0, 10),
        recentModules: [...insight.recentModules]
      }
    }
  
    recommendModules(userId: string): UserPathRecommendation[] {
      const insight = this.getInsight(userId)
      if (!insight) return []
  
      const moduleUniverse = platformBootLoader.getRegisteredModules()
      const recommendations: UserPathRecommendation[] = []
  
      for (const module of moduleUniverse) {
        const score = this.scoreModuleForUser(module, insight)
        if (score <= 0) continue
  
        recommendations.push({
          key: module.key,
          score,
          reason: buildReason(module, insight),
          kind: module.kind,
          circle: module.circle,
          tags: collectModuleTags(module)
        })
      }
  
      const top = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RECOMMENDATIONS)
  
      insight.recommendationHistory.push({
        generatedAt: nowIso(),
        keys: top.map((item) => item.key)
      })
  
      if (insight.recommendationHistory.length > RECOMMENDATION_HISTORY_LIMIT) {
        insight.recommendationHistory = insight.recommendationHistory.slice(
          insight.recommendationHistory.length - RECOMMENDATION_HISTORY_LIMIT
        )
      }
  
      return top
    }
  
    suggestDashboards(userId: string): AdaptiveDashboardSuggestion[] {
      const insight = this.getInsight(userId)
      if (!insight) return []
  
      const dashboards = platformBootLoader.getRegisteredModules("dashboard")
      const cards = platformBootLoader.getRegisteredModules("card")
      const circles = sortScoreMap(insight.circleScores).slice(0, 3).map((item) => item.key)
      const preferredTags = sortScoreMap(insight.tagScores).slice(0, 6).map((item) => item.key)
  
      const suggestions: AdaptiveDashboardSuggestion[] = dashboards.map((dashboard) => {
        let score = 0
        const reasons: string[] = []
        const suggestedCards: string[] = []
  
        if (dashboard.circle && circles.includes(dashboard.circle)) {
          score += 8
          reasons.push(`aligned with ${dashboard.circle} activity`)
        }
  
        const tagMatches = dashboard.tags.filter((tag) => preferredTags.includes(tag))
        if (tagMatches.length > 0) {
          score += tagMatches.length * 3
          reasons.push(`matches tags ${tagMatches.slice(0, 2).join(", ")}`)
        }
  
        for (const card of cards) {
          if (!card.circle || !circles.includes(card.circle)) continue
          if (suggestedCards.length >= 4) break
          if (dashboard.circle && card.circle !== dashboard.circle) continue
  
          suggestedCards.push(card.key)
          score += 1
        }
  
        return {
          dashboardKey: dashboard.key,
          score,
          reasons: uniqueStrings(reasons),
          suggestedCards: uniqueStrings(suggestedCards)
        }
      })
  
      return suggestions
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_DASHBOARD_SUGGESTIONS)
    }
  
    buildReport(userId: string): UserPathIntelligenceReport | null {
      const snapshot = this.getSnapshot(userId)
      if (!snapshot) return null
  
      return {
        snapshot,
        recommendations: this.recommendModules(userId),
        dashboards: this.suggestDashboards(userId)
      }
    }
  
    clearUser(userId: string): void {
      delete this.insights[safeString(userId)]
    }
  
    clearAll(): void {
      this.insights = {}
    }
  
    private ensureInsight(userId: string): UserPathInsight {
      const normalizedUserId = safeString(userId)
  
      if (!this.insights[normalizedUserId]) {
        this.insights[normalizedUserId] = {
          userId: normalizedUserId,
          totalEvents: 0,
          activeDays: {},
          moduleKindScores: {},
          circleScores: {},
          tagScores: {},
          moduleScores: {},
          recentModules: [],
          recommendationHistory: []
        }
      }
  
      return this.insights[normalizedUserId]
    }
  
    private getEventWeight(eventType: PlatformTelemetryEvent["type"]): number {
      switch (eventType) {
        case "boot":
          return 1
        case "activate":
          return 3
        case "hydrate":
          return 4
        case "pathway":
          return 5
        case "deactivate":
          return 1
        case "warning":
          return 1
        default:
          return 1
      }
    }
  
    private pushRecentModule(insight: UserPathInsight, moduleKey: string): void {
      const normalized = safeString(moduleKey)
      if (!normalized) return
  
      insight.recentModules = [
        normalized,
        ...insight.recentModules.filter((item) => item !== normalized)
      ].slice(0, RECENT_MODULE_LIMIT)
    }
  
    private scoreModuleForUser(
      module: RuntimeModuleRecord,
      insight: UserPathInsight
    ): number {
      let score = 0
  
      score += insight.moduleScores[module.key] ?? 0
      score += (insight.moduleKindScores[module.kind] ?? 0) * 0.75
  
      if (module.circle) {
        score += (insight.circleScores[module.circle] ?? 0) * 1.25
      }
  
      for (const tag of collectModuleTags(module)) {
        score += insight.tagScores[tag] ?? 0
      }
  
      if (insight.recentModules.includes(module.key)) {
        score += 6
      }
  
      if (module.activated) {
        score += 2
      }
  
      if (module.hydrated) {
        score += 1
      }
  
      return score
    }
  }
  
  export const userPathIntelligenceEngine = new UserPathIntelligenceEngine()