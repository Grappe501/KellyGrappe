// app/src/modules/liveContact/LiveContactsListPage.tsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "../../shared/components/Container";
import { Card, CardContent, CardHeader } from "../../shared/components/Card";
import {
  Button,
  ErrorText,
  HelpText,
  Input,
} from "../../shared/components/FormControls";

import { useFollowUps, type UnifiedRow } from "./hooks/useFollowUps";
import FollowUpRow from "./components/FollowUpRow";

type SortKey = "NEWEST" | "OLDEST";
type AssignmentFilter = "ALL" | "UNASSIGNED" | "MINE";
type PriorityFilter = "ALL" | "WATCH" | "URGENT";

const CURRENT_USER = "Me";

export default function LiveContactsListPage() {
  const nav = useNavigate();

  const {
    rows,
    stats,
    mode,
    loading,
    error,
    refresh,
    updateItem,
  } = useFollowUps();

  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("NEWEST");
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("ALL");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("ALL");

  /**
   * Filtering
   */
  const filtered = useMemo(() => {
    let r = rows;

    if (!showCompleted) {
      r = r.filter((x) => x.followUpStatus !== "COMPLETED");
    }

    if (assignmentFilter === "UNASSIGNED") {
      r = r.filter((x) => !x.assignedTo);
    }

    if (assignmentFilter === "MINE") {
      r = r.filter((x) => x.assignedTo === CURRENT_USER);
    }

    if (priorityFilter !== "ALL") {
      r = r.filter((x) => x.priority === priorityFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) =>
        [
          x.name,
          x.email,
          x.phone,
          x.source,
          x.followUpNotes,
          x.entryInitials ?? "",
          x.assignedTo ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return r;
  }, [
    rows,
    search,
    showCompleted,
    assignmentFilter,
    priorityFilter,
  ]);

  /**
   * Sorting
   */
  const sorted = useMemo(() => {
    const copy = [...filtered];

    copy.sort((a, b) => {
      const aDate = a.updatedAt ?? a.createdAt;
      const bDate = b.updatedAt ?? b.createdAt;

      if (sortKey === "NEWEST") {
        return aDate > bDate ? -1 : 1;
      }

      return aDate > bDate ? 1 : -1;
    });

    return copy;
  }, [filtered, sortKey]);

  const modeColor =
    mode === "server"
      ? "bg-emerald-100 text-emerald-900"
      : "bg-amber-100 text-amber-900";

  return (
    <Container className="py-8">
      <div className="mx-auto w-full max-w-6xl px-4">
        <Card>
          <CardHeader
            title="Follow-Up Operations Board"
            subtitle={
              mode === "server"
                ? "Global campaign board (Supabase)"
                : "Local fallback board (IndexedDB)"
            }
          />

          <CardContent className="space-y-6">

            {/* Control Panel */}
            <div className="rounded-2xl border p-5 bg-white shadow-sm space-y-4">

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span><strong>{stats.pending}</strong> pending</span>
                <span><strong>{stats.completed}</strong> completed</span>
                <span><strong>{stats.total}</strong> total</span>

                {mode === "local" && (
                  <span>
                    <strong>{stats.pendingSync}</strong> pending sync
                  </span>
                )}

                <span
                  className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${modeColor}`}
                >
                  {mode === "server" ? "GLOBAL" : "LOCAL MODE"}
                </span>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center flex-wrap">

                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, phone, initials, notes…"
                />

                <select
                  value={sortKey}
                  onChange={(e) =>
                    setSortKey(e.target.value as SortKey)
                  }
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="NEWEST">Newest first</option>
                  <option value="OLDEST">Oldest first</option>
                </select>

                <select
                  value={assignmentFilter}
                  onChange={(e) =>
                    setAssignmentFilter(
                      e.target.value as AssignmentFilter
                    )
                  }
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="ALL">All Assignments</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  <option value="MINE">My Items</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) =>
                    setPriorityFilter(
                      e.target.value as PriorityFilter
                    )
                  }
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="ALL">All Priority</option>
                  <option value="WATCH">Watch</option>
                  <option value="URGENT">Urgent</option>
                </select>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCompleted((v) => !v)}
                >
                  {showCompleted
                    ? "Hide Completed"
                    : "Show Completed"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={refresh}
                >
                  Refresh
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => nav("/live-contact")}
                >
                  Add Contact
                </Button>
              </div>
            </div>

            {/* Loading / Error */}
            {loading && (
              <div className="text-sm text-slate-600">
                Loading follow-ups…
              </div>
            )}

            {error && <ErrorText>{error}</ErrorText>}

            {!loading && sorted.length === 0 && (
              <div className="rounded-xl border p-5 bg-slate-50">
                <p>No follow-ups found.</p>
                <HelpText>
                  Intake submissions should create entries here automatically.
                </HelpText>
              </div>
            )}

            {/* Rows */}
            <div className="space-y-4">
              {sorted.map((row: UnifiedRow) => (
                <FollowUpRow
                  key={row.id}
                  row={row}
                  onUpdate={updateItem}
                />
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Protocol: Every intake must generate a follow-up entry.
              SLA escalation automatically highlights neglected items.
            </p>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}