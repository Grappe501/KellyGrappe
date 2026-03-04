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

import {
  useFollowUps,
  type UnifiedRow,
  type SLALevel,
  slaSeverityRank,
} from "./hooks/useFollowUps";

import FollowUpRow from "./components/FollowUpRow";

type AssignmentFilter = "ALL" | "UNASSIGNED" | "MINE";
type SLAFilter = "ALL" | "WATCH" | "URGENT" | "CRITICAL";

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
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("ALL");
  const [slaFilter, setSlaFilter] =
    useState<SLAFilter>("ALL");

  /* ------------------------------------------------------------------ */
  /* Filtering                                                          */
  /* ------------------------------------------------------------------ */

  const filtered = useMemo(() => {
    let r = rows.filter((x) => !x.archived);

    if (assignmentFilter === "UNASSIGNED") {
      r = r.filter((x) => !x.assignedTo);
    }

    if (assignmentFilter === "MINE") {
      r = r.filter((x) => x.assignedTo === CURRENT_USER);
    }

    if (slaFilter !== "ALL") {
      r = r.filter((x) => x.slaLevel === slaFilter);
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
          x.assignedTo ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return r;
  }, [rows, search, assignmentFilter, slaFilter]);

  /* ------------------------------------------------------------------ */
  /* Severity + Age Sorting (floats CRITICAL automatically)            */
  /* ------------------------------------------------------------------ */

  function sortBySeverity(items: UnifiedRow[]) {
    return [...items].sort((a, b) => {
      const rankDiff =
        slaSeverityRank(b.slaLevel) -
        slaSeverityRank(a.slaLevel);

      if (rankDiff !== 0) return rankDiff;

      if (b.ageHours !== a.ageHours) {
        return b.ageHours - a.ageHours;
      }

      const aDate = a.updatedAt ?? a.createdAt;
      const bDate = b.updatedAt ?? b.createdAt;

      if (aDate === bDate) return 0;
      return aDate > bDate ? -1 : 1;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Kanban Buckets                                                     */
  /* ------------------------------------------------------------------ */

  const newItems = sortBySeverity(
    filtered.filter(
      (r) => r.followUpStatus === "NEW"
    )
  );

  const inProgressItems = sortBySeverity(
    filtered.filter(
      (r) => r.followUpStatus === "IN_PROGRESS"
    )
  );

  const completedItems = sortBySeverity(
    filtered.filter(
      (r) => r.followUpStatus === "COMPLETED"
    )
  );

  const modeColor =
    mode === "server"
      ? "bg-emerald-100 text-emerald-900"
      : "bg-amber-100 text-amber-900";

  return (
    <Container className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4">
        <Card>
          <CardHeader
            title="Campaign Operations Command Board"
            subtitle={
              mode === "server"
                ? "Realtime Global Operations"
                : "Local Fallback Mode"
            }
          />

          <CardContent className="space-y-6">
            {/* Top Bar */}
            <div className="rounded-2xl border p-5 bg-white shadow-sm space-y-4">

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span>
                  <strong>{stats.pending}</strong> active
                </span>
                <span>
                  <strong>{stats.completed}</strong> completed
                </span>
                <span>
                  <strong>{stats.total}</strong> total
                </span>

                {mode === "local" && (
                  <span>
                    <strong>{stats.pendingSync}</strong>{" "}
                    pending sync
                  </span>
                )}

                <span
                  className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${modeColor}`}
                >
                  {mode === "server"
                    ? "GLOBAL"
                    : "LOCAL MODE"}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search contact, notes, assignment…"
                />

                <select
                  value={assignmentFilter}
                  onChange={(e) =>
                    setAssignmentFilter(
                      e.target.value as AssignmentFilter
                    )
                  }
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="ALL">
                    All Assignments
                  </option>
                  <option value="UNASSIGNED">
                    Unassigned
                  </option>
                  <option value="MINE">
                    My Items
                  </option>
                </select>

                <select
                  value={slaFilter}
                  onChange={(e) =>
                    setSlaFilter(
                      e.target.value as SLAFilter
                    )
                  }
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="ALL">
                    All SLA Levels
                  </option>
                  <option value="WATCH">
                    WATCH
                  </option>
                  <option value="URGENT">
                    URGENT
                  </option>
                  <option value="CRITICAL">
                    CRITICAL
                  </option>
                </select>

                <Button
                  variant="secondary"
                  onClick={refresh}
                >
                  Refresh
                </Button>

                <Button
                  variant="secondary"
                  onClick={() =>
                    nav("/live-contact")
                  }
                >
                  Add Contact
                </Button>
              </div>
            </div>

            {loading && (
              <div className="text-sm text-slate-600">
                Loading follow-ups…
              </div>
            )}

            {error && <ErrorText>{error}</ErrorText>}

            {!loading && filtered.length === 0 && (
              <div className="rounded-xl border p-5 bg-slate-50">
                <p>No follow-ups found.</p>
                <HelpText>
                  Intake submissions should create
                  entries here automatically.
                </HelpText>
              </div>
            )}

            {/* Kanban Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <KanbanColumn
                title="New"
                items={newItems}
                updateItem={updateItem}
              />

              <KanbanColumn
                title="In Progress"
                items={inProgressItems}
                updateItem={updateItem}
              />

              <KanbanColumn
                title="Completed"
                items={completedItems}
                updateItem={updateItem}
              />
            </div>

            <p className="text-xs text-slate-500">
              Protocol: Every intake must generate a
              follow-up. CRITICAL items float to the
              top automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

/* ------------------------------------------------------------------ */
/* Column Component                                                   */
/* ------------------------------------------------------------------ */

function KanbanColumn({
  title,
  items,
  updateItem,
}: {
  title: string;
  items: UnifiedRow[];
  updateItem: any;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 border space-y-4 min-h-[300px]">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">
          {title}
        </h3>
        <span className="text-xs font-semibold bg-slate-200 px-2 py-1 rounded-full">
          {items.length}
        </span>
      </div>

      {items.length === 0 && (
        <div className="text-xs text-slate-400">
          No items
        </div>
      )}

      {items.map((row) => (
        <FollowUpRow
          key={row.id}
          row={row}
          onUpdate={updateItem}
        />
      ))}
    </div>
  );
}