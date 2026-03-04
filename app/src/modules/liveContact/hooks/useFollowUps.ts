// app/src/modules/liveContact/hooks/useFollowUps.ts

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  listLiveFollowUps,
  updateLiveFollowUp,
  type LiveFollowUp,
} from "../../../shared/utils/contactsDb";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export type FollowUpStatus = "NEW" | "IN_PROGRESS" | "COMPLETED";
export type BoardMode = "server" | "local";
export type SyncStatus = "PENDING_SYNC" | "SYNCED" | "ERROR";

/**
 * SLA tiers (computed)
 * - NORMAL: within first window
 * - WATCH: needs attention soon
 * - URGENT: overdue
 * - CRITICAL: severely overdue
 * - NONE: completed / not applicable
 */
export type SLALevel = "NORMAL" | "WATCH" | "URGENT" | "CRITICAL" | "NONE";

export type UnifiedRow = {
  id: string;
  mode: BoardMode;

  name: string;
  email: string;
  phone: string;
  source: string;

  followUpStatus: FollowUpStatus;
  followUpNotes: string;
  followUpCompletedAt: string | null;

  createdAt: string;
  updatedAt: string | null;

  archived: boolean;

  syncStatus: SyncStatus;
  serverId: string | null;
  lastSyncAttemptAt: string | null;
  lastSyncError: string | null;

  assignedTo: string | null; // free-text name for now
  optimistic: boolean;

  entryInitials: string | null;

  // 🔥 Computed SLA fields
  slaLevel: SLALevel;
  ageHours: number; // effective age in hours (includes escalation intelligence multiplier)
};

type Stats = {
  total: number;
  pending: number;
  completed: number;
  pendingSync: number;
};

function hoursBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

export function slaSeverityRank(level: SLALevel): number {
  switch (level) {
    case "CRITICAL":
      return 4;
    case "URGENT":
      return 3;
    case "WATCH":
      return 2;
    case "NORMAL":
      return 1;
    case "NONE":
    default:
      return 0;
  }
}

/**
 * COMPUTED SLA ENGINE
 *
 * NEW timing:
 * - NORMAL: < 24h
 * - WATCH:  >= 24h
 * - URGENT: >= 48h
 * - CRITICAL: >= 72h
 *
 * IN_PROGRESS timing (time since last update):
 * - NORMAL: < 48h
 * - WATCH:  >= 48h
 * - URGENT: >= 96h
 * - CRITICAL: >= 120h
 *
 * Escalation Intelligence:
 * - Unassigned items age faster (multiplier)
 */
function computeSLA(row: UnifiedRow): { level: SLALevel; ageHours: number } {
  if (row.followUpStatus === "COMPLETED") {
    return { level: "NONE", ageHours: 0 };
  }

  const now = new Date();
  const created = new Date(row.createdAt);
  const updated = row.updatedAt ? new Date(row.updatedAt) : created;

  const baseAge =
    row.followUpStatus === "NEW"
      ? hoursBetween(created, now)
      : hoursBetween(updated, now);

  // 🔥 Escalation Intelligence: unassigned items age faster
  const multiplier = row.assignedTo ? 1 : 1.25;
  const effectiveAge = baseAge * multiplier;

  if (row.followUpStatus === "NEW") {
    if (effectiveAge >= 72) return { level: "CRITICAL", ageHours: effectiveAge };
    if (effectiveAge >= 48) return { level: "URGENT", ageHours: effectiveAge };
    if (effectiveAge >= 24) return { level: "WATCH", ageHours: effectiveAge };
    return { level: "NORMAL", ageHours: effectiveAge };
  }

  // IN_PROGRESS
  if (effectiveAge >= 120) return { level: "CRITICAL", ageHours: effectiveAge };
  if (effectiveAge >= 96) return { level: "URGENT", ageHours: effectiveAge };
  if (effectiveAge >= 48) return { level: "WATCH", ageHours: effectiveAge };
  return { level: "NORMAL", ageHours: effectiveAge };
}

function nowIso() {
  return new Date().toISOString();
}

function isSyncedLike(row: LiveFollowUp): SyncStatus {
  const s = (row as any).syncStatus;
  if (s === "SYNCED" || s === "ERROR" || s === "PENDING_SYNC") return s;
  return "PENDING_SYNC";
}

/**
 * Normalize DB record -> UnifiedRow (and compute SLA)
 */
function toUnifiedRow(base: UnifiedRow): UnifiedRow {
  const { level, ageHours } = computeSLA(base);
  return {
    ...base,
    slaLevel: level,
    ageHours,
  };
}

export function useFollowUps() {
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<BoardMode>("local");

  const channelRef = useRef<any>(null);

  async function loadLocal() {
    const local = await listLiveFollowUps();

    return local
      .filter((r) => !r.archived)
      .map((r): UnifiedRow => {
        const base: UnifiedRow = {
          id: r.id,
          mode: "local",

          name: r.name ?? "Unnamed Contact",
          email: r.email ?? "",
          phone: r.phone ?? "",
          source: r.source ?? "",

          followUpStatus: r.followUpStatus,
          followUpNotes: r.followUpNotes ?? "",
          followUpCompletedAt: r.followUpCompletedAt ?? null,

          createdAt: r.createdAt,
          updatedAt: (r as any).updatedAt ?? null,

          archived: !!r.archived,

          syncStatus: isSyncedLike(r),
          serverId: (r as any).serverId ?? null,
          lastSyncAttemptAt: (r as any).lastSyncAttemptAt ?? null,
          lastSyncError: (r as any).lastSyncError ?? null,

          assignedTo: (r as any).assignedTo ?? null,
          optimistic: false,

          entryInitials: (r as any).entryInitials ?? null,

          slaLevel: "NORMAL",
          ageHours: 0,
        };

        return toUnifiedRow(base);
      });
  }

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const localRows = await loadLocal();
      setRows(localRows);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load follow-ups.");
    } finally {
      setLoading(false);
    }
  }

  // 🔥 Recompute SLA every minute (keeps board “alive”)
  useEffect(() => {
    const interval = setInterval(() => {
      setRows((prev) => prev.map((r) => toUnifiedRow(r)));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Realtime subscription (server mode)
  useEffect(() => {
    refresh();

    if (!supabase) return;

    const channel = supabase
      .channel("followups-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "followups" },
        (payload) => {
          const record = payload.new as any;
          if (!record) return;

          setMode("server");

          const base: UnifiedRow = {
            id: record.id,
            mode: "server",

            name: record.contact_name ?? "Unnamed Contact",
            email: record.contact_email ?? "",
            phone: record.contact_phone ?? "",
            source: record.source ?? "",

            followUpStatus: record.status,
            followUpNotes: record.notes ?? "",
            followUpCompletedAt: record.completed_at ?? null,

            createdAt: record.created_at,
            updatedAt: record.updated_at ?? null,

            archived: !!record.archived,

            syncStatus: "SYNCED",
            serverId: record.id,
            lastSyncAttemptAt: record.updated_at ?? null,
            lastSyncError: null,

            assignedTo: record.assigned_to ?? null,
            optimistic: false,

            entryInitials: record.entry_initials ?? null,

            slaLevel: "NORMAL",
            ageHours: 0,
          };

          const unified = toUnifiedRow(base);

          setRows((prev) => {
            const exists = prev.some((r) => r.id === unified.id);
            if (exists) return prev.map((r) => (r.id === unified.id ? unified : r));
            return [unified, ...prev];
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setMode("server");
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  async function updateItem(row: UnifiedRow, patch: Partial<UnifiedRow>) {
    const dbPatch: any = { ...patch };

    // Map frontend -> DB column
    if ("assignedTo" in patch) {
      dbPatch.assigned_to = patch.assignedTo;
      delete dbPatch.assignedTo;
    }

    // Strip computed fields if someone accidentally passes them
    delete dbPatch.slaLevel;
    delete dbPatch.ageHours;

    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? toUnifiedRow({
              ...r,
              ...patch,
              optimistic: true,
              updatedAt: nowIso(),
            })
          : r
      )
    );

    try {
      // NOTE: contactsDb should handle local vs server routing internally
      await updateLiveFollowUp(row.id, dbPatch);

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? toUnifiedRow({
                ...r,
                ...patch,
                optimistic: false,
              })
            : r
        )
      );
    } catch (err) {
      await refresh();
      throw err;
    }
  }

  const stats: Stats = useMemo(() => {
    return {
      total: rows.length,
      pending: rows.filter((r) => r.followUpStatus !== "COMPLETED").length,
      completed: rows.filter((r) => r.followUpStatus === "COMPLETED").length,
      pendingSync: rows.filter((r) => r.mode === "local" && r.syncStatus !== "SYNCED").length,
    };
  }, [rows]);

  return {
    rows,
    stats,
    mode,
    loading,
    error,
    refresh,
    updateItem,
  };
}