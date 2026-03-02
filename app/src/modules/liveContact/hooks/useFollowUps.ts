// app/src/modules/liveContact/hooks/useFollowUps.ts

import { useEffect, useMemo, useState, useRef } from "react";
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
export type PriorityLevel = "NONE" | "WATCH" | "URGENT";
export type SyncStatus = "PENDING_SYNC" | "SYNCED" | "ERROR";

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

  assignedTo: string | null; // 🔥 REAL NOW
  priority: PriorityLevel;
  optimistic: boolean;

  entryInitials: string | null;
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

function calculatePriority(row: UnifiedRow): PriorityLevel {
  if (row.followUpStatus === "COMPLETED") return "NONE";

  const now = new Date();
  const created = new Date(row.createdAt);
  const updated = row.updatedAt ? new Date(row.updatedAt) : created;

  const ageHours = hoursBetween(created, now);
  const sinceUpdate = hoursBetween(updated, now);

  if (row.followUpStatus === "NEW") {
    if (ageHours >= 48) return "URGENT";
    if (ageHours >= 24) return "WATCH";
  }

  if (row.followUpStatus === "IN_PROGRESS") {
    if (sinceUpdate >= 120) return "URGENT";
    if (sinceUpdate >= 72) return "WATCH";
  }

  return "NONE";
}

function nowIso() {
  return new Date().toISOString();
}

function isSyncedLike(row: LiveFollowUp): SyncStatus {
  const s = (row as any).syncStatus;
  if (s === "SYNCED" || s === "ERROR" || s === "PENDING_SYNC") {
    return s;
  }
  return "PENDING_SYNC";
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
      .map((r): UnifiedRow => ({
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
        priority: "NONE",
        optimistic: false,

        entryInitials: (r as any).entryInitials ?? null,
      }));
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

  useEffect(() => {
    const interval = setInterval(() => {
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          priority: calculatePriority(r),
        }))
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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

          const unified: UnifiedRow = {
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
            priority: "NONE",
            optimistic: false,

            entryInitials: record.entry_initials ?? null,
          };

          unified.priority = calculatePriority(unified);

          setRows((prev) => {
            const exists = prev.find((r) => r.id === unified.id);
            if (exists) {
              return prev.map((r) =>
                r.id === unified.id ? unified : r
              );
            }
            return [unified, ...prev];
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setMode("server");
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  async function updateItem(row: UnifiedRow, patch: Partial<UnifiedRow>) {
    const dbPatch: any = { ...patch };

    // Map frontend → DB column
    if ("assignedTo" in patch) {
      dbPatch.assigned_to = patch.assignedTo;
      delete dbPatch.assignedTo;
    }

    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              ...patch,
              optimistic: true,
              updatedAt: nowIso(),
            }
          : r
      )
    );

    try {
      await updateLiveFollowUp(row.id, dbPatch);

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                optimistic: false,
                priority: calculatePriority({
                  ...r,
                  ...patch,
                }),
              }
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
      pending: rows.filter(
        (r) => r.followUpStatus !== "COMPLETED"
      ).length,
      completed: rows.filter(
        (r) => r.followUpStatus === "COMPLETED"
      ).length,
      pendingSync: rows.filter(
        (r) =>
          r.mode === "local" &&
          r.syncStatus !== "SYNCED"
      ).length,
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