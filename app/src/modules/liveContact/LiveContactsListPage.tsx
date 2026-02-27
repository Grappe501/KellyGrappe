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

export default function LiveContactsListPage() {
  const nav = useNavigate();

  const [mode, setMode] = useState<'server' | 'local'>('server');
  const [serverNotice, setServerNotice] = useState<string | null>(null);

  const [serverItems, setServerItems] = useState<ServerFollowUp[]>([]);
  const [localItems, setLocalItems] = useState<LiveFollowUp[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    return localItems.filter((i) => !i.archived).map((i) => ({ ...i, __server: null } as any));
  }, [mode, serverItems, localItems]);

  const pending = useMemo(
    () => unified.filter((i: any) => i.followUpStatus !== 'COMPLETED'),
    [unified]
  );

  const completed = useMemo(
    () => unified.filter((i: any) => i.followUpStatus === 'COMPLETED'),
    [unified]
  );

  async function updateItem(id: string, patch: Partial<LiveFollowUp>, server?: ServerFollowUp | null) {
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

              return (
                <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
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
                      <div className="text-xs text-slate-500">
                        Added: {formatWhen(c.createdAt)}
                        {c.location ? ` • ${c.location}` : ''}
                        {c.source ? ` • Source: ${c.source}` : ''}
                        {mode === 'server' ? ' • Global' : ' • Local'}
                      </div>
                    </div>

                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${b.cls}`}>
                      <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                      <span className="font-medium">{b.label}</span>
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
                        onChange={(e) => updateItem(c.id, { followUpNotes: e.target.value } as any, server)}
                        placeholder="Add notes for outreach..."
                      />
                    </div>
                  </div>

                  {/* Option A calendar workflow: button will work once calendar endpoints are wired to server followups */}
                  {mode === 'server' && isEventRequest(server?.source) ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                      <div className="text-sm font-semibold text-slate-900">Event Request Actions</div>
                      <div className="text-sm text-slate-700">
                        Staff review required. Create a calendar hold only after confirming details.
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!!server?.calendar_event_id}
                          onClick={() => {
                            // We will wire this next:
                            // call /.netlify/functions/calendar-create with followupId,
                            // then update followup row with calendar_event_id + link
                            alert(
                              'Calendar hold button is staged. Next step: wire calendar-create to followups.'
                            );
                          }}
                        >
                          {server?.calendar_event_id ? 'Calendar Hold Created' : 'Create Calendar Hold'}
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

                    <Button type="button" variant="secondary" onClick={() => archiveItem(c.id, server)}>
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