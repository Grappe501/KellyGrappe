import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardContent } from '../../shared/components/Card';
import { Button, ErrorText, Input, Label, Textarea } from '../../shared/components/FormControls';
import { submitModule } from '../../shared/utils/apiClient';

type FollowUpStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED';

type LiveContactFormState = {
  name: string;
  phone: string;
  email: string;
  facebookConnected: boolean;
  facebookProfileName: string;
  location: string;
  notes: string;
  permissionToContact: boolean;
  honeypot: string;
};

const DRAFT_KEY = 'KG_LIVE_CONTACT_DRAFT_v3';
const LIST_KEY = 'LIVE_CONTACTS_LIST_v1';

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function isEmailLike(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isPhoneLike(v: string) {
  const digits = v.replace(/\D/g, '');
  return digits.length >= 10;
}

function nowIso() {
  return new Date().toISOString();
}

export default function LiveContactPage() {
  const nav = useNavigate();
  const didHydrateDraft = useRef(false);

  const [form, setForm] = useState<LiveContactFormState>({
    name: '',
    phone: '',
    email: '',
    facebookConnected: false,
    facebookProfileName: '',
    location: '',
    notes: '',
    permissionToContact: true,
    honeypot: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hasAnyDirect = useMemo(() => {
    const hasPhone = safeTrim(form.phone) ? isPhoneLike(form.phone) : false;
    const hasEmail = safeTrim(form.email) ? isEmailLike(form.email) : false;
    return hasPhone || hasEmail;
  }, [form.phone, form.email]);

  const canSubmit = useMemo(() => {
    if (!safeTrim(form.name)) return false;
    if (!hasAnyDirect) return false;
    if (safeTrim(form.email) && !isEmailLike(form.email)) return false;
    if (!form.permissionToContact) return false;
    return true;
  }, [form, hasAnyDirect]);

  function update<K extends keyof LiveContactFormState>(key: K, value: LiveContactFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const copy = { ...prev };
      delete copy[key as string];
      return copy;
    });
  }

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
    } catch {}
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            updatedAt: nowIso(),
            data: form,
          })
        );
      } catch {}
    }, 400);

    return () => clearTimeout(timeout);
  }, [form]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!safeTrim(form.name)) errs.name = 'Name is required.';
    if (!hasAnyDirect) errs.phone = 'Phone or email is required.';
    if (safeTrim(form.email) && !isEmailLike(form.email))
      errs.email = 'Please enter a valid email address.';
    if (!form.permissionToContact)
      errs.permissionToContact = 'Consent is required.';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function FieldHint({ id }: { id: string }) {
    const msg = fieldErrors[id];
    if (!msg) return null;
    return <p className="mt-1 text-sm text-red-600">{msg}</p>;
  }

  function appendToLocalList(entry: any) {
    try {
      const raw = localStorage.getItem(LIST_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(arr) ? [entry, ...arr] : [entry];
      localStorage.setItem(LIST_KEY, JSON.stringify(next));
    } catch {}
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRequestId(null);

    if (!validate()) {
      setError('Please fix the highlighted fields.');
      return;
    }

    try {
      setSubmitting(true);

      const payloadData = {
        name: safeTrim(form.name),
        phone: safeTrim(form.phone) || undefined,
        email: safeTrim(form.email) || undefined,
        location: safeTrim(form.location) || undefined,
        notes: safeTrim(form.notes) || undefined,
        followUpStatus: 'NEW' as FollowUpStatus,
        followUpNotes: '',
        followUpCompletedAt: null,
        automationEligible: true,
        source: 'LIVE_FIELD',
        permissionToContact: form.permissionToContact,
      };

      const res = await submitModule({
        moduleId: 'MODULE_003_LIVE_CONTACT',
        honeypot: form.honeypot,
        data: payloadData,
      });

      setRequestId(res.requestId);

      appendToLocalList({
        id: res.requestId,
        createdAt: nowIso(),
        ...payloadData,
      });

      setForm({
        name: '',
        phone: '',
        email: '',
        facebookConnected: false,
        facebookProfileName: '',
        location: '',
        notes: '',
        permissionToContact: true,
        honeypot: '',
      });

      clearDraft();
    } catch (err: any) {
      setError(err?.message ?? 'Save failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <Card className="bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">

        <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white p-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Live Contact Capture
          </h1>
          <p className="mt-2 text-sm opacity-90">
            Every conversation matters. Capture it. Build momentum.
          </p>
        </div>

        <CardContent className="p-8 space-y-10">

          <div className="flex justify-between items-center">
            {requestId ? (
              <div className="px-4 py-2 bg-green-100 border border-green-300 text-green-800 rounded-full text-sm font-semibold animate-pulse">
                ✓ Saved — ID {requestId}
              </div>
            ) : (
              <div className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-sm font-semibold">
                Ready to capture
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => nav('/live-contacts')}>
                Follow-ups
              </Button>
              <Button variant="secondary" onClick={() => nav('/')}>
                Home
              </Button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-8">

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Contact</h2>

              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} />
                <FieldHint id="name" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Notes</h2>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={form.location} onChange={(e) => update('location', e.target.value)} />
              </div>

              <div>
                <Label htmlFor="notes">Conversation Notes</Label>
                <Textarea id="notes" rows={5} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
              </div>
            </section>

            <section className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  id="permissionToContact"
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-indigo-600"
                  checked={form.permissionToContact}
                  onChange={(e) => update('permissionToContact', e.target.checked)}
                />
                <div>
                  <Label htmlFor="permissionToContact">
                    I have permission to follow up.
                  </Label>
                  <FieldHint id="permissionToContact" />
                </div>
              </div>

              {error && <ErrorText>{error}</ErrorText>}

              <Button
                type="submit"
                disabled={!canSubmit || submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 text-lg rounded-xl shadow-lg transition-all"
              >
                {submitting ? 'Saving…' : 'Save & Keep Building'}
              </Button>
            </section>

          </form>
        </CardContent>
      </Card>
    </Container>
  );
}