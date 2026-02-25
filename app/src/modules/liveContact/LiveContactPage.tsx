import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import {
  Button,
  ErrorText,
  HelpText,
  Input,
  Label,
  Select,
  Textarea,
} from '../../shared/components/FormControls';
import { submitModule } from '../../shared/utils/apiClient';

type FollowUpStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED';

type LiveContactRecord = {
  id: string;
  createdAt: string;

  // core identity
  name: string;
  phone?: string;
  email?: string;

  // context
  location?: string; // city/county/precinct notes
  source?: string; // door, phone, event, text, referral, other
  notes?: string;

  // permissions + eligibility
  permissionToContact?: boolean;
  automationEligible?: boolean; // future: opt-in + clean contact channels

  // follow-up pipeline
  followUpStatus: FollowUpStatus;
  followUpNotes?: string;
  followUpCompletedAt?: string | null;

  archived?: boolean;
};

type FormState = {
  name: string;
  phone: string;
  email: string;

  location: string;
  source: 'Door' | 'Phone' | 'Event' | 'Text' | 'Referral' | 'Other';
  sourceOther: string;

  notes: string;

  permissionToContact: boolean;
  automationEligible: boolean;

  followUpNeeded: boolean;
  followUpNotes: string;

  honeypot: string;
};

const LIST_KEY = 'LIVE_CONTACTS_LIST_v1';
const DRAFT_KEY = 'KG_SOS_LIVE_CONTACT_DRAFT_v1';

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function isEmailLike(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // keep as digits, but allow user formatting in UI if they want later
  return digits;
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

function newId() {
  try {
    // modern browsers
    return crypto.randomUUID();
  } catch {
    // fallback
    return `lc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export default function LiveContactPage() {
  const nav = useNavigate();

  const didHydrateDraft = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
    name: '',
    phone: '',
    email: '',

    location: '',
    source: 'Door',
    sourceOther: '',

    notes: '',

    permissionToContact: false,
    automationEligible: false,

    followUpNeeded: true,
    followUpNotes: '',

    honeypot: '',
  }));

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const sourceLabel = useMemo(() => {
    return form.source === 'Other'
      ? `Other — ${safeTrim(form.sourceOther) || 'not specified'}`
      : form.source;
  }, [form.source, form.sourceOther]);

  const readyToSave = useMemo(() => {
    // Minimal viable record: name + at least one contact channel (phone/email) OR a location+notes-only
    const hasName = !!safeTrim(form.name);
    const hasPhone = !!safeTrim(form.phone);
    const hasEmail = !!safeTrim(form.email);
    const hasContext = !!safeTrim(form.location) || !!safeTrim(form.notes);

    if (!hasName) return false;
    if (hasPhone || hasEmail) return true;
    return hasContext;
  }, [form.name, form.phone, form.email, form.location, form.notes]);

  const emailValid = useMemo(() => {
    if (!safeTrim(form.email)) return true;
    return isEmailLike(form.email);
  }, [form.email]);

  /* -------------------- Draft Hydration -------------------- */

  useEffect(() => {
    if (didHydrateDraft.current) return;
    didHydrateDraft.current = true;

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed?.data && typeof parsed.data === 'object') {
        setForm((prev) => ({ ...prev, ...parsed.data }));
      }
    } catch {
      // ignore
    }
  }, []);

  /* -------------------- Draft Save (Debounced + Idle) -------------------- */

  useEffect(() => {
    // Debounce writes; localStorage sync writes can cause “sticky key” behavior on some devices.
    const t = window.setTimeout(() => {
      const payload = {
        updatedAt: new Date().toISOString(),
        data: form,
      };

      const write = () => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        } catch {
          // ignore
        }
      };

      // Use requestIdleCallback where supported to reduce UI contention.
      const ric = (window as any).requestIdleCallback as
        | ((cb: () => void, opts?: { timeout: number }) => number)
        | undefined;
      const cic = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;

      if (ric && cic) {
        const id = ric(write, { timeout: 800 });
        return () => cic(id);
      }

      write();
      return;
    }, 350);

    return () => window.clearTimeout(t);
  }, [form]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }

  /* -------------------- Submit -------------------- */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!readyToSave) {
      setError('Please enter a name and at least one way to reach them (phone/email) or add context (location/notes).');
      return;
    }

    if (!emailValid) {
      setError('Please enter a valid email address (or leave it blank).');
      return;
    }

    // Build record
    const record: LiveContactRecord = {
      id: newId(),
      createdAt: new Date().toISOString(),

      name: safeTrim(form.name),
      phone: safeTrim(form.phone) ? normalizePhone(form.phone) : undefined,
      email: safeTrim(form.email) ? safeTrim(form.email) : undefined,

      location: safeTrim(form.location) ? safeTrim(form.location) : undefined,
      source: sourceLabel,
      notes: safeTrim(form.notes) ? safeTrim(form.notes) : undefined,

      permissionToContact: form.permissionToContact,
      automationEligible: form.automationEligible,

      followUpStatus: form.followUpNeeded ? 'NEW' : 'COMPLETED',
      followUpNotes: safeTrim(form.followUpNotes) ? safeTrim(form.followUpNotes) : undefined,
      followUpCompletedAt: form.followUpNeeded ? null : new Date().toISOString(),

      archived: false,
    };

    try {
      setSubmitting(true);

      // 1) Write into local “contact DB” (the list page reads this)
      const existing = loadList();
      const next = [record, ...existing];
      saveList(next);

      // 2) Also log immutable intake via universal submit API
      // This keeps Phase 1 audit logging intact and sets us up for Supabase later.
      await submitModule({
        moduleId: 'MODULE_003_LIVE_CONTACT',
        honeypot: form.honeypot,
        data: {
          ...record,
          // keep original (non-normalized) phone too if you want, but currently not needed
        },
      });

      // clear local draft and reset form for next contact
      clearDraft();
      setForm({
        name: '',
        phone: '',
        email: '',
        location: '',
        source: 'Door',
        sourceOther: '',
        notes: '',
        permissionToContact: false,
        automationEligible: false,
        followUpNeeded: true,
        followUpNotes: '',
        honeypot: '',
      });

      // route to list so canvassers can see it landed
      nav('/live-contacts');
    } catch (err: any) {
      setError(err?.message ?? 'Save failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Live Contact"
          subtitle="Fast field entry for real conversations. Saved locally and logged for the campaign record."
        />
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Honeypot */}
            <div className="hidden" aria-hidden="true">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                value={form.honeypot}
                onChange={(e) => update('honeypot', e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
                <HelpText>Required.</HelpText>
              </div>

              <div>
                <Label htmlFor="location">City / County / Notes</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="Example: Sherwood, Pulaski — Ward 3"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                />
                <HelpText>Helps staff route follow-up.</HelpText>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="501-555-1234"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
                <HelpText>Phone or email is strongly recommended.</HelpText>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@email.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
                {!emailValid ? (
                  <ErrorText>Please enter a valid email address.</ErrorText>
                ) : (
                  <HelpText>Optional, but helpful.</HelpText>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="source">Source</Label>
                <Select
                  id="source"
                  name="source"
                  value={form.source}
                  onChange={(e) =>
                    update('source', e.target.value as FormState['source'])
                  }
                >
                  <option value="Door">Door</option>
                  <option value="Phone">Phone</option>
                  <option value="Event">Event</option>
                  <option value="Text">Text</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other</option>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="sourceOther">If “Other”, describe</Label>
                <Input
                  id="sourceOther"
                  name="sourceOther"
                  placeholder="Example: church intro, union hall, small business visit…"
                  value={form.sourceOther}
                  onChange={(e) => update('sourceOther', e.target.value)}
                  disabled={form.source !== 'Other'}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Conversation notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Key concerns, what they asked for, what we promised, anything staff should know…"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <input
                  id="permissionToContact"
                  name="permissionToContact"
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded-md"
                  checked={form.permissionToContact}
                  onChange={(e) => update('permissionToContact', e.target.checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="permissionToContact">Permission to contact</Label>
                  <HelpText>
                    Check if they gave consent for follow-up outreach.
                  </HelpText>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <input
                  id="automationEligible"
                  name="automationEligible"
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded-md"
                  checked={form.automationEligible}
                  onChange={(e) => update('automationEligible', e.target.checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="automationEligible">Automation eligible</Label>
                  <HelpText>
                    Use for clean opt-ins (future: auto reminders & workflow).
                  </HelpText>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <input
                id="followUpNeeded"
                name="followUpNeeded"
                type="checkbox"
                className="mt-1 h-5 w-5 rounded-md"
                checked={form.followUpNeeded}
                onChange={(e) => update('followUpNeeded', e.target.checked)}
              />
              <div className="space-y-1 w-full">
                <Label htmlFor="followUpNeeded">Follow-up needed</Label>
                <HelpText>
                  If checked, this contact will appear as NEW on the follow-up list.
                </HelpText>

                <div className="mt-3">
                  <Label htmlFor="followUpNotes">Follow-up notes</Label>
                  <Textarea
                    id="followUpNotes"
                    name="followUpNotes"
                    rows={3}
                    placeholder="Who should follow up, what to do next, due date suggestions…"
                    value={form.followUpNotes}
                    onChange={(e) => update('followUpNotes', e.target.value)}
                    disabled={!form.followUpNeeded}
                  />
                </div>
              </div>
            </div>

            {error ? <ErrorText>{error}</ErrorText> : null}

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => nav('/')}
                disabled={submitting}
              >
                Back to Home
              </Button>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => nav('/live-contacts')}
                  disabled={submitting}
                >
                  View Follow-ups
                </Button>

                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Contact'}
                </Button>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed">
              Drafts save automatically on this device. Saved contacts appear immediately in the follow-up list.
            </div>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}