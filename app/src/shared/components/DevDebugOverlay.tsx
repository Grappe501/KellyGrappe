import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

// Optional: show pending followups queue size (offline sync health)
import { listLiveFollowUpsPendingSync } from "../utils/contactsDb";

type SyncState = {
  status: "idle" | "started" | "completed" | "error";
  source?: string;
  lastAt?: string;
  error?: string;
};

function nowIso() {
  return new Date().toISOString();
}

export default function DevDebugOverlay() {
  const location = useLocation();

  const [online, setOnline] = useState<boolean>(() => {
    try {
      return navigator.onLine !== false;
    } catch {
      return true;
    }
  });

  const [visibility, setVisibility] = useState<string>(() => {
    try {
      return document.visibilityState ?? "unknown";
    } catch {
      return "unknown";
    }
  });

  const [sync, setSync] = useState<SyncState>({ status: "idle" });
  const [pendingFollowUps, setPendingFollowUps] = useState<number>(0);

  // online/offline + visibility
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onVis = () => setVisibility(document.visibilityState ?? "unknown");

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // sync event bus (already used in App.tsx)
  useEffect(() => {
    const onStarted = (e: any) => {
      setSync({ status: "started", source: e?.detail?.source, lastAt: nowIso() });
    };
    const onCompleted = (e: any) => {
      setSync({ status: "completed", source: e?.detail?.source, lastAt: nowIso() });
    };
    const onError = (e: any) => {
      const err = e?.detail?.error;
      setSync({
        status: "error",
        source: e?.detail?.source,
        lastAt: nowIso(),
        error: err?.message ?? String(err ?? "Unknown error"),
      });
    };

    window.addEventListener("sync:started", onStarted as any);
    window.addEventListener("sync:completed", onCompleted as any);
    window.addEventListener("sync:error", onError as any);

    return () => {
      window.removeEventListener("sync:started", onStarted as any);
      window.removeEventListener("sync:completed", onCompleted as any);
      window.removeEventListener("sync:error", onError as any);
    };
  }, []);

  // pending queue poll (lightweight)
  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const rows = await listLiveFollowUpsPendingSync();
        if (!alive) return;
        setPendingFollowUps(rows?.length ?? 0);
      } catch {
        // don't spam; overlay is best-effort
      }
    }

    poll();
    const t = window.setInterval(poll, 5000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const syncBadge = useMemo(() => {
    if (sync.status === "started") return "SYNCING";
    if (sync.status === "completed") return "SYNC OK";
    if (sync.status === "error") return "SYNC ERROR";
    return "SYNC IDLE";
  }, [sync.status]);

  // Minimal, non-invasive UI. Click-through disabled.
  return (
    <div
      className="fixed bottom-3 right-3 z-[9999] pointer-events-none"
      aria-hidden="true"
    >
      <div className="w-[320px] rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur p-3 text-xs text-slate-700">
        <div className="flex items-center justify-between">
          <div className="font-semibold">DEV DEBUG</div>
          <div className="font-mono">{syncBadge}</div>
        </div>

        <div className="mt-2 space-y-1 font-mono">
          <div>
            route: <span className="break-all">{location.pathname}</span>
          </div>
          <div>online: {online ? "true" : "false"}</div>
          <div>visibility: {visibility}</div>
          <div>pending_followups: {pendingFollowUps}</div>
          <div>
            last_sync: {sync.lastAt ? new Date(sync.lastAt).toLocaleTimeString() : "—"}
            {sync.source ? ` (${sync.source})` : ""}
          </div>
          {sync.status === "error" && (
            <div className="text-red-700 break-all">
              error: {sync.error ?? "Unknown"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}