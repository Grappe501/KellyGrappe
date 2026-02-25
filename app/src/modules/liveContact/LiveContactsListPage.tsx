import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import { Button, ErrorText, HelpText, Label, Textarea } from '../../shared/components/FormControls';
import {
  listLiveFollowUps,
  updateLiveFollowUp,
  type LiveFollowUp,
} from '../../shared/utils/contactsDb';

type FollowUpStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED';

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
      return { label: 'In Progress', cls: 'bg-amber-50 text-amber-900 border-amber-200' };
    case 'COMPLETED':
      return { label: 'Completed', cls: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
  }
}

export default function LiveContactsListPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<LiveFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      const list = await listLiveFollowUps();
      setItems(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const active = useMemo(
    () => items.filter((i) => !i.archived),
    [items]
  );

  const pending = useMemo(
    () => active.filter((i) => i.followUpStatus !== 'COMPLETED'),
    [active]
  );

  const completed = useMemo(
    () => active.filter((i) => i.followUpStatus === 'COMPLETED'),
    [active]
  );

  async function updateItem(id: string, patch: Partial<LiveFollowUp>) {
    await updateLiveFollowUp(id, patch);
    await refresh();
  }

  async function archiveItem(id: string) {
    await updateItem(id, { archived: true });
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Follow-Up Board"
          subtitle="Field contacts that require action. All entries are stored in the campaign contact engine."
        />
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">{pending.length}</span> pending •{' '}
              <span className="font-semibold">{completed.length}</span> completed •{' '}
              <span className="font-semibold">{active.length}</span> active
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="secondary" onClick={() => nav('/live-contact')}>
                Add Contact
              </Button>
              <Button type="button" variant="secondary" onClick={() => nav('/')}>
                Home
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-600">Loading follow-ups…</div>
          ) : null}

          {error ? <ErrorText>{error}</ErrorText> : null}

          {!loading && active.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-700">No active follow-ups yet.</p>
              <HelpText>Add a contact from the field to begin tracking outreach.</HelpText>
            </div>
          ) : null}

          <div className="space-y-4">
            {active.map((c) => {
              const b = badge(c.followUpStatus);
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
                          updateItem(c.id, {
                            followUpStatus: status,
                            followUpCompletedAt:
                              status === 'COMPLETED' ? new Date().toISOString() : null,
                          });
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
                          updateItem(c.id, { followUpNotes: e.target.value })
                        }
                        placeholder="Add notes for outreach..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateItem(c.id, { followUpStatus: 'IN_PROGRESS' })}
                      disabled={c.followUpStatus === 'IN_PROGRESS'}
                    >
                      Mark In Progress
                    </Button>

                    <Button
                      type="button"
                      onClick={() =>
                        updateItem(c.id, {
                          followUpStatus: 'COMPLETED',
                          followUpCompletedAt: new Date().toISOString(),
                        })
                      }
                      disabled={c.followUpStatus === 'COMPLETED'}
                    >
                      Mark Complete
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => archiveItem(c.id)}
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
            This board is powered by the unified contact engine. Every follow-up is tied to a canonical contact record and origin log.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}