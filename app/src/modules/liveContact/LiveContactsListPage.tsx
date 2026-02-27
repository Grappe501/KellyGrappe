import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import {
  Button,
  ErrorText,
  HelpText,
  Label,
  Textarea,
} from '../../shared/components/FormControls';
import {
  listLiveFollowUps,
  updateLiveFollowUp,
  type LiveFollowUp,
} from '../../shared/utils/contactsDb';

type FollowUpStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED';

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

function formatWhen(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function badge(status: FollowUpStatus) {
  switch (status) {
    case 'NEW':
      return { label: 'New', cls: 'bg-blue-50 text-blue-800 border-blue-200' };
    case 'IN_PROGRESS':
      return {
        label: 'In Progress',
        cls: 'bg-amber-50 text-amber-900 border-amber-200',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        cls: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      };
  }
}

function isEventRequest(s: string | null | undefined) {
  if (!s) return false;
  return s.toLowerCase().includes('event request');
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function asString(v: unknown) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function asNullableString(v: unknown) {
  const s = asString(v).trim();
  return s ? s : null;
}

function parseIsoMaybe(v: unknown): Date | null {
  const s = asNullableString(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function hoursBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function hoursSince(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return hoursBetween(d, new Date());
}

type Urgency = 'NONE' | 'WATCH' | 'URGENT';

function urgencyForItem(params: {
  createdAtIso?: string | null;
  status?: FollowUpStatus;
  eventStartIso?: string | null;
}) {
  const now = new Date();
  const status = params.status ?? 'NEW';

  // Completed items are never urgent visually
  if (status === 'COMPLETED') return 'NONE' as Urgency;

  // SLA urgency (time since created)
  const createdAt = params.createdAtIso ? new Date(params.createdAtIso) : null;
  const slaHours =
    createdAt && !isNaN(createdAt.getTime()) ? hoursBetween(createdAt, now) : null;

  // Event urgency (time until start)
  const eventStart = params.eventStartIso ? new Date(params.eventStartIso) : null;
  const untilHours =
    eventStart && !isNaN(eventStart.getTime()) ? hoursBetween(now, eventStart) : null;

  // Urgent if event is very soon
  if (untilHours !== null && untilHours <= 72 && untilHours >= -24) return 'URGENT';
  if (untilHours !== null && untilHours <= 168 && untilHours >= -24) return 'WATCH';

  // SLA urgency if it’s sitting NEW too long
  if (slaHours !== null && status === 'NEW' && slaHours >= 48) return 'URGENT';
  if (slaHours !== null && status === 'NEW' && slaHours >= 24) return 'WATCH';

  return 'NONE';
}

function urgencyStyles(u: Urgency) {
  switch (u) {
    case 'URGENT':
      return {
        ring: 'border-rose-300 bg-rose-50',
        chip: 'bg-rose-100 text-rose-900 border-rose-200',
        label: 'Urgent',
      };
    case 'WATCH':
      return {
        ring: 'border-amber-300 bg-amber-50',
        chip: 'bg-amber-100 text-amber-900 border-amber-200',
        label: 'Watch',
      };
    default:
      return null;
  }
}

/**
 * Server-backed followups (global board).
 * These endpoints will be implemented next:
 *   GET  /.netlify/functions/followups-list
 *   POST /.netlify/functions/followups-update
 *
 * Until they exist, calls will fail and we will fall back to IndexedDB.
 */
async function fetchServerFollowUps(): Promise<ServerFollowUp[]> {
  const res = await fetch('/.netlify/functions/followups-list', {
    method: 'GET',
  });

  if (!res.ok) {
    const j = await safeJson(res);
    throw new Error(j?.error ?? `Server followups unavailable (${res.status}).`);
  }

  const j = await safeJson(res);
  return Array.isArray(j?.items) ? (j.items as ServerFollowUp[]) : [];
}

async function patchServerFollowUp(
  id: string,
  patch: Partial<ServerFollowUp>
): Promise<void> {
  const res = await fetch('/.netlify/functions/followups-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch }),
  });

  const j = await safeJson(res);

  if (!res.ok) {
    throw new Error(j?.error ?? `Update failed (${res.status}).`);
  }
}

async function createCalendarHold(params: { title: string; start: string; end: string }) {
  const res = await fetch('/.netlify/functions/calendar-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const j = await safeJson(res);
  if (!res.ok) {
    throw new Error(j?.error ?? `Calendar create failed (${res.status}).`);
  }
  return j as any; // expects Google Calendar event object (id, htmlLink, etc.)
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
  lines.push('Thanks for your event request — we’ve reviewed the details and are moving it forward.');
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

export default function LiveContactsListPage() {
  const nav = useNavigate();

  const [mode, setMode] = useState<'server' | 'local'>('server');
  const [serverNotice, setServerNotice] = useState<string | null>(null);

  const [serverItems, setServerItems] = useState<ServerFollowUp[]>([]);
  const [localItems, setLocalItems] = useState<LiveFollowUp[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-item action state (prevents double clicks)
  const [busy, setBusy] = useState<Record<string, string | null>>({});

  function setBusyState(id: string, state: string | null) {
    setBusy((prev) => ({ ...prev, [id]: state }));
  }

  async function refresh() {
    setError(null);
    setServerNotice(null);

    try {
      setLoading(true);

      // Try server first (global board)
      try {
        const items = await fetchServerFollowUps();
        setServerItems(items);
        setMode('server');
      } catch (err: any) {
        // Fall back to local
        const msg =
          err?.message ??
          'Server followups unavailable. Falling back to local board.';
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
  }, []);

  // Normalize for UI rendering
  const unified = useMemo(() => {
    if (mode === 'server') {
      return serverItems
        .filter((i) => !(i.archived ?? false))
        .map((i) => {
          const createdAt = i.created_at;
          const followUpCompletedAt = i.completed_at ?? null;

          return {
            // NOTE: This object looks like LiveFollowUp for rendering, but is not stored in IndexedDB.
            id: i.id,
            archived: !!(i.archived ?? false),
            createdAt,
            followUpStatus: i.status,
            followUpNotes: i.notes,
            followUpCompletedAt,

            name: i.contact_name ?? i.title ?? 'Unnamed Contact',
            phone: i.contact_phone ?? null,
            email: i.contact_email ?? null,
            location: null,
            notes: null,
            source: i.source ?? null,

            automationEligible: false,
            permissionToContact: false,

            facebookConnected: false,
            facebookProfileName: null,
            facebookHandle: null,

            // extra metadata for actions
            __server: i,
          } as any;
        });
    }

    return localItems
      .filter((i) => !i.archived)
      .map((i) => ({ ...i, __server: null } as any));
  }, [mode, serverItems, localItems]);

  const pending = useMemo(
    () => unified.filter((i: any) => i.followUpStatus !== 'COMPLETED'),
    [unified]
  );

  const completed = useMemo(
    () => unified.filter((i: any) => i.followUpStatus === 'COMPLETED'),
    [unified]
  );

  async function updateItem(
    id: string,
    patch: Partial<LiveFollowUp>,
    server?: ServerFollowUp | null
  ) {
    if (mode === 'server') {
      // Translate to server patch
      const status = (patch as any).followUpStatus as FollowUpStatus | undefined;
      const notes = (patch as any).followUpNotes as string | undefined;
      const completedAt = (patch as any).followUpCompletedAt as string | null | undefined;
      const archived = (patch as any).archived as boolean | undefined;

      await patchServerFollowUp(id, {
        status: status ?? (server?.status ?? 'NEW'),
        notes: typeof notes === 'string' ? notes : server?.notes ?? null,
        completed_at:
          typeof completedAt === 'string'
            ? completedAt
            : completedAt === null
            ? null
            : server?.completed_at ?? null,
        archived: typeof archived === 'boolean' ? archived : server?.archived ?? false,
      });
      await refresh();
      return;
    }

    // Local mode
    await updateLiveFollowUp(id, patch);
    await refresh();
  }

  async function archiveItem(id: string, server?: ServerFollowUp | null) {
    await updateItem(id, { archived: true }, server);
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

    const address = [
      asNullableString(payload['addressLine1']),
      asNullableString(payload['addressLine2']),
      asNullableString(payload['city']),
      asNullableString(payload['state']),
      asNullableString(payload['zip']),
    ]
      .filter(Boolean)
      .join(', ');

    const msg = buildApprovalMessage({
      contactName,
      eventTitle: asNullableString(payload['eventTitle']),
      startIso: asNullableString(payload['startDateTime']),
      endIso: asNullableString(payload['endDateTime']),
      venue: asNullableString(payload['venueName']),
      address: address || null,
    });

    const subject = `Event Request Approved${asNullableString(payload['eventTitle']) ? `: ${asString(payload['eventTitle'])}` : ''}`;

    // Open email and/or SMS compose windows (no backend required)
    if (email) {
      const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(msg)}`;
      window.open(mailto, '_blank');
    }

    if (phone) {
      // Very basic SMS deep-link. (Behavior varies by platform/browser.)
      const sms = `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(
        msg
      )}`;
      window.open(sms, '_blank');
    }

    const stamp = new Date().toISOString();
    const noteLine = `[${stamp}] Approved and initiated notification (${email ? 'email' : ''}${email && phone ? '+' : ''}${phone ? 'sms' : ''}${!email && !phone ? 'no contact method' : ''}).`;

    await patchServerFollowUp(server.id, {
      status: 'IN_PROGRESS',
      notes: (server.notes ? `${server.notes}\n\n` : '') + noteLine,
    });
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Follow-Up Board"
          subtitle={
            mode === 'server'
              ? 'Global follow-ups queue. Submissions from any device land here.'
              : 'Local follow-ups queue (IndexedDB). Server sync is currently unavailable.'
          }
        />
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">{pending.length}</span> pending •{' '}
              <span className="font-semibold">{completed.length}</span> completed •{' '}
              <span className="font-semibold">{unified.length}</span> active
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="secondary" onClick={() => refresh()}>
                Refresh
              </Button>
              <Button type="button" variant="secondary" onClick={() => nav('/live-contact')}>
                Add Contact
              </Button>
              <Button type="button" variant="secondary" onClick={() => nav('/')}>
                Home
              </Button>
            </div>
          </div>

          {serverNotice ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-900">
                Server sync unavailable
              </div>
              <div className="text-sm text-amber-900/90 mt-1">{serverNotice}</div>
              <HelpText>
                This board will be global once the Supabase followups endpoints are deployed.
              </HelpText>
            </div>
          ) : null}

          {loading ? <div className="text-sm text-slate-600">Loading follow-ups…</div> : null}

          {error ? <ErrorText>{error}</ErrorText> : null}

          {!loading && unified.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-700">No active follow-ups yet.</p>
              <HelpText>Add a contact from the field to begin tracking outreach.</HelpText>
            </div>
          ) : null}

          <div className="space-y-4">
            {unified.map((c: any) => {
              const b = badge(c.followUpStatus as FollowUpStatus);
              const server = c.__server as ServerFollowUp | null;

              // SLA + event timing
              const sla = hoursSince(c.createdAt);
              const slaLabel = sla === null ? '' : `${Math.floor(sla)}h`;

              const payload = server?.payload ?? {};
              const startDate = parseIsoMaybe(payload['startDateTime']);
              const untilHours = startDate ? hoursBetween(new Date(), startDate) : null;

              const eventCountdown =
                untilHours === null
                  ? null
                  : untilHours >= 0
                  ? `in ${Math.round(untilHours)}h`
                  : `${Math.round(Math.abs(untilHours))}h ago`;

              const urgency = urgencyForItem({
                createdAtIso: c.createdAt,
                status: c.followUpStatus as FollowUpStatus,
                eventStartIso: asNullableString(payload['startDateTime']),
              });
              const uStyles = urgencyStyles(urgency);

              return (
                <div
                  key={c.id}
                  className={[
                    'rounded-2xl border bg-white p-4 space-y-4',
                    uStyles ? uStyles.ring : 'border-slate-200',
                  ].join(' ')}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-base font-semibold text-slate-900">
                        {c.name ?? 'Unnamed Contact'}
                      </div>
                      <div className="text-sm text-slate-700">
                        {c.phone ?? ''}
                        {c.phone && c.email ? ' • ' : ''}
                        {c.email ?? ''}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 gap-y-1">
                        <span>Added: {formatWhen(c.createdAt)}</span>
                        {c.location ? <span>• {c.location}</span> : null}
                        {c.source ? <span>• Source: {c.source}</span> : null}
                        <span>• {mode === 'server' ? 'Global' : 'Local'}</span>
                        {slaLabel ? <span>• SLA: {slaLabel}</span> : null}
                        {eventCountdown ? <span>• Event: {eventCountdown}</span> : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${b.cls}`}>
                        <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                        <span className="font-medium">{b.label}</span>
                      </div>

                      {uStyles ? (
                        <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${uStyles.chip}`}>
                          <span className="font-semibold">{uStyles.label}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {c.notes ? (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs font-semibold text-slate-700 mb-1">Field Notes</div>
                      <div className="text-sm text-slate-800 whitespace-pre-wrap">{c.notes}</div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`status-${c.id}`}>Follow-up Status</Label>
                      <select
                        id={`status-${c.id}`}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={c.followUpStatus}
                        onChange={(e) => {
                          const status = e.target.value as FollowUpStatus;
                          updateItem(
                            c.id,
                            {
                              followUpStatus: status,
                              followUpCompletedAt:
                                status === 'COMPLETED' ? new Date().toISOString() : null,
                            } as any,
                            server
                          );
                        }}
                      >
                        <option value="NEW">New</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor={`notes-${c.id}`}>Follow-up Notes</Label>
                      <Textarea
                        id={`notes-${c.id}`}
                        rows={3}
                        value={c.followUpNotes ?? ''}
                        onChange={(e) =>
                          updateItem(c.id, { followUpNotes: e.target.value } as any, server)
                        }
                        placeholder="Add notes for outreach..."
                      />
                    </div>
                  </div>

                  {/* Option A calendar workflow + approvals */}
                  {mode === 'server' && isEventRequest(server?.source) ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="text-sm font-semibold text-slate-900">
                        Event Request Actions
                      </div>

                      {server?.payload ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                          <div className="text-sm font-semibold text-slate-900">Event Details</div>

                          {(() => {
                            const p = server.payload ?? {};
                            const title = asNullableString(p['eventTitle']);
                            const type = asNullableString(p['eventType']);
                            const start = asNullableString(p['startDateTime']);
                            const end = asNullableString(p['endDateTime']);
                            const venue = asNullableString(p['venueName']);

                            const address = [
                              asNullableString(p['addressLine1']),
                              asNullableString(p['addressLine2']),
                              asNullableString(p['city']),
                              asNullableString(p['state']),
                              asNullableString(p['zip']),
                            ]
                              .filter(Boolean)
                              .join(', ');

                            const role = asNullableString(p['requestedRole']);
                            const attendance = asNullableString(p['expectedAttendance']);
                            const media = asNullableString(p['mediaExpected']);
                            const desc = asNullableString(p['eventDescription']);

                            return (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <div className="text-xs font-semibold text-slate-600">Title</div>
                                    <div className="text-slate-900">{title ?? '—'}</div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600">Type</div>
                                    <div className="text-slate-900">{type ?? '—'}</div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600">Start</div>
                                    <div className="text-slate-900">{start ? formatWhen(start) : '—'}</div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600">End</div>
                                    <div className="text-slate-900">{end ? formatWhen(end) : '—'}</div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600">Venue</div>
                                    <div className="text-slate-900">{venue ?? '—'}</div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600">Address</div>
                                    <div className="text-slate-900">{address || '—'}</div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600">Requested Role</div>
                                    <div className="text-slate-900">{role ?? '—'}</div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600">Expected Attendance</div>
                                    <div className="text-slate-900">{attendance ?? '—'}</div>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold text-slate-600">Media Expected</div>
                                    <div className="text-slate-900">{media ?? '—'}</div>
                                  </div>
                                </div>

                                {desc ? (
                                  <div className="text-sm">
                                    <div className="text-xs font-semibold text-slate-600 mb-1">Description</div>
                                    <div className="text-slate-900 whitespace-pre-wrap">{desc}</div>
                                  </div>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      ) : null}

                      <div className="text-sm text-slate-700">
                        Staff review required. Approve first — then create calendar hold and notify.
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={
                            !!server?.calendar_event_id ||
                            busy[server.id] === 'calendar' ||
                            !asNullableString(server?.payload?.['startDateTime']) ||
                            !asNullableString(server?.payload?.['endDateTime'])
                          }
                          onClick={async () => {
                            if (!server) return;
                            try {
                              setBusyState(server.id, 'calendar');
                              await approveAndCreateHold(server);
                              await refresh();
                            } catch (err: any) {
                              alert(err?.message ?? 'Failed to create calendar hold.');
                            } finally {
                              setBusyState(server.id, null);
                            }
                          }}
                        >
                          {busy[server.id] === 'calendar'
                            ? 'Creating Hold…'
                            : server?.calendar_event_id
                            ? 'Calendar Hold Created'
                            : 'Approve & Create Hold'}
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy[server.id] === 'notify'}
                          onClick={async () => {
                            if (!server) return;
                            try {
                              setBusyState(server.id, 'notify');
                              await approveAndNotify(server);
                              await refresh();
                            } catch (err: any) {
                              alert(err?.message ?? 'Approve & Notify failed.');
                            } finally {
                              setBusyState(server.id, null);
                            }
                          }}
                        >
                          {busy[server.id] === 'notify' ? 'Opening Notify…' : 'Approve & Notify'}
                        </Button>

                        {server?.calendar_event_link ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => window.open(server.calendar_event_link as string, '_blank')}
                          >
                            View Calendar Event
                          </Button>
                        ) : null}
                      </div>

                      {!asNullableString(server?.payload?.['startDateTime']) ||
                      !asNullableString(server?.payload?.['endDateTime']) ? (
                        <div className="text-xs text-amber-900">
                          Missing start/end time — calendar hold cannot be created until both exist.
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateItem(c.id, { followUpStatus: 'IN_PROGRESS' } as any, server)}
                      disabled={c.followUpStatus === 'IN_PROGRESS'}
                    >
                      Mark In Progress
                    </Button>

                    <Button
                      type="button"
                      onClick={() =>
                        updateItem(
                          c.id,
                          {
                            followUpStatus: 'COMPLETED',
                            followUpCompletedAt: new Date().toISOString(),
                          } as any,
                          server
                        )
                      }
                      disabled={c.followUpStatus === 'COMPLETED'}
                    >
                      Mark Complete
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => archiveItem(c.id, server)}
                    >
                      Archive
                    </Button>
                  </div>

                  {c.followUpStatus === 'COMPLETED' && c.followUpCompletedAt ? (
                    <div className="text-xs text-slate-500">
                      Completed: {formatWhen(c.followUpCompletedAt)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Protocol: every intake submission must create a follow-up entry on this board. This page
            will run in “Global” mode once the Supabase followups endpoints are deployed.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}