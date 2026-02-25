import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import { Button, ErrorText, HelpText, Input, Label, Textarea } from '../../shared/components/FormControls';
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

  // anti-spam
  honeypot: string;
};

const DRAFT_KEY = 'KG_LIVE_CONTACT_DRAFT_v1';
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

  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const didHydrateDraft = useRef(false);

  const [form, setForm] = useState<LiveContactFormState>(() => ({
    name: '',
    phone: '',
    email: '',
    facebookConnected: false,
    facebookProfileName: '',
    location: '',
    notes: '',
    permissionToContact: true,
    honeypot: '',
  }));

  const hasAnyDirect = useMemo(() => {
    const hasPhone = safeTrim(form.phone) ? isPhoneLike(form.phone) : false;
    const hasEmail = safeTrim(form.email) ? isEmailLike(form.email) : false;
    return hasPhone || hasEmail;
  }, [form.phone, form.email]);

  const canSubmit = useMemo(() => {
    if (!safeTrim(form.name)) return false;
    if (!hasAnyDirect) return false;
    if (safeTrim(form.email) && !isEmailLike(form.email)) return false;
    if (form.facebookConnected && !safeTrim(form.facebookProfileName)) return false;
    if (!form.permissionToContact) return false;
    return true;
  }, [form.name, form.email, form.facebookConnected, form.facebookProfileName, form.permissionToContact, hasAnyDirect]);

  function update<K extends keyof LiveContactFormState>(key: K, value: LiveContactFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const copy = { ...prev };
      delete copy[key as string];
      return copy;
    });
  }

  /* ------------------------------- Drafts --------------------------------- */

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

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          updatedAt: nowIso(),
          data: form,
        })
      );
    } catch {
      // ignore
    }
  }, [form]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }

  /* ----------------------------- Validation -------------------------------- */

  function validate() {
    const errs: Record<string, string> = {};

    if (!safeTrim(form.name)) errs.name = 'Name is required.';
    if (!hasAnyDirect) errs.phone = 'Phone or email is required.';
    if (safeTrim(form.email) && !isEmailLike(form.email)) errs.email = 'Please enter a valid email address.';
    if (safeTrim(form.phone) && !isPhoneLike(form.phone)) errs.phone = 'Please enter a valid phone number.';
    if (form.facebookConnected && !safeTrim(form.facebookProfileName)) errs.facebookProfileName = 'Facebook profile name is required if connected.';
    if (!form.permissionToContact) errs.permissionToContact = 'Consent is required to save this contact.';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function FieldHint({ id }: { id: string }) {
    const msg = fieldErrors[id];
    if (!msg) return null;
    return <p className="mt-1 text-sm text-rose-600">{msg}</p>;
  }

  /* ------------------------------ Local List ------------------------------- */

  function appendToLocalList(entry: any) {
    try {
      const raw = localStorage.getItem(LIST_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(arr) ? [entry, ...arr] : [entry];
      localStorage.setItem(LIST_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  /* -------------------------------- Submit -------------------------------- */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRequestId(null);

    const ok = validate();
    if (!ok) {
      setError('Please fix the highlighted fields.');
      return;
    }

    try {
      setSubmitting(true);

      const payloadData = {
        name: safeTrim(form.name),
        phone: safeTrim(form.phone) || undefined,
        email: safeTrim(form.email) || undefined,
        facebookConnected: form.facebookConnected,
        facebookProfileName: form.facebookConnected ? safeTrim(form.facebookProfileName) : undefined,
        location: safeTrim(form.location) || undefined,
        notes: safeTrim(form.notes) || undefined,

        // future-ready follow-up structure
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

      // Clear for rapid next entry
      setForm((prev) => ({
        ...prev,
        name: '',
        phone: '',
        email: '',
        facebookConnected: false,
        facebookProfileName: '',
        location: '',
        notes: '',
        permissionToContact: true,
        honeypot: '',
      }));
      clearDraft();
    } catch (err: any) {
      setError(err?.message ?? 'Save failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <Card className="bg-white text-slate-900">
        <CardHeader
          title="Live Contact"
          subtitle="Quick field entry. Save a contact in 20 seconds and keep moving."
          className="bg-white"
        />
        <CardContent className="bg-white">
          <form onSubmit={onSubmit} className="space-y-6 text-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-slate-600">
                {requestId ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">
                    Saved • ID {requestId}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                    Ready
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="secondary" onClick={() => nav('/live-contacts')} className="w-full sm:w-auto">
                  View Follow-ups
                </Button>
                <Button type="button" variant="secondary" onClick={() => nav('/')} className="w-full sm:w-auto">
                  Home
                </Button>
              </div>
            </div>

            {/* Honeypot */}
            <div className="hidden" aria-hidden="true">
              <Label htmlFor="companyWebsite">Company Website</Label>
              <Input
                id="companyWebsite"
                name="companyWebsite"
                value={form.honeypot}
                onChange={(e) => update('honeypot', e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold tracking-tight text-slate-900">Contact</h2>
                <p className="text-sm text-slate-600">Name is required. Enter at least a phone number or an email.</p>
              </div>

              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Full name" value={form.name} onChange={(e) => update('name', e.target.value)} />
                <FieldHint id="name" />
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
                    inputMode="tel"
                  />
                  <FieldHint id="phone" />
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
                  <FieldHint id="email" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold tracking-tight text-slate-900">Social</h2>
                <p className="text-sm text-slate-600">Optional — capture Facebook connection details for follow-up.</p>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                <input
                  id="facebookConnected"
                  name="facebookConnected"
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded-md"
                  checked={form.facebookConnected}
                  onChange={(e) => update('facebookConnected', e.target.checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="facebookConnected">Connected on Facebook</Label>
                  <HelpText>Check this if you’re already connected, or you plan to connect.</HelpText>
                </div>
              </div>

              {form.facebookConnected ? (
                <div>
                  <Label htmlFor="facebookProfileName">Facebook profile name</Label>
                  <Input
                    id="facebookProfileName"
                    name="facebookProfileName"
                    placeholder="Example: John Smith"
                    value={form.facebookProfileName}
                    onChange={(e) => update('facebookProfileName', e.target.value)}
                  />
                  <FieldHint id="facebookProfileName" />
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold tracking-tight text-slate-900">Context</h2>
                <p className="text-sm text-slate-600">Where you met them and anything important to remember.</p>
              </div>

              <div>
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="Example: Benton County GOP dinner"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Example: Interested in volunteering. Asked about voter ID. Wants follow-up next week."
                  rows={5}
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                <input
                  id="permissionToContact"
                  name="permissionToContact"
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded-md"
                  checked={form.permissionToContact}
                  onChange={(e) => update('permissionToContact', e.target.checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="permissionToContact">
                    I have permission to contact this person for campaign follow-up.
                  </Label>
                  <HelpText>Required to save this entry.</HelpText>
                  <FieldHint id="permissionToContact" />
                </div>
              </div>

              {error ? <ErrorText>{error}</ErrorText> : null}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={submitting || !canSubmit} className="w-full sm:w-auto">
                  {submitting ? 'Saving…' : 'Save Contact'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => nav('/live-contacts')} className="w-full sm:w-auto">
                  Go to Follow-ups
                </Button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Tip: after saving, the form clears automatically so you can enter the next contact immediately.
              </p>
            </section>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
