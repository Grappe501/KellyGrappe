// app/src/modules/liveContact/components/FollowUpRow.tsx

import React, { useState, useCallback } from "react";
import {
  Button,
  Label,
  Textarea,
} from "../../../shared/components/FormControls";
import type { UnifiedRow } from "../hooks/useFollowUps";

type FollowUpStatus = "NEW" | "IN_PROGRESS" | "COMPLETED";

type Props = {
  row: UnifiedRow;
  onUpdate: (row: UnifiedRow, patch: any) => Promise<void>;
};

/**
 * Replace with real auth later
 */
const CURRENT_USER = "Me";

/**
 * Status badge styles
 */
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

/**
 * SLA priority shell styles
 */
function priorityShell(priority: string) {
  switch (priority) {
    case "URGENT":
      return "border-rose-300 bg-rose-50";
    case "WATCH":
      return "border-amber-300 bg-amber-50";
    default:
      return "border-slate-200 bg-white";
  }
}

/**
 * Sync state indicator
 */
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

const FollowUpRow: React.FC<Props> = ({ row, onUpdate }) => {
  const [saving, setSaving] = useState(false);

  const notesId = `notes-${row.id}`;

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

  const handleStatusChange = useCallback(
    async (status: FollowUpStatus) => {
      await update({
        followUpStatus: status,
        followUpCompletedAt:
          status === "COMPLETED" ? new Date().toISOString() : null,
      });
    },
    [update]
  );

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition ${priorityShell(
        row.priority
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

            {row.priority !== "NONE" && (
              <span className="text-xs font-semibold text-rose-700">
                {row.priority}
              </span>
            )}

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
                title={row.lastSyncError ?? undefined}
              >
                {row.syncStatus}
              </span>
            )}
          </div>

          {/* Assignment */}
          <div className="mt-2 text-xs">
            {row.assignedTo ? (
              <span className="font-semibold text-indigo-700">
                Assigned to: {row.assignedTo}
              </span>
            ) : (
              <span className="text-slate-400">
                Unassigned
              </span>
            )}
          </div>

          {row.updatedAt && (
            <div className="text-xs text-slate-400 mt-1">
              Updated: {new Date(row.updatedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Status + Assignment Actions */}
        <div className="flex flex-col gap-2 items-end">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(
              row.followUpStatus
            )}`}
          >
            {row.followUpStatus}
          </span>

          <div className="flex gap-2 flex-wrap justify-end">
            {!row.assignedTo && (
              <Button
                size="sm"
                variant="secondary"
                disabled={saving}
                onClick={() =>
                  update({ assignedTo: CURRENT_USER })
                }
              >
                Assign to Me
              </Button>
            )}

            {row.assignedTo && (
              <Button
                size="sm"
                variant="secondary"
                disabled={saving}
                onClick={() =>
                  update({ assignedTo: null })
                }
              >
                Unassign
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-4">
        <Label htmlFor={notesId}>
          Follow-up Notes
        </Label>

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

      {/* Status Actions */}
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
      </div>

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