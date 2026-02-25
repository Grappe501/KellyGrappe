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

import {
  upsertContact,
  addOrigin,
  addLiveFollowUp,
  parseCityCounty,
} from '../../shared/utils/contactsDb';

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

  facebookConnected: boolean;
  facebookProfileName: string;
  facebookHandle: string;

  followUpNeeded: boolean;
  followUpNotes: string;

  honeypot: string;
};

const DRAFT_KEY = 'KG_SOS_LIVE_CONTACT_DRAFT_v3';

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function isEmailLike(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, '');
}

export default function LiveContactPage() {
  const nav = useNavigate();
  const didHydrateDraft = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    location: '',
    source: 'Door',
    sourceOther: '',
    notes: '',
    permissionToContact: false,
    automationEligible: false,
    facebookConnected: false,
    facebookProfileName: '',
    facebookHandle: '',
    followUpNeeded: true,
    followUpNotes: '',
    honeypot: '',
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const sourceLabel = useMemo(() => {
    return form.source === 'Other'
      ? `Other — ${safeTrim(form.sourceOther) || 'not specified'}`
      : form.source;
  }, [form.source, form.sourceOther]);

  const readyToSave = useMemo(() => {
    const hasName = !!safeTrim(form.name);
    const hasPhone = !!safeTrim(form.phone);
    const hasEmail = !!safeTrim(form.email);
    const hasContext = !!safeTrim(form.location) || !!safeTrim(form.notes);

    if (!hasName) return false;
    if (hasPhone || hasEmail) return true;
    return hasContext;
  }, [form]);

  const emailValid = useMemo(() => {
    if (!safeTrim(form.email)) return true;
    return isEmailLike(form.email);
  }, [form.email]);

  /* ---------------- Draft Hydration ---------------- */

  useEffect(() => {
    if (didHydrateDraft.current) return;
    didHydrateDraft.current = true;

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.data) {
        setForm((prev) => ({ ...prev, ...parsed.data }));
      }
    } catch {}
  }, []);

  /* ---------------- Draft Save ---------------- */

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            updatedAt: new Date().toISOString(),
            data: form,
          })
        );
      } catch {}
    }, 300);

    return () => window.clearTimeout(t);
  }, [form]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  /* ---------------- Submit ---------------- */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!readyToSave) {
      setError('Please enter a name and at least one contact method or context.');
      return;
    }

    if (!emailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);

      const { city, county } = parseCityCounty(form.location);

      const contact = await upsertContact({
        fullName: safeTrim(form.name),
        email: safeTrim(form.email) || undefined,
        phone: safeTrim(form.phone)
          ? normalizePhone(form.phone)
          : undefined,
        city,
        county,
        state: 'AR',
        facebookConnected: form.facebookConnected,
        facebookProfileName: form.facebookConnected
          ? safeTrim(form.facebookProfileName) || undefined
          : undefined,
        facebookHandle: form.facebookConnected
          ? safeTrim(form.facebookHandle) || undefined
          : undefined,
      });

      await addOrigin({
        contactId: contact.id,
        originType: 'LIVE_FIELD',
        rawPayload: { ...form },
      });

      await addLiveFollowUp({
        contactId: contact.id,
        followUpStatus: form.followUpNeeded ? 'NEW' : 'COMPLETED',
        followUpNotes: safeTrim(form.followUpNotes) || undefined,
        followUpCompletedAt: form.followUpNeeded
          ? null
          : new Date().toISOString(),
        archived: false,
        name: contact.fullName,
        phone: contact.phone,
        email: contact.email,
        location: form.location,
        notes: form.notes,
        source: sourceLabel,
        automationEligible: form.automationEligible,
        permissionToContact: form.permissionToContact,
        facebookConnected: form.facebookConnected,
        facebookProfileName: form.facebookProfileName,
        facebookHandle: form.facebookHandle,
      });

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
        facebookConnected: false,
        facebookProfileName: '',
        facebookHandle: '',
        followUpNeeded: true,
        followUpNotes: '',
        honeypot: '',
      });

      nav('/live-contacts');
    } catch (err: any) {
      setError(err?.message ?? 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <div className="space-y-4">

        {/* Scanner Shortcut */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-900">
              Have a business card?
            </div>
            <div className="text-xs text-slate-600">
              Use the AI scanner to auto-extract details instead of typing.
            </div>
          </div>

          <Button
            type="button"
            onClick={() => nav('/business-card-scan')}
          >
            Open Business Card Scanner
          </Button>
        </div>

        <Card>
          <CardHeader
            title="Live Contact Entry"
            subtitle="Fast field entry. Stored in the campaign contact engine."
          />

          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="location">City / County</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                  />
                  {!emailValid ? <ErrorText>Invalid email.</ErrorText> : null}
                </div>
              </div>

              {/* FACEBOOK SECTION */}

              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 space-y-4">
                <div className="flex items-start gap-3">
                  <input
                    id="facebookConnected"
                    type="checkbox"
                    checked={form.facebookConnected}
                    onChange={(e) =>
                      update('facebookConnected', e.target.checked)
                    }
                  />
                  <div>
                    <Label htmlFor="facebookConnected">
                      Connected on Facebook
                    </Label>
                    <HelpText>
                      Check if you are connected or exchanged Facebook info.
                    </HelpText>
                  </div>
                </div>

                {form.facebookConnected && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="facebookProfileName">
                        Facebook Profile Name
                      </Label>
                      <Input
                        id="facebookProfileName"
                        value={form.facebookProfileName}
                        onChange={(e) =>
                          update('facebookProfileName', e.target.value)
                        }
                        placeholder="Exact display name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="facebookHandle">
                        Facebook Handle
                      </Label>
                      <Input
                        id="facebookHandle"
                        value={form.facebookHandle}
                        onChange={(e) =>
                          update('facebookHandle', e.target.value)
                        }
                        placeholder="facebook.com/username"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Conversation Notes</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </div>

              {error ? <ErrorText>{error}</ErrorText> : null}

              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => nav('/')}>
                  Back
                </Button>

                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Contact'}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}