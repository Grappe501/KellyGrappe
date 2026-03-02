import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardContent, CardHeader } from '../../shared/components/Card';
import {
  Button,
  ErrorText,
  HelpText,
  Input,
  Label,
  Textarea,
} from '../../shared/components/FormControls';
import {
  listLiveFollowUps,
  updateLiveFollowUp,
  type LiveFollowUp,
} from '../../shared/utils/contactsDb';

/**
 * LiveContactsListPage (Upgraded)
 * -------------------------------
 * - Server-first “Global Board” (when functions exist)
 * - Local fallback “IndexedDB Board”
 * - Search + Filters + Sort
 * - SLA timer + Watch/Urgent highlighting
 * - Expand/collapse per row (keeps list scannable)
 * - Event Request workflow actions (Approve & Create Hold, Approve & Notify)
 *
 * Reliability upgrades (this pass):
 * - Fix invalid <Label> usage (Label requires htmlFor).
 * - Display local sync state (Pending/Errored/Synced) when available.
 * - Add "Pending Sync" filter to keep field ops from losing track.
 * - Surface entry initials (who captured) when available.
 *
 * NOTE:
 * Keep strict TS safety: never assume server row exists.
 */

type FollowUpStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED';
type Mode = 'server' | 'local';

type ServerFollowUp = {
  id: string;
  source: string | null;
  status: FollowUpStatus;
  title: string | null;
  notes: string | null;

  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;

  payload: Record<string, unknown> | null;

  created_at: string;
  updated_at?: string | null;
  completed_at?: string | null;

  archived?: boolean | null;

  calendar_event_id?: string | null;
  calendar_event_link?: string | null;
};

type SyncStatus = 'PENDING_SYNC' | 'SYNCED' | 'ERROR';

type UnifiedRow = {
  id: string;
  mode: Mode;

  createdAt: string;
  followUpStatus: FollowUpStatus;
  followUpNotes: string;
  followUpCompletedAt: string | null;
  archived: boolean;

  name: string;
  email: string;
  phone: string;
  source: string;

  location: string;
  notes: string;

  eventStartIso: string | null;
  eventEndIso: string | null;
  eventTitle: string | null;
  eventVenue: string | null;
  eventAddress: string | null;

  // Reliability metadata (local-first)
  syncStatus: SyncStatus;
  serverId: string | null;
  lastSyncAttemptAt: string | null;
  lastSyncError: string | null;
  entryInitials: string | null;

  server: ServerFollowUp | null;
};

type Urgency = 'NONE' | 'WATCH' | 'URGENT';
type SortKey = 'NEWEST' | 'OLDEST' | 'EVENT_SOONEST' | 'SLA_WORST';

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function asNullableString(v: unknown): string | null {
  const s = safeTrim(v);
  return s ? s : null;
}

function asString(v: unknown, fallback = ''): string {
  const s = safeTrim(v);
  return s ? s : fallback;
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function formatWhen(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function hoursBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function hoursSince(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return hoursBetween(d, new Date());
}

function parseIsoMaybe(v: unknown): Date | null {
  const s = asNullableString(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function badge(status: FollowUpStatus) {
  switch (status) {
    case 'NEW':
      return {
        label: 'New',
        cls: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-900/60',
        dot: 'bg-sky-500',
      };
    case 'IN_PROGRESS':
      return {
        label: 'In Progress',
        cls: 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/35 dark:text-amber-50 dark:border-amber-900/60',
        dot: 'bg-amber-500',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        cls: 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-50 dark:border-emerald-900/60',
        dot: 'bg-emerald-500',
      };
  }
}

function syncChipStyles(s: SyncStatus) {
  switch (s) {
    case 'SYNCED':
      return {
        label: 'Synced',
        cls: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-50',
        dot: 'bg-emerald-500',
      };
    case 'ERROR':
      return {
        label: 'Sync Error',
        cls: 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-50',
        dot: 'bg-rose-500',
      };
    default:
      return {
        label: 'Pending Sync',
        cls: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-50',
        dot: 'bg-amber-500',
      };
  }
}

function isEventRequest(source: string | null | undefined) {
  if (!source) return false;
  return source.toLowerCase().includes('event request');
}

function urgencyForRow(
  row: Pick<UnifiedRow, 'createdAt' | 'followUpStatus' | 'eventStartIso'>
): Urgency {
  if (row.followUpStatus === 'COMPLETED') return 'NONE';

  const now = new Date();

  // SLA urgency
  const createdAt = parseIsoMaybe(row.createdAt);
  const slaHours = createdAt ? hoursBetween(createdAt, now) : null;

  // Event urgency
  const eventStart = parseIsoMaybe(row.eventStartIso);
  const untilHours = eventStart ? hoursBetween(now, eventStart) : null;

  // Event urgency wins if it's imminent or just passed
  if (untilHours !== null && untilHours <= 72 && untilHours >= -24) return 'URGENT';
  if (untilHours !== null && untilHours <= 168 && untilHours >= -24) return 'WATCH';

  // SLA if NEW too long
  if (slaHours !== null && row.followUpStatus === 'NEW' && slaHours >= 48) return 'URGENT';
  if (slaHours !== null && row.followUpStatus === 'NEW' && slaHours >= 24) return 'WATCH';

  return 'NONE';
}

function urgencyStyles(u: Urgency) {
  switch (u) {
    case 'URGENT':
      return {
        shell: 'border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20',
        chip: 'border-rose-200 bg-rose-100 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100',
        label: 'Urgent',
      };
    case 'WATCH':
      return {
        shell: 'border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20',
        chip: 'border-amber-200 bg-amber-100 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-50',
        label: 'Watch',
      };
    default:
      return null;
  }
}

function buildEventAddress(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const parts = [
    asNullableString(payload['addressLine1']),
    asNullableString(payload['addressLine2']),
    asNullableString(payload['city']),
    asNullableString(payload['state']),
    asNullableString(payload['zip']),
  ].filter(Boolean) as string[];
  const joined = parts.join(', ').trim();
  return joined ? joined : null;
}

async function fetchServerFollowUps(): Promise<ServerFollowUp[]> {
  const res = await fetch('/.netlify/functions/followups-list', { method: 'GET' });
  if (!res.ok) {
    const j = await safeJson(res);
    throw new Error(j?.error ?? `Server followups unavailable (${res.status}).`);
  }
  const j = await safeJson(res);
  return Array.isArray(j?.items) ? (j.items as ServerFollowUp[]) : [];
}

async function patchServerFollowUp(id: string, patch: Partial<ServerFollowUp>): Promise<void> {
  const res = await fetch('/.netlify/functions/followups-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j?.error ?? `Update failed (${res.status}).`);
}

async function createCalendarHold(params: { title: string; start: string; end: string }) {
  const res = await fetch('/.netlify/functions/calendar-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const j = await safeJson(res);
  if (!res.ok) throw new Error(j?.error ?? `Calendar create failed (${res.status}).`);
  return j as any;
}

function buildApprovalMessage(params: {
  contactName?: string | null;
  eventTitle?: string | null;
  startIso?: string | null;
  endIso?: string | null;
  venue?: string | null;
  address?: string | null;
}) {
  const lines: string[] = [];
  lines.push(`Hi${params.contactName ? ` ${params.contactName}` : ''},`);
  lines.push('');
  lines.push(
    'Thanks for your event request — we’ve reviewed the details and are moving it forward.'
  );
  lines.push('');
  if (params.eventTitle) lines.push(`Event: ${params.eventTitle}`);
  if (params.startIso) lines.push(`Start: ${formatWhen(params.startIso)}`);
  if (params.endIso) lines.push(`End: ${formatWhen(params.endIso)}`);
  if (params.venue) lines.push(`Venue: ${params.venue}`);
  if (params.address) lines.push(`Address: ${params.address}`);
  lines.push('');
  lines.push('Next step: our team will confirm final details and follow up shortly.');
  lines.push('');
  lines.push('— Kelly Grappe Campaign Team');
  return lines.join('\n');
}

function matchesSearch(row: UnifiedRow, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [
    row.name,
    row.email,
    row.phone,
    row.source,
    row.followUpNotes,
    row.notes,
    row.eventTitle ?? '',
    row.eventVenue ?? '',
    row.eventAddress ?? '',
    row.entryInitials ?? '',
    row.syncStatus,
    row.lastSyncError ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(s);
}

function sortRows(rows: UnifiedRow[], key: SortKey): UnifiedRow[] {
  const copy = [...rows];

  function dateOrMax(iso: string | null) {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? d.getTime() : Number.POSITIVE_INFINITY;
  }

  function dateOrMin(iso: string | null) {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? d.getTime() : Number.NEGATIVE_INFINITY;
  }

  if (key === 'NEWEST') copy.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  if (key === 'OLDEST') copy.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  if (key === 'EVENT_SOONEST')
    copy.sort((a, b) => dateOrMax(a.eventStartIso) - dateOrMax(b.eventStartIso));
  if (key === 'SLA_WORST') copy.sort((a, b) => dateOrMin(a.createdAt) - dateOrMin(b.createdAt));

  // Secondary: urgent first (keeps triage at the top)
  copy.sort((a, b) => {
    const rank = (u: Urgency) => (u === 'URGENT' ? 2 : u === 'WATCH' ? 1 : 0);
    return rank(urgencyForRow(b)) - rank(urgencyForRow(a));
  });

  return copy;
}

function isSyncedLike(row: LiveFollowUp): SyncStatus {
  const s = (row as any).syncStatus as SyncStatus | undefined;
  if (s === 'SYNCED' || s === 'PENDING_SYNC' || s === 'ERROR') return s;
  // Back-compat: old rows have no syncStatus; treat as PENDING
  return 'PENDING_SYNC';
}

export default function LiveContactsListPage() {
  const nav = useNavigate();

  const [mode, setMode] = useState<Mode>('server');
  const [serverNotice, setServerNotice] = useState<string | null>(null);

  const [serverItems, setServerItems] = useState<ServerFollowUp[]>([]);
  const [localItems, setLocalItems] = useState<LiveFollowUp[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Board controls
  const [q, setQ] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | 'ALL'>('ALL');
  const [pendingSyncOnly, setPendingSyncOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('NEWEST');

  // Per-row UI state
  const [busy, setBusy] = useState<Record<string, string | null>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Toast-ish notice
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  function toast(msg: string) {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3800);
  }

  function setBusyState(id: string, state: string | null) {
    setBusy((prev) => ({ ...prev, [id]: state }));
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function refresh() {
    setError(null);
    setServerNotice(null);

    try {
      setLoading(true);

      // Server first (global board)
      try {
        const items = await fetchServerFollowUps();
        setServerItems(items);
        setMode('server');
      } catch (err: any) {
        // Local fallback
        const msg =
          err?.message ?? 'Server followups unavailable. Falling back to local board.';
        setServerNotice(msg);

        const list = await listLiveFollowUps();
        setLocalItems(list);
        setMode('local');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unified: UnifiedRow[] = useMemo(() => {
    if (mode === 'server') {
      return serverItems
        .filter((i) => !(i.archived ?? false))
        .map((i): UnifiedRow => {
          const payload = i.payload ?? null;

          return {
            id: i.id,
            mode: 'server',

            createdAt: i.created_at,
            followUpStatus: i.status,
            followUpNotes: i.notes ?? '',
            followUpCompletedAt: i.completed_at ?? null,
            archived: !!(i.archived ?? false),

            name: asString(i.contact_name ?? i.title, 'Unnamed Contact'),
            email: asString(i.contact_email, ''),
            phone: asString(i.contact_phone, ''),
            source: asString(i.source, ''),

            location: '',
            notes: '',

            eventStartIso: asNullableString(payload?.['startDateTime']),
            eventEndIso: asNullableString(payload?.['endDateTime']),
            eventTitle: asNullableString(payload?.['eventTitle']),
            eventVenue: asNullableString(payload?.['venueName']),
            eventAddress: buildEventAddress(payload),

            // Server rows are globally present -> treat as synced
            syncStatus: 'SYNCED',
            serverId: i.id,
            lastSyncAttemptAt: i.updated_at ?? i.created_at,
            lastSyncError: null,
            entryInitials: null,

            server: i,
          };
        });
    }

    // Local mode
    return localItems
      .filter((i) => !i.archived)
      .map((i): UnifiedRow => {
        const syncStatus = isSyncedLike(i);
        const serverId = asNullableString((i as any).serverId);
        const lastSyncAttemptAt = asNullableString((i as any).lastSyncAttemptAt);
        const lastSyncError = asNullableString((i as any).lastSyncError);
        const entryInitials = asNullableString((i as any).entryInitials);

        return {
          id: i.id,
          mode: 'local',

          createdAt: i.createdAt,
          followUpStatus: i.followUpStatus,
          followUpNotes: i.followUpNotes ?? '',
          followUpCompletedAt: i.followUpCompletedAt ?? null,
          archived: !!i.archived,

          name: asString(i.name, 'Unnamed Contact'),
          email: asString(i.email, ''),
          phone: asString(i.phone, ''),
          source: asString(i.source, ''),

          location: asString(i.location, ''),
          notes: asString(i.notes, ''),

          eventStartIso: null,
          eventEndIso: null,
          eventTitle: null,
          eventVenue: null,
          eventAddress: null,

          syncStatus,
          serverId,
          lastSyncAttemptAt,
          lastSyncError,
          entryInitials,

          server: null,
        };
      });
  }, [mode, serverItems, localItems]);

  const filteredSorted = useMemo(() => {
    let rows = unified;

    if (!showCompleted) rows = rows.filter((r) => r.followUpStatus !== 'COMPLETED');
    if (urgencyFilter !== 'ALL')
      rows = rows.filter((r) => urgencyForRow(r) === urgencyFilter);
    if (pendingSyncOnly) rows = rows.filter((r) => r.mode === 'local' && r.syncStatus !== 'SYNCED');
    if (q.trim()) rows = rows.filter((r) => matchesSearch(r, q));

    return sortRows(rows, sortKey);
  }, [unified, showCompleted, urgencyFilter, pendingSyncOnly, q, sortKey]);

  const stats = useMemo(() => {
    const total = unified.length;
    const pending = unified.filter((r) => r.followUpStatus !== 'COMPLETED').length;
    const completed = unified.filter((r) => r.followUpStatus === 'COMPLETED').length;
    const urgent = unified.filter((r) => urgencyForRow(r) === 'URGENT').length;
    const watch = unified.filter((r) => urgencyForRow(r) === 'WATCH').length;

    const pendingSync = unified.filter(
      (r) => r.mode === 'local' && r.syncStatus !== 'SYNCED'
    ).length;

    return { total, pending, completed, urgent, watch, pendingSync };
  }, [unified]);

  async function updateItem(row: UnifiedRow, patch: Partial<LiveFollowUp>) {
    if (row.mode === 'server') {
      const server = row.server;
      if (!server) throw new Error('Server row missing.');

      const status = (patch as any).followUpStatus as FollowUpStatus | undefined;
      const notes = (patch as any).followUpNotes as string | undefined;
      const completedAt = (patch as any).followUpCompletedAt as
        | string
        | null
        | undefined;
      const archived = (patch as any).archived as boolean | undefined;

      await patchServerFollowUp(row.id, {
        status: status ?? server.status,
        notes: typeof notes === 'string' ? notes : server.notes ?? null,
        completed_at:
          typeof completedAt === 'string'
            ? completedAt
            : completedAt === null
            ? null
            : server.completed_at ?? null,
        archived: typeof archived === 'boolean' ? archived : server.archived ?? false,
      });

      await refresh();
      return;
    }

    await updateLiveFollowUp(row.id, patch);
    await refresh();
  }

  async function archiveRow(row: UnifiedRow) {
    await updateItem(row, { archived: true });
    toast('Archived.');
  }

  async function approveAndCreateHold(server: ServerFollowUp) {
    const payload = server.payload ?? {};
    const title = asNullableString(payload['eventTitle']) ?? 'Event Request';
    const start = asNullableString(payload['startDateTime']);
    const end = asNullableString(payload['endDateTime']);

    if (!start || !end) {
      throw new Error('Missing start/end date/time in the event payload.');
    }

    const event = await createCalendarHold({ title, start, end });

    const eventId = asNullableString(event?.id);
    const eventLink = asNullableString(event?.htmlLink);

    const stamp = new Date().toISOString();
    const noteLine = `[${stamp}] Approved and created calendar hold.`;

    await patchServerFollowUp(server.id, {
      calendar_event_id: eventId,
      calendar_event_link: eventLink,
      status: 'IN_PROGRESS',
      notes: (server.notes ? `${server.notes}\n\n` : '') + noteLine,
    });
  }

  async function approveAndNotify(server: ServerFollowUp) {
    const payload = server.payload ?? {};

    const contactName = server.contact_name ?? null;
    const email = server.contact_email ?? null;
    const phone = server.contact_phone ?? null;

    const address = buildEventAddress(payload);

    const msg = buildApprovalMessage({
      contactName,
      eventTitle: asNullableString(payload['eventTitle']),
      startIso: asNullableString(payload['startDateTime']),
      endIso: asNullableString(payload['endDateTime']),
      venue: asNullableString(payload['venueName']),
      address: address || null,
    });

    const subject = `Event Request Approved${
      asNullableString(payload['eventTitle']) ? `: ${asString(payload['eventTitle'])}` : ''
    }`;

    if (email) {
      const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(msg)}`;
      window.open(mailto, '_blank', 'noopener,noreferrer');
    }

    if (phone) {
      const sms = `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(msg)}`;
      window.open(sms, '_blank', 'noopener,noreferrer');
    }

    const stamp = new Date().toISOString();
    const noteLine = `[${stamp}] Approved and initiated notification (${
      email ? 'email' : ''
    }${email && phone ? '+' : ''}${phone ? 'sms' : ''}${
      !email && !phone ? 'no contact method' : ''
    }).`;

    await patchServerFollowUp(server.id, {
      status: 'IN_PROGRESS',
      notes: (server.notes ? `${server.notes}\n\n` : '') + noteLine,
    });
  }

  return (
    <Container className="py-8">
      <div className="mx-auto w-full max-w-6xl px-4">
        <Card className="overflow-hidden">
          <CardHeader
            title="Follow-Up Board"
            subtitle={
              mode === 'server'
                ? 'Global follow-ups queue. Submissions from any device land here.'
                : 'Local follow-ups queue (IndexedDB). Server sync is currently unavailable.'
            }
          />
          <CardContent className="space-y-6">
            {/* Control Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">{stats.pending}</span>
                  <span>pending</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="font-semibold">{stats.completed}</span>
                  <span>completed</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="font-semibold">{stats.urgent}</span>
                  <span>urgent</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="font-semibold">{stats.watch}</span>
                  <span>watch</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="font-semibold">{stats.total}</span>
                  <span>total</span>

                  <span className="ml-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        mode === 'server' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-semibold">
                      {mode === 'server' ? 'Global' : 'Local'}
                    </span>
                  </span>

                  {mode === 'local' ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                      <span className="font-semibold">{stats.pendingSync}</span>
                      <span>pending sync</span>
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <Button type="button" variant="secondary" onClick={() => refresh()}>
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => nav('/live-contact')}
                  >
                    Add Contact
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => nav('/')}>
                    Home
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <Label htmlFor="followup-search">Search</Label>
                  <Input
                    id="followup-search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Name, email, phone, source, initials, sync status…"
                    className="mt-2"
                  />
                </div>

                <div className="lg:col-span-3">
                  <Label htmlFor="followup-sort">Sort</Label>
                  <select
                    id="followup-sort"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                  >
                    <option value="NEWEST">Newest first</option>
                    <option value="OLDEST">Oldest first</option>
                    <option value="EVENT_SOONEST">Event soonest</option>
                    <option value="SLA_WORST">SLA worst</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  {/* FIX: Label requires htmlFor; this is a section title not tied to an input */}
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Filters
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setUrgencyFilter('ALL')}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        urgencyFilter === 'ALL'
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-50'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900/40'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgencyFilter('URGENT')}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        urgencyFilter === 'URGENT'
                          ? 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-50'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900/40'
                      }`}
                    >
                      Urgent
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgencyFilter('WATCH')}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        urgencyFilter === 'WATCH'
                          ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-50'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900/40'
                      }`}
                    >
                      Watch
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCompleted((v) => !v)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        showCompleted
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-50'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900/40'
                      }`}
                    >
                      {showCompleted ? 'Showing completed' : 'Hide completed'}
                    </button>

                    {mode === 'local' ? (
                      <button
                        type="button"
                        onClick={() => setPendingSyncOnly((v) => !v)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          pendingSyncOnly
                            ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-50'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900/40'
                        }`}
                      >
                        {pendingSyncOnly ? 'Pending sync only' : 'All sync states'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {notice ? (
                <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-50">
                  {notice}
                </div>
              ) : null}
            </div>

            {serverNotice ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                  Server sync unavailable
                </div>
                <div className="mt-1 text-sm text-amber-950/90 dark:text-amber-50/90">
                  {serverNotice}
                </div>
                <HelpText className="dark:text-amber-50/80">
                  This board will be global once the Supabase followups endpoints are deployed.
                </HelpText>
              </div>
            ) : null}

            {loading ? (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Loading follow-ups…
              </div>
            ) : null}

            {error ? <ErrorText>{error}</ErrorText> : null}

            {!loading && filteredSorted.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/25">
                <p className="text-sm text-slate-800 dark:text-slate-100">
                  No matching follow-ups.
                </p>
                <HelpText className="dark:text-slate-300">
                  Try clearing filters or add a new contact from the field.
                </HelpText>
              </div>
            ) : null}

            <div className="space-y-4">
              {filteredSorted.map((row) => {
                const b = badge(row.followUpStatus);
                const urgency = urgencyForRow(row);
                const u = urgencyStyles(urgency);

                const sla = hoursSince(row.createdAt);
                const slaLabel = sla === null ? '—' : `${Math.floor(sla)}h`;

                const startD = parseIsoMaybe(row.eventStartIso);
                const until = startD ? hoursBetween(new Date(), startD) : null;
                const eventCountdown =
                  until === null
                    ? null
                    : until >= 0
                    ? `in ${Math.round(until)}h`
                    : `${Math.round(Math.abs(until))}h ago`;

                const isExpanded = !!expanded[row.id];
                const server = row.server;
                const isEvent = row.mode === 'server' && isEventRequest(server?.source);
                const busyState = busy[row.id];

                const syncChip =
                  row.mode === 'local' ? syncChipStyles(row.syncStatus) : null;

                return (
                  <div
                    key={row.id}
                    className={[
                      'rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-slate-950/30',
                      u ? u.shell : 'border-slate-200 dark:border-slate-800',
                    ].join(' ')}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold text-slate-950 dark:text-slate-50">
                            {row.name}
                          </div>

                          {row.source ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                              {row.source}
                            </span>
                          ) : null}

                          {row.entryInitials ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                              {row.entryInitials}
                            </span>
                          ) : null}

                          {syncChip ? (
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${syncChip.cls}`}
                              title={
                                row.lastSyncError
                                  ? `Last error: ${row.lastSyncError}`
                                  : undefined
                              }
                            >
                              <span className={`h-2 w-2 rounded-full ${syncChip.dot}`} />
                              <span>{syncChip.label}</span>
                            </span>
                          ) : null}

                          {isEvent ? (
                            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-50">
                              Event request
                            </span>
                          ) : null}
                        </div>

                        <div className="text-sm text-slate-700 dark:text-slate-200">
                          {[row.phone, row.email].filter(Boolean).join(' • ') || '—'}
                        </div>

                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-300">
                          <span>Added: {formatWhen(row.createdAt)}</span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span>SLA: {slaLabel}</span>
                          {eventCountdown ? (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span>Event: {eventCountdown}</span>
                            </>
                          ) : null}
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span>{row.mode === 'server' ? 'Global' : 'Local'}</span>

                          {row.mode === 'local' && row.lastSyncAttemptAt ? (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span>Last sync try: {formatWhen(row.lastSyncAttemptAt)}</span>
                            </>
                          ) : null}
                        </div>

                        {isEvent && (row.eventTitle || row.eventStartIso || row.eventVenue) ? (
                          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-100">
                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              Event snapshot
                            </div>
                            <div className="mt-1 space-y-1">
                              {row.eventTitle ? (
                                <div>
                                  <span className="font-semibold">Title:</span> {row.eventTitle}
                                </div>
                              ) : null}
                              {row.eventStartIso ? (
                                <div>
                                  <span className="font-semibold">Start:</span>{' '}
                                  {formatWhen(row.eventStartIso)}
                                </div>
                              ) : null}
                              {row.eventVenue ? (
                                <div>
                                  <span className="font-semibold">Venue:</span> {row.eventVenue}
                                </div>
                              ) : null}
                              {row.eventAddress ? (
                                <div>
                                  <span className="font-semibold">Address:</span>{' '}
                                  {row.eventAddress}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Right Side Chips + Toggle */}
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <div
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${b.cls}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${b.dot}`} />
                          <span className="font-semibold">{b.label}</span>
                        </div>

                        {u ? (
                          <div
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${u.chip}`}
                          >
                            {u.label}
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => toggleExpanded(row.id)}
                          className="text-xs font-semibold text-indigo-700 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200"
                        >
                          {isExpanded ? 'Hide details' : 'Show details'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Panel */}
                    {isExpanded ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                          <div className="md:col-span-4">
                            <Label htmlFor={`status-${row.id}`}>Follow-up Status</Label>
                            <select
                              id={`status-${row.id}`}
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100"
                              value={row.followUpStatus}
                              onChange={async (e) => {
                                const status = e.target.value as FollowUpStatus;
                                try {
                                  setBusyState(row.id, 'saving');
                                  await updateItem(row, {
                                    followUpStatus: status,
                                    followUpCompletedAt:
                                      status === 'COMPLETED'
                                        ? new Date().toISOString()
                                        : null,
                                  } as any);
                                  toast('Saved.');
                                } catch (err: any) {
                                  alert(err?.message ?? 'Save failed.');
                                } finally {
                                  setBusyState(row.id, null);
                                }
                              }}
                              disabled={busyState === 'saving'}
                            >
                              <option value="NEW">New</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                            </select>
                          </div>

                          <div className="md:col-span-8">
                            <Label htmlFor={`notes-${row.id}`}>Follow-up Notes</Label>
                            <Textarea
                              id={`notes-${row.id}`}
                              rows={4}
                              value={row.followUpNotes}
                              onChange={(e) => {
                                const next = e.target.value;
                                if (row.mode === 'server') {
                                  setServerItems((prev) =>
                                    prev.map((s) => (s.id === row.id ? { ...s, notes: next } : s))
                                  );
                                } else {
                                  setLocalItems((prev) =>
                                    prev.map((l) =>
                                      l.id === row.id ? { ...l, followUpNotes: next } : l
                                    )
                                  );
                                }
                              }}
                              placeholder="Add notes for outreach, assignments, next step…"
                            />

                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={busyState === 'saving'}
                                onClick={async () => {
                                  try {
                                    setBusyState(row.id, 'saving');
                                    await updateItem(row, { followUpNotes: row.followUpNotes } as any);
                                    toast('Notes saved.');
                                  } catch (err: any) {
                                    alert(err?.message ?? 'Save failed.');
                                  } finally {
                                    setBusyState(row.id, null);
                                  }
                                }}
                              >
                                {busyState === 'saving' ? 'Saving…' : 'Save Notes'}
                              </Button>

                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={row.followUpStatus === 'IN_PROGRESS' || busyState === 'saving'}
                                onClick={async () => {
                                  try {
                                    setBusyState(row.id, 'saving');
                                    await updateItem(row, { followUpStatus: 'IN_PROGRESS' } as any);
                                    toast('Marked In Progress.');
                                  } catch (err: any) {
                                    alert(err?.message ?? 'Update failed.');
                                  } finally {
                                    setBusyState(row.id, null);
                                  }
                                }}
                              >
                                Mark In Progress
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                disabled={row.followUpStatus === 'COMPLETED' || busyState === 'saving'}
                                onClick={async () => {
                                  try {
                                    setBusyState(row.id, 'saving');
                                    await updateItem(row, {
                                      followUpStatus: 'COMPLETED',
                                      followUpCompletedAt: new Date().toISOString(),
                                    } as any);
                                    toast('Marked Complete.');
                                  } catch (err: any) {
                                    alert(err?.message ?? 'Update failed.');
                                  } finally {
                                    setBusyState(row.id, null);
                                  }
                                }}
                              >
                                Mark Complete
                              </Button>

                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={busyState === 'saving'}
                                onClick={async () => {
                                  try {
                                    setBusyState(row.id, 'saving');
                                    await archiveRow(row);
                                  } catch (err: any) {
                                    alert(err?.message ?? 'Archive failed.');
                                  } finally {
                                    setBusyState(row.id, null);
                                  }
                                }}
                              >
                                Archive
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Event actions (server mode + event requests only) */}
                        {isEvent && server ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/25">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                  Event Request Actions
                                </div>
                                <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                                  Staff review required. Approve first — then create calendar hold and/or notify.
                                </div>
                              </div>

                              {server.calendar_event_link ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    window.open(
                                      server.calendar_event_link as string,
                                      '_blank',
                                      'noopener,noreferrer'
                                    )
                                  }
                                >
                                  View Calendar Event
                                </Button>
                              ) : null}
                            </div>

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={
                                  !!server.calendar_event_id ||
                                  busyState === 'calendar' ||
                                  !asNullableString(server.payload?.['startDateTime']) ||
                                  !asNullableString(server.payload?.['endDateTime'])
                                }
                                onClick={async () => {
                                  try {
                                    setBusyState(row.id, 'calendar');
                                    await approveAndCreateHold(server);
                                    toast('Calendar hold created.');
                                    await refresh();
                                  } catch (err: any) {
                                    alert(err?.message ?? 'Failed to create calendar hold.');
                                  } finally {
                                    setBusyState(row.id, null);
                                  }
                                }}
                              >
                                {busyState === 'calendar'
                                  ? 'Creating Hold…'
                                  : server.calendar_event_id
                                  ? 'Calendar Hold Created'
                                  : 'Approve & Create Hold'}
                              </Button>

                              <Button
                                type="button"
                                variant="secondary"
                                disabled={busyState === 'notify'}
                                onClick={async () => {
                                  try {
                                    setBusyState(row.id, 'notify');
                                    await approveAndNotify(server);
                                    toast('Notify initiated.');
                                    await refresh();
                                  } catch (err: any) {
                                    alert(err?.message ?? 'Approve & Notify failed.');
                                  } finally {
                                    setBusyState(row.id, null);
                                  }
                                }}
                              >
                                {busyState === 'notify' ? 'Opening Notify…' : 'Approve & Notify'}
                              </Button>
                            </div>

                            {!asNullableString(server.payload?.['startDateTime']) ||
                            !asNullableString(server.payload?.['endDateTime']) ? (
                              <div className="mt-3 text-xs font-semibold text-amber-900 dark:text-amber-200">
                                Missing start/end time — calendar hold cannot be created until both exist.
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {row.followUpStatus === 'COMPLETED' && row.followUpCompletedAt ? (
                          <div className="text-xs text-slate-500 dark:text-slate-300">
                            Completed: {formatWhen(row.followUpCompletedAt)}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">
              Protocol: every intake submission must create a follow-up entry on this board. This page runs in “Global” mode once the Supabase followups endpoints are deployed.
            </p>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}