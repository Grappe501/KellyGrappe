// app/src/platform/kernel/platformBootLoader.ts

import { CircleRegistry } from "../registry/circle.registry";
import { CardRegistry } from "../registry/card.registry";
import { DashboardRegistry } from "../registry/dashboard.registry";
import { EngineRegistry } from "../registry/engine.registry";

export type PlatformModuleKind =
  | "circle"
  | "card"
  | "dashboard"
  | "engine"
  | "service"
  | "ai-role";

export interface PlatformActivationRequest {
  organizationId?: string;
  workspaceId?: string;
  roomId?: string;
  dashboardKey?: string;
  circleKeys?: string[];
  cardKeys?: string[];
  engineKeys?: string[];
  preload?: boolean;
  userId?: string;
  sessionId?: string;
  pathwaySource?: string;
  hydrationMode?: "none" | "requested-only" | "with-dependencies";
}

export interface RegistryEntry {
  key: string;
  kind: PlatformModuleKind;
  source: string;
  circle?: string;
  tags?: string[];
  dependencies?: string[];
  eager?: boolean;
  preloadPriority?: number;
  loader?: () => Promise<unknown>;
  value?: unknown;
}

export interface RuntimeModuleRecord {
  key: string;
  kind: PlatformModuleKind;
  source: string;
  circle?: string;
  tags: string[];
  dependencies: string[];
  loaded: boolean;
  activated: boolean;
  hydrated: boolean;
  eager: boolean;
  preloadPriority: number;
  activationCount: number;
  hydrationCount: number;
  errorCount: number;
  lastActivatedAt?: string;
  lastHydratedAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
}

export interface PlatformTelemetryEvent {
  id: string;
  type:
    | "boot"
    | "activate"
    | "hydrate"
    | "deactivate"
    | "warning"
    | "pathway";
  moduleKey?: string;
  moduleKind?: PlatformModuleKind;
  userId?: string;
  sessionId?: string;
  pathwaySource?: string;
  message?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UserPathPreferenceProfile {
  userId: string;
  sessionCount: number;
  bootCount: number;
  dashboardViews: Record<string, number>;
  circleViews: Record<string, number>;
  cardViews: Record<string, number>;
  engineViews: Record<string, number>;
  preferredTags: Record<string, number>;
  lastActiveAt?: string;
}

export interface PlatformRuntimeState {
  initialized: boolean;
  bootedAt?: string;
  activeOrganizationId?: string;
  activeWorkspaceId?: string;
  activeRoomId?: string;
  activeDashboardKey?: string;
  activeUserId?: string;
  activeSessionId?: string;
  modules: Record<string, RuntimeModuleRecord>;
  telemetry: PlatformTelemetryEvent[];
  userPathProfiles: Record<string, UserPathPreferenceProfile>;
}

export interface BootLoadResult {
  success: boolean;
  activatedModules: string[];
  hydratedModules: string[];
  warnings: string[];
  state: PlatformRuntimeState;
}

type RegistryShape = Record<string, unknown>;

const MAX_TELEMETRY_EVENTS = 500;
const MAX_RECOMMENDATIONS = 10;

function nowIso(): string {
  return new Date().toISOString();
}

function makeEventId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeObjectEntries(value: unknown): Array<[string, unknown]> {
  if (!isRecord(value)) return [];
  return Object.entries(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function incrementCounter(
  target: Record<string, number>,
  key: string,
  amount = 1
): void {
  if (!key) return;
  target[key] = (target[key] ?? 0) + amount;
}

function sortRecommendationMap(
  map: Record<string, number>
): Array<{ key: string; score: number }> {
  return Object.entries(map)
    .map(([key, score]) => ({ key, score }))
    .sort((a, b) => b.score - a.score);
}

export class PlatformBootLoader {
  private state: PlatformRuntimeState = {
    initialized: false,
    modules: {},
    telemetry: [],
    userPathProfiles: {},
  };

  initialize(): PlatformRuntimeState {
    const entries = [
      ...this.collectRegistryEntries(CircleRegistry, "circle", "CircleRegistry"),
      ...this.collectRegistryEntries(CardRegistry, "card", "CardRegistry"),
      ...this.collectRegistryEntries(
        DashboardRegistry,
        "dashboard",
        "DashboardRegistry"
      ),
      ...this.collectRegistryEntries(EngineRegistry, "engine", "EngineRegistry"),
    ];

    for (const entry of entries) {
      this.registerRuntimeModule(entry);
    }

    this.state.initialized = true;
    this.state.bootedAt = nowIso();

    return this.getState();
  }

  boot(request: PlatformActivationRequest = {}): BootLoadResult {
    if (!this.state.initialized) {
      this.initialize();
    }

    this.applyContext(request);

    const warnings: string[] = [];
    const activatedModules: string[] = [];
    const requestedKeys = this.buildRequestedKeySet(request);
    const orderedKeys = this.resolveDependencies(requestedKeys, warnings);

    this.recordTelemetry({
      type: "boot",
      userId: request.userId,
      sessionId: request.sessionId,
      pathwaySource: request.pathwaySource,
      message: "Platform boot requested",
      metadata: {
        requestedKeys,
        hydrationMode: request.hydrationMode ?? "none",
        preload: !!request.preload,
      },
    });

    for (const key of orderedKeys) {
      const record = this.state.modules[key];

      if (!record) {
        warnings.push(`Module not found: ${key}`);
        this.recordWarning(`Module not found: ${key}`, request);
        continue;
      }

      record.loaded = true;
      record.activated = true;
      record.activationCount += 1;
      record.lastActivatedAt = nowIso();
      activatedModules.push(key);

      this.recordTelemetry({
        type: "activate",
        moduleKey: record.key,
        moduleKind: record.kind,
        userId: request.userId,
        sessionId: request.sessionId,
        pathwaySource: request.pathwaySource,
        message: `Activated ${record.kind}: ${record.key}`,
        metadata: {
          circle: record.circle,
          dependencies: record.dependencies,
        },
      });

      this.updatePathPreferenceProfile(request.userId, record);
    }

    return {
      success: warnings.length === 0,
      activatedModules,
      hydratedModules: [],
      warnings,
      state: this.getState(),
    };
  }

  async bootAsync(
    request: PlatformActivationRequest = {}
  ): Promise<BootLoadResult> {
    const syncResult = this.boot(request);
    const warnings = [...syncResult.warnings];
    const hydratedModules: string[] = [];
    const hydrationMode = request.hydrationMode ?? "with-dependencies";

    if (hydrationMode === "none") {
      return {
        ...syncResult,
        hydratedModules,
      };
    }

    const keysToHydrate =
      hydrationMode === "requested-only"
        ? this.buildRequestedKeySet(request)
        : syncResult.activatedModules;

    for (const key of keysToHydrate) {
      const hydrated = await this.hydrateModule(key, request);
      if (hydrated) {
        hydratedModules.push(key);
      } else if (this.state.modules[key]) {
        warnings.push(`Hydration failed: ${key}`);
      }
    }

    return {
      success: warnings.length === 0,
      activatedModules: syncResult.activatedModules,
      hydratedModules,
      warnings,
      state: this.getState(),
    };
  }

  preloadDashboardContext(
    dashboardKey: string,
    circleKeys: string[] = [],
    cardKeys: string[] = [],
    engineKeys: string[] = []
  ): BootLoadResult {
    return this.boot({
      dashboardKey,
      circleKeys,
      cardKeys,
      engineKeys,
      preload: true,
      hydrationMode: "none",
    });
  }

  async preloadDashboardContextAsync(
    dashboardKey: string,
    circleKeys: string[] = [],
    cardKeys: string[] = [],
    engineKeys: string[] = []
  ): Promise<BootLoadResult> {
    return this.bootAsync({
      dashboardKey,
      circleKeys,
      cardKeys,
      engineKeys,
      preload: true,
      hydrationMode: "with-dependencies",
    });
  }

  activateModule(key: string, expectedKind?: PlatformModuleKind): boolean {
    const record = this.state.modules[key];
    if (!record) return false;
    if (expectedKind && record.kind !== expectedKind) return false;

    record.loaded = true;
    record.activated = true;
    record.activationCount += 1;
    record.lastActivatedAt = nowIso();

    this.recordTelemetry({
      type: "activate",
      moduleKey: record.key,
      moduleKind: record.kind,
      message: `Activated ${record.kind}: ${record.key}`,
    });

    return true;
  }

  async hydrateModule(
    key: string,
    request?: Pick<
      PlatformActivationRequest,
      "userId" | "sessionId" | "pathwaySource"
    >
  ): Promise<boolean> {
    const record = this.state.modules[key];
    if (!record) return false;
    if (record.hydrated) return true;

    const entry = this.getRegistryEntryForModule(record);
    const loader = entry?.loader;

    try {
      if (typeof loader === "function") {
        await loader();
      }

      record.loaded = true;
      record.hydrated = true;
      record.hydrationCount += 1;
      record.lastHydratedAt = nowIso();

      this.recordTelemetry({
        type: "hydrate",
        moduleKey: record.key,
        moduleKind: record.kind,
        userId: request?.userId,
        sessionId: request?.sessionId,
        pathwaySource: request?.pathwaySource,
        message: `Hydrated ${record.kind}: ${record.key}`,
      });

      return true;
    } catch (error) {
      record.errorCount += 1;
      record.lastErrorAt = nowIso();
      record.lastErrorMessage =
        error instanceof Error ? error.message : "Unknown hydration error";

      this.recordWarning(
        `Failed to hydrate ${record.key}: ${record.lastErrorMessage}`,
        request
      );

      return false;
    }
  }

  deactivateModule(key: string): boolean {
    const record = this.state.modules[key];
    if (!record) return false;

    record.activated = false;

    this.recordTelemetry({
      type: "deactivate",
      moduleKey: record.key,
      moduleKind: record.kind,
      message: `Deactivated ${record.kind}: ${record.key}`,
    });

    return true;
  }

  recordPathwayInteraction(
    userId: string | undefined,
    moduleKey: string,
    interactionType:
      | "dashboard-view"
      | "circle-view"
      | "card-view"
      | "engine-view"
      | "pathway-step" = "pathway-step",
    sessionId?: string,
    pathwaySource?: string
  ): void {
    if (!userId) return;

    const record = this.state.modules[moduleKey];
    if (!record) return;

    const profile = this.ensureUserProfile(userId);
    profile.lastActiveAt = nowIso();

    switch (interactionType) {
      case "dashboard-view":
        incrementCounter(profile.dashboardViews, moduleKey);
        break;
      case "circle-view":
        incrementCounter(profile.circleViews, moduleKey);
        break;
      case "card-view":
        incrementCounter(profile.cardViews, moduleKey);
        break;
      case "engine-view":
        incrementCounter(profile.engineViews, moduleKey);
        break;
      default:
        incrementCounter(profile.preferredTags, `pathway:${moduleKey}`);
        break;
    }

    for (const tag of record.tags) {
      incrementCounter(profile.preferredTags, tag);
    }

    this.recordTelemetry({
      type: "pathway",
      moduleKey,
      moduleKind: record.kind,
      userId,
      sessionId,
      pathwaySource,
      message: `Recorded pathway interaction: ${interactionType}`,
      metadata: {
        interactionType,
        circle: record.circle,
        tags: record.tags,
      },
    });
  }

  getRecommendedModulesForUser(userId: string): string[] {
    const profile = this.state.userPathProfiles[userId];
    if (!profile) return [];

    const scores: Record<string, number> = {};

    for (const [key, value] of Object.entries(profile.dashboardViews)) {
      scores[key] = (scores[key] ?? 0) + value * 5;
    }

    for (const [key, value] of Object.entries(profile.circleViews)) {
      scores[key] = (scores[key] ?? 0) + value * 4;
    }

    for (const [key, value] of Object.entries(profile.cardViews)) {
      scores[key] = (scores[key] ?? 0) + value * 3;
    }

    for (const [key, value] of Object.entries(profile.engineViews)) {
      scores[key] = (scores[key] ?? 0) + value * 2;
    }

    const topTagHints = sortRecommendationMap(profile.preferredTags)
      .slice(0, 5)
      .map((entry) => entry.key);

    for (const module of Object.values(this.state.modules)) {
      if (
        module.tags.some((tag) => topTagHints.includes(tag)) &&
        !scores[module.key]
      ) {
        scores[module.key] = 1;
      }
    }

    return sortRecommendationMap(scores)
      .slice(0, MAX_RECOMMENDATIONS)
      .map((entry) => entry.key);
  }

  getRegisteredModules(kind?: PlatformModuleKind): RuntimeModuleRecord[] {
    const all = Object.values(this.state.modules);
    if (!kind) return all;
    return all.filter((module) => module.kind === kind);
  }

  getState(): PlatformRuntimeState {
    return JSON.parse(JSON.stringify(this.state)) as PlatformRuntimeState;
  }

  resetTelemetry(): void {
    this.state.telemetry = [];
  }

  private applyContext(request: PlatformActivationRequest): void {
    this.state.activeOrganizationId = request.organizationId;
    this.state.activeWorkspaceId = request.workspaceId;
    this.state.activeRoomId = request.roomId;
    this.state.activeDashboardKey = request.dashboardKey;
    this.state.activeUserId = request.userId;
    this.state.activeSessionId = request.sessionId;

    if (request.userId) {
      const profile = this.ensureUserProfile(request.userId);
      profile.bootCount += 1;
      profile.lastActiveAt = nowIso();

      if (request.sessionId) {
        profile.sessionCount += 1;
      }
    }
  }

  private buildRequestedKeySet(request: PlatformActivationRequest): string[] {
    const requestedKeys = new Set<string>();

    if (request.dashboardKey) requestedKeys.add(request.dashboardKey);

    for (const key of request.circleKeys ?? []) requestedKeys.add(key);
    for (const key of request.cardKeys ?? []) requestedKeys.add(key);
    for (const key of request.engineKeys ?? []) requestedKeys.add(key);

    return Array.from(requestedKeys);
  }

  private resolveDependencies(
    requestedKeys: string[],
    warnings: string[]
  ): string[] {
    const visited = new Set<string>();
    const activeStack = new Set<string>();
    const resolved: string[] = [];

    const visit = (key: string): void => {
      if (visited.has(key)) return;

      const record = this.state.modules[key];
      if (!record) {
        warnings.push(`Missing dependency target: ${key}`);
        return;
      }

      if (activeStack.has(key)) {
        warnings.push(`Circular dependency detected at: ${key}`);
        return;
      }

      activeStack.add(key);

      for (const dependencyKey of record.dependencies) {
        if (!this.state.modules[dependencyKey]) {
          warnings.push(
            `Dependency missing for ${record.key}: ${dependencyKey}`
          );
          continue;
        }

        visit(dependencyKey);
      }

      activeStack.delete(key);
      visited.add(key);
      resolved.push(key);
    };

    for (const key of requestedKeys) {
      visit(key);
    }

    return resolved;
  }

  private registerRuntimeModule(entry: RegistryEntry): void {
    const existing = this.state.modules[entry.key];
    if (existing) {
      existing.dependencies = entry.dependencies ?? existing.dependencies;
      existing.tags = entry.tags ?? existing.tags;
      existing.circle = entry.circle ?? existing.circle;
      return;
    }

    this.state.modules[entry.key] = {
      key: entry.key,
      kind: entry.kind,
      source: entry.source,
      circle: entry.circle,
      tags: entry.tags ?? [],
      dependencies: entry.dependencies ?? [],
      loaded: false,
      activated: false,
      hydrated: false,
      eager: !!entry.eager,
      preloadPriority: entry.preloadPriority ?? 0,
      activationCount: 0,
      hydrationCount: 0,
      errorCount: 0,
    };
  }

  private collectRegistryEntries(
    registry: RegistryShape,
    defaultKind: PlatformModuleKind,
    source: string
  ): RegistryEntry[] {
    const entries: RegistryEntry[] = [];

    for (const [key, value] of safeObjectEntries(registry)) {
      entries.push(this.normalizeRegistryEntry(key, value, defaultKind, source));
    }

    return entries;
  }

  private normalizeRegistryEntry(
    key: string,
    value: unknown,
    defaultKind: PlatformModuleKind,
    source: string
  ): RegistryEntry {
    if (isRecord(value)) {
      const normalizedKey =
        typeof value.key === "string" && value.key ? value.key : key;
      const normalizedKind =
        typeof value.kind === "string"
          ? (value.kind as PlatformModuleKind)
          : defaultKind;
      const normalizedSource =
        typeof value.source === "string" && value.source
          ? value.source
          : source;

      return {
        key: normalizedKey,
        kind: normalizedKind,
        source: normalizedSource,
        circle: typeof value.circle === "string" ? value.circle : undefined,
        tags: toStringArray(value.tags),
        dependencies: toStringArray(value.dependencies),
        eager: Boolean(value.eager),
        preloadPriority:
          typeof value.preloadPriority === "number" ? value.preloadPriority : 0,
        loader:
          typeof value.loader === "function"
            ? (value.loader as () => Promise<unknown>)
            : undefined,
        value,
      };
    }

    return {
      key,
      kind: defaultKind,
      source,
      tags: [],
      dependencies: [],
      value,
    };
  }

  private getRegistryEntryForModule(
    record: RuntimeModuleRecord
  ): RegistryEntry | undefined {
    const registry = this.getRegistryByKind(record.kind);
    if (!registry) return undefined;

    const rawEntry = registry[record.key];
    return this.normalizeRegistryEntry(
      record.key,
      rawEntry,
      record.kind,
      record.source
    );
  }

  private getRegistryByKind(kind: PlatformModuleKind): RegistryShape | undefined {
    switch (kind) {
      case "circle":
        return CircleRegistry as RegistryShape;
      case "card":
        return CardRegistry as RegistryShape;
      case "dashboard":
        return DashboardRegistry as RegistryShape;
      case "engine":
        return EngineRegistry as RegistryShape;
      default:
        return undefined;
    }
  }

  private ensureUserProfile(userId: string): UserPathPreferenceProfile {
    const existing = this.state.userPathProfiles[userId];
    if (existing) return existing;

    const created: UserPathPreferenceProfile = {
      userId,
      sessionCount: 0,
      bootCount: 0,
      dashboardViews: {},
      circleViews: {},
      cardViews: {},
      engineViews: {},
      preferredTags: {},
    };

    this.state.userPathProfiles[userId] = created;
    return created;
  }

  private updatePathPreferenceProfile(
    userId: string | undefined,
    record: RuntimeModuleRecord
  ): void {
    if (!userId) return;

    const profile = this.ensureUserProfile(userId);
    profile.lastActiveAt = nowIso();

    switch (record.kind) {
      case "dashboard":
        incrementCounter(profile.dashboardViews, record.key);
        break;
      case "circle":
        incrementCounter(profile.circleViews, record.key);
        break;
      case "card":
        incrementCounter(profile.cardViews, record.key);
        break;
      case "engine":
        incrementCounter(profile.engineViews, record.key);
        break;
      default:
        break;
    }

    for (const tag of record.tags) {
      incrementCounter(profile.preferredTags, tag);
    }

    if (record.circle) {
      incrementCounter(profile.preferredTags, `circle:${record.circle}`);
    }
  }

  private recordWarning(
    message: string,
    request?: Pick<
      PlatformActivationRequest,
      "userId" | "sessionId" | "pathwaySource"
    >
  ): void {
    this.recordTelemetry({
      type: "warning",
      userId: request?.userId,
      sessionId: request?.sessionId,
      pathwaySource: request?.pathwaySource,
      message,
    });
  }

  private recordTelemetry(
    event: Omit<PlatformTelemetryEvent, "id" | "timestamp">
  ): void {
    this.state.telemetry.push({
      id: makeEventId(event.type),
      timestamp: nowIso(),
      ...event,
    });

    if (this.state.telemetry.length > MAX_TELEMETRY_EVENTS) {
      this.state.telemetry = this.state.telemetry.slice(
        this.state.telemetry.length - MAX_TELEMETRY_EVENTS
      );
    }
  }
}

export const platformBootLoader = new PlatformBootLoader();