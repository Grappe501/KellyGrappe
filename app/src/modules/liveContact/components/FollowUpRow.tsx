// app/src/modules/liveContact/components/FollowUpRow.tsx

import React, { useState, useCallback, useMemo } from "react";
import {
  Button,
  Label,
  Textarea,
  Input,
} from "@components/FormControls";
import type { UnifiedRow } from "../hooks/useFollowUps";

type FollowUpStatus = "NEW" | "IN_PROGRESS" | "COMPLETED";

type Props = {
  row: UnifiedRow;
  onUpdate: (row: UnifiedRow, patch: any) => Promise<void>;
};

const CURRENT_USER = "Me";

/* ------------------------------------------------------------------ */
/* Styling Helpers */
/* ------------------------------------------------------------------ */

function statusBadge(status: FollowUpStatus) {
  switch (status) {
    case "NEW":
      return "bg-sky-100 text-sky-900 border-sky-200";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-950 border-amber-200";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-950 border-emerald-200";
  }
}

function slaBadge(level: string) {
  switch (level) {
    case "CRITICAL":
      return "bg-rose-600 text-white animate-pulse";
    case "URGENT":
      return "bg-rose-100 text-rose-800";
    case "WATCH":
      return "bg-amber-100 text-amber-900";
    case "NORMAL":
      return "bg-slate-100 text-slate-800";
    default:
      return "hidden";
  }
}

function slaShell(level: string) {
  switch (level) {
    case "CRITICAL":
      return "border-rose-500 bg-rose-50 shadow-md";
    case "URGENT":
      return "border-rose-300 bg-rose-50";
    case "WATCH":
      return "border-amber-300 bg-amber-50";
    default:
      return "border-slate-200 bg-white";
  }
}

function syncBadge(syncStatus: string) {
  switch (syncStatus) {
    case "SYNCED":
      return "text-emerald-700";
    case "ERROR":
      return "text-rose-700";
    default:
      return "text-amber-700";
  }
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

const FollowUpRow: React.FC<Props> = ({ row, onUpdate }) => {
  const [saving, setSaving] = useState(false);
  const [assigneeDraft, setAssigneeDraft] = useState(row.assignedTo ?? "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [showInsight, setShowInsight] = useState(false);

  const notesId = `notes-${row.id}`;

  const recentAssignees = useMemo(() => {
    const raw = localStorage.getItem("recentAssignees");
    return raw ? JSON.parse(raw) : [];
  }, []);

  const saveRecentAssignee = (name: string) => {
    const existing = recentAssignees.filter((n: string) => n !== name);
    const updated = [name, ...existing].slice(0, 5);
    localStorage.setItem("recentAssignees", JSON.stringify(updated));
  };

  const update = useCallback(
    async (patch: any) => {
      try {
        setSaving(true);
        await onUpdate(row, patch);
      } finally {
        setSaving(false);
      }
    },
    [row, onUpdate]
  );

  const handleStatusChange = async (status: FollowUpStatus) => {
    await update({
      followUpStatus: status,
      followUpCompletedAt:
        status === "COMPLETED" ? new Date().toISOString() : null,
    });
  };

  const handleAssignmentBlur = async () => {
    const trimmed = assigneeDraft.trim();
    await update({ assignedTo: trimmed || undefined });
    if (trimmed) saveRecentAssignee(trimmed);
  };

  const generateInsight = async () => {
    try {
      setAiLoading(true);
      setShowInsight(true);

      const res = await fetch("/.netlify/functions/followup-ai", {
        method: "POST",
        body: JSON.stringify({
          name: row.name,
          notes: row.followUpNotes,
          status: row.followUpStatus,
          slaLevel: row.slaLevel,
          ageHours: row.ageHours,
          source: row.source,
          assignedTo: row.assignedTo,
        }),
      });

      const data = await res.json();
      setAiInsight(data);
    } catch (err) {
      setAiInsight({ error: "AI generation failed." });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition ${slaShell(
        row.slaLevel
      )}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <div className="font-semibold text-slate-900 text-lg">
            {row.name}
          </div>

          <div className="text-sm text-slate-600">
            {[row.phone, row.email].filter(Boolean).join(" • ") || "—"}
          </div>

          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
            <span>
              {row.source} • {row.mode === "server" ? "Global" : "Local"}
            </span>

            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${slaBadge(
                row.slaLevel
              )}`}
            >
              {row.slaLevel}
            </span>

            <span className="text-xs text-slate-500">
              {row.ageHours.toFixed(1)} hrs
            </span>

            {row.optimistic && (
              <span className="text-xs text-indigo-600 font-semibold">
                Saving…
              </span>
            )}

            {row.mode === "local" && (
              <span
                className={`text-xs font-semibold ${syncBadge(
                  row.syncStatus
                )}`}
              >
                {row.syncStatus}
              </span>
            )}
          </div>

          {/* Assignment Editable */}
          <div className="mt-2 text-xs">
            <Label htmlFor={`assign-${row.id}`}>Assigned To</Label>
            <Input
              id={`assign-${row.id}`}
              value={assigneeDraft}
              onChange={(e) => setAssigneeDraft(e.target.value)}
              onBlur={handleAssignmentBlur}
              placeholder="Enter name..."
            />

            {!row.assignedTo && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                onClick={() =>
                  update({ assignedTo: CURRENT_USER })
                }
              >
                Assign to Me
              </Button>
            )}

            {recentAssignees.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {recentAssignees.map((name: string) => (
                  <Button
                    key={name}
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setAssigneeDraft(name);
                      update({ assignedTo: name });
                    }}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {row.updatedAt && (
            <div className="text-xs text-slate-400 mt-1">
              Updated: {new Date(row.updatedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex flex-col gap-2 items-end">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(
              row.followUpStatus
            )}`}
          >
            {row.followUpStatus}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-4">
        <Label htmlFor={notesId}>Follow-up Notes</Label>
        <Textarea
          id={notesId}
          rows={3}
          value={row.followUpNotes}
          onChange={(e) =>
            update({ followUpNotes: e.target.value })
          }
          placeholder="Add follow-up notes..."
        />
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={
            row.followUpStatus === "IN_PROGRESS" || saving
          }
          onClick={() =>
            handleStatusChange("IN_PROGRESS")
          }
        >
          In Progress
        </Button>

        <Button
          size="sm"
          disabled={
            row.followUpStatus === "COMPLETED" || saving
          }
          onClick={() =>
            handleStatusChange("COMPLETED")
          }
        >
          Complete
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={generateInsight}
          disabled={aiLoading}
        >
          {aiLoading ? "Analyzing…" : "Generate Insight"}
        </Button>
      </div>

      {/* AI Insight Panel (Ephemeral) */}
      {showInsight && aiInsight && (
        <div className="mt-4 rounded-xl border p-4 bg-slate-50 text-sm space-y-2">
          {aiInsight.error && (
            <div className="text-rose-600">
              {aiInsight.error}
            </div>
          )}

          {aiInsight.nextAction && (
            <div>
              <strong>Next Action:</strong>
              <div>{aiInsight.nextAction}</div>
            </div>
          )}

          {aiInsight.riskFlags && (
            <div>
              <strong>Risk Flags:</strong>
              <div>{aiInsight.riskFlags}</div>
            </div>
          )}

          {aiInsight.script && (
            <div>
              <strong>Suggested Script:</strong>
              <div>{aiInsight.script}</div>
            </div>
          )}
        </div>
      )}

      {row.followUpStatus === "COMPLETED" &&
        row.followUpCompletedAt && (
          <div className="text-xs text-slate-500 mt-4">
            Completed:{" "}
            {new Date(
              row.followUpCompletedAt
            ).toLocaleString()}
          </div>
        )}
    </div>
  );
};

export default React.memo(FollowUpRow);

