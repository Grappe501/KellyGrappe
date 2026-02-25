import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import { Button, ErrorText, HelpText, Input, Label, Textarea } from '../../shared/components/FormControls';

type FollowUpStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED';

type LiveContactRecord = {
  id: string;
  createdAt: string;

  name: string;
  phone?: string;
  email?: string;

  facebookConnected?: boolean;
  facebookProfileName?: string;

  location?: string;
  notes?: string;

  followUpStatus: FollowUpStatus;
  followUpNotes?: string;
  followUpCompletedAt?: string | null;

  archived?: boolean;

  automationEligible?: boolean;
  source?: string;

  permissionToContact?: boolean;
};

const LIST_KEY = 'LIVE_CONTACTS_LIST_v1';

function safe(v: unknown) {
  return (v ?? '').toString();
}

function loadList(): LiveContactRecord[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveList(items: LiveContactRecord[]) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function badge(status: FollowUpStatus) {
  switch (status) {
    case 'NEW':
      return { label: 'New', cls: 'bg-blue-50 text-blue-800 border-blue-200' };
    case 'IN_PROGRESS':
      return { label: 'In progress', cls: 'bg-amber-50 text-amber-900 border-amber-200' };
    case 'COMPLETED':
      return { label: 'Completed', cls: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
  }
}

export default function LiveContactsListPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<LiveContactRecord[]>(() => loadList());
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => items.filter((i) => !i.archived), [items]);
  const completed = useMemo(() => active.filter((i) => i.followUpStatus === 'COMPLETED'), [active]);
  const pending = useMemo(() => active.filter((i) => i.followUpStatus !== 'COMPLETED'), [active]);

  function updateItem(id: string, patch: Partial<LiveContactRecord>) {
    setItems((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, ...patch } : x));
      saveList(next);
      return next;
    });
  }

  function archiveItem(id: string) {
    updateItem(id, { archived: true });
  }

  function clearArchived() {
    setItems((prev) => {
      const next = prev.filter((x) => !x.archived);
      saveList(next);
      return next;
    });
  }

  return (
    <Container>
      <Card className="bg-white text-slate-900">
        <CardHeader
          title="Live Contacts — Follow-ups"
          subtitle="Track follow-up status and notes for field-entered contacts."
          className="bg-white"
        />
        <CardContent className="bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">{pending.length}</span> pending •{' '}
              <span className="font-semibold">{completed.length}</span> completed •{' '}
              <span className="font-semibold">{active.length}</span> active
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="secondary" onClick={() => nav('/live-contact')} className="w-full sm:w-auto">
                Add Another Contact
              </Button>
              <Button type="button" variant="secondary" onClick={() => nav('/')} className="w-full sm:w-auto">
                Home
              </Button>
            </div>
          </div>

          {error ? <ErrorText>{error}</ErrorText> : null}

          {active.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-700">No active contacts yet.</p>
              <HelpText>Go back to Live Contact to add someone you meet in the field.</HelpText>
            </div>
          ) : null}

          <div className="space-y-4">
            {active.map((c) => {
              const b = badge(c.followUpStatus);
              return (
                <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-base font-semibold text-slate-900">{safe(c.name)}</div>
                      <div className="text-sm text-slate-700">
                        {c.phone ? <span>{safe(c.phone)}</span> : null}
                        {c.phone && c.email ? <span> • </span> : null}
                        {c.email ? <span>{safe(c.email)}</span> : null}
                      </div>
                      <div className="text-xs text-slate-500">
                        Added: {formatWhen(c.createdAt)}{c.location ? ` • ${safe(c.location)}` : ''}
                      </div>
                    </div>

                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${b.cls}`}>
                      <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                      <span className="font-medium">{b.label}</span>
                    </div>
                  </div>

                  {c.notes ? (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs font-semibold text-slate-700 mb-1">Field notes</div>
                      <div className="text-sm text-slate-800 whitespace-pre-wrap">{safe(c.notes)}</div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`status-${c.id}`}>Follow-up status</Label>
                      <select
                        id={`status-${c.id}`}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        value={c.followUpStatus}
                        onChange={(e) => {
                          const status = e.target.value as FollowUpStatus;
                          updateItem(c.id, {
                            followUpStatus: status,
                            followUpCompletedAt: status === 'COMPLETED' ? new Date().toISOString() : null,
                          });
                        }}
                      >
                        <option value="NEW">New</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor={`notes-${c.id}`}>Follow-up notes</Label>
                      <Textarea
                        id={`notes-${c.id}`}
                        name={`notes-${c.id}`}
                        rows={3}
                        placeholder="Add follow-up notes here…"
                        value={safe(c.followUpNotes)}
                        onChange={(e) => updateItem(c.id, { followUpNotes: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateItem(c.id, { followUpStatus: 'IN_PROGRESS' })}
                      className="w-full sm:w-auto"
                      disabled={c.followUpStatus === 'IN_PROGRESS'}
                    >
                      Mark In Progress
                    </Button>
                    <Button
                      type="button"
                      onClick={() => updateItem(c.id, { followUpStatus: 'COMPLETED', followUpCompletedAt: new Date().toISOString() })}
                      className="w-full sm:w-auto"
                      disabled={c.followUpStatus === 'COMPLETED'}
                    >
                      Mark Complete
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => archiveItem(c.id)}
                      className="w-full sm:w-auto"
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

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="secondary" onClick={clearArchived} className="w-full sm:w-auto">
              Remove Archived From Device
            </Button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Phase 1 stores follow-ups on this device. Future upgrades will sync to the campaign database for team-wide access.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
