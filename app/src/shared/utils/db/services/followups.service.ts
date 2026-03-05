import {
    openDb,
    reqToPromise,
    txDone,
    uuid,
    nowIso,
    safeTrim,
    isOfflineBestEffort,
    STORE_LIVE_FOLLOWUPS,
  } from "../contactsDb.core";
  import type { LiveFollowUp } from "../contactsDb.types";
  
  function normalizeInitials(raw: unknown): string | undefined {
    const v = safeTrim(raw).toUpperCase();
    if (!v) return undefined;
    const cleaned = v.replace(/[^A-Z0-9]/g, "").slice(0, 3);
    if (!cleaned) return undefined;
    return cleaned;
  }
  
  function applyLiveFollowUpDefaults(input: Partial<LiveFollowUp>): Partial<LiveFollowUp> {
    const entryInitials = normalizeInitials(input.entryInitials) ?? "UNK";
  
    const syncStatus = (input.syncStatus ?? "PENDING_SYNC") as any;
  
    const createdOffline =
      typeof input.createdOffline === "boolean" ? input.createdOffline : isOfflineBestEffort();
  
    return {
      ...input,
      entryInitials,
      syncStatus,
      createdOffline,
    };
  }
  
  export async function addLiveFollowUp(
    input: Omit<LiveFollowUp, "id" | "createdAt"> & { createdAt?: string }
  ): Promise<LiveFollowUp> {
    const db = await openDb();
  
    const base: LiveFollowUp = {
      id: uuid(),
      createdAt: input.createdAt ?? nowIso(),
      ...input,
    };
  
    const row: LiveFollowUp = {
      ...base,
      ...(applyLiveFollowUpDefaults(base) as LiveFollowUp),
    };
  
    const tx = db.transaction(STORE_LIVE_FOLLOWUPS, "readwrite");
    try {
      tx.objectStore(STORE_LIVE_FOLLOWUPS).add(row);
      await txDone(tx);
      return row;
    } catch (e: any) {
      await txDone(tx).catch(() => {});
      throw new Error(e?.message ?? "Failed to add follow-up.");
    }
  }
  
  export async function updateLiveFollowUp(id: string, patch: Partial<LiveFollowUp>): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE_LIVE_FOLLOWUPS, "readwrite");
    const store = tx.objectStore(STORE_LIVE_FOLLOWUPS);
  
    try {
      const existing = (await reqToPromise(store.get(id))) as LiveFollowUp | undefined;
  
      if (!existing) {
        await txDone(tx);
        return;
      }
  
      const next = { ...existing, ...patch } as LiveFollowUp;
      const normalized = applyLiveFollowUpDefaults(next) as LiveFollowUp;
  
      store.put({ ...next, ...normalized });
      await txDone(tx);
    } catch (e: any) {
      await txDone(tx).catch(() => {});
      throw new Error(e?.message ?? "Failed to update follow-up.");
    }
  }
  
  export async function listLiveFollowUps(): Promise<LiveFollowUp[]> {
    const db = await openDb();
    const tx = db.transaction(STORE_LIVE_FOLLOWUPS, "readonly");
    const store = tx.objectStore(STORE_LIVE_FOLLOWUPS);
  
    try {
      const all = (await reqToPromise(store.getAll())) as LiveFollowUp[];
      await txDone(tx);
      return (all ?? []).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    } catch (e: any) {
      await txDone(tx).catch(() => {});
      throw new Error(e?.message ?? "Failed to list follow-ups.");
    }
  }
  
  export async function listLiveFollowUpsPendingSync(): Promise<LiveFollowUp[]> {
    const db = await openDb();
    const tx = db.transaction(STORE_LIVE_FOLLOWUPS, "readonly");
    const store = tx.objectStore(STORE_LIVE_FOLLOWUPS);
  
    try {
      let rows: LiveFollowUp[] = [];
  
      if (store.indexNames.contains("syncStatus")) {
        const idx = store.index("syncStatus");
        const pending = (await reqToPromise(idx.getAll("PENDING_SYNC" as any))) as LiveFollowUp[];
        const errors = (await reqToPromise(idx.getAll("ERROR" as any))) as LiveFollowUp[];
        rows = [...(pending ?? []), ...(errors ?? [])];
      } else {
        const all = (await reqToPromise(store.getAll())) as LiveFollowUp[];
        rows = (all ?? []).filter((r) => r.syncStatus !== "SYNCED");
      }
  
      await txDone(tx);
      return (rows ?? []).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    } catch (e: any) {
      await txDone(tx).catch(() => {});
      throw new Error(e?.message ?? "Failed to list pending sync follow-ups.");
    }
  }
  
  export async function markLiveFollowUpSynced(params: { id: string; serverId: string }): Promise<void> {
    await updateLiveFollowUp(params.id, {
      syncStatus: "SYNCED",
      serverId: safeTrim(params.serverId) || undefined,
      lastSyncAttemptAt: nowIso(),
      lastSyncError: undefined,
    });
  }
  
  export async function markLiveFollowUpSyncError(params: { id: string; error: string }): Promise<void> {
    await updateLiveFollowUp(params.id, {
      syncStatus: "ERROR",
      lastSyncAttemptAt: nowIso(),
      lastSyncError: safeTrim(params.error) || "Unknown sync error",
    });
  }