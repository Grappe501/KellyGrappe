import React, { useEffect, useMemo, useRef, useState } from 'react';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import {
  Button,
  ErrorText,
  Input,
  Label,
  Textarea,
} from '../../shared/components/FormControls';

import {
  upsertContact,
  addOrigin,
  addLiveFollowUp,
  parseCityCounty,
  listLiveFollowUpsPendingSync,
  markLiveFollowUpSynced,
  markLiveFollowUpSyncError,
} from '../../shared/utils/contactsDb';

type FormState = {
  initials: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  notes: string;
  permissionToContact: boolean;
  followUpNeeded: boolean;
  followUpNotes: string;
};

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, '');
}

function isEmailLike(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function LiveContactPage() {
  const nameRef = useRef<HTMLInputElement | null>(null);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    initials: '',
    name: '',
    phone: '',
    email: '',
    location: '',
    notes: '',
    permissionToContact: false,
    followUpNeeded: true,
    followUpNotes: '',
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const readyToSave = useMemo(() => {
    return (
      form.initials.length === 3 &&
      !!safeTrim(form.name) &&
      (!!safeTrim(form.phone) || !!safeTrim(form.email)) &&
      form.permissionToContact
    );
  }, [form]);

  const emailValid = useMemo(() => {
    if (!safeTrim(form.email)) return true;
    return isEmailLike(form.email);
  }, [form.email]);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleOnline() {
      runSync();
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  async function runSync() {
    if (!navigator.onLine) return;

    setSyncing(true);

    try {
      const pending = await listLiveFollowUpsPendingSync();

      for (const row of pending) {
        try {
          const res = await fetch('/.netlify/functions/followups-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contact_id: row.contactId,
              status: row.followUpStatus,
              notes: row.followUpNotes ?? row.notes ?? null,
              archived: row.archived ?? false,
              completed_at: row.followUpCompletedAt ?? null,
              name: row.name ?? null,
              phone: row.phone ?? null,
              email: row.email ?? null,
              location: row.location ?? null,
              source: row.source ?? 'LIVE_FIELD',
              permission_to_contact: row.permissionToContact ?? null,
              entry_initials: row.entryInitials ?? 'UNK',
            }),
          });

          const json = await res.json();

          if (!res.ok || !json?.item?.id) {
            throw new Error(json?.error || 'Sync failed');
          }

          await markLiveFollowUpSynced({
            id: row.id,
            serverId: json.item.id,
          });
        } catch (err: any) {
          await markLiveFollowUpSyncError({
            id: row.id,
            error: err?.message ?? 'Sync error',
          });
        }
      }
    } finally {
      setSyncing(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!readyToSave) {
      setError('Initials, name, contact method, and consent required.');
      return;
    }

    if (!emailValid) {
      setError('Invalid email format.');
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
      });

      await addOrigin({
        contactId: contact.id,
        originType: 'LIVE_FIELD',
        rawPayload: form,
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
        permissionToContact: form.permissionToContact,
        entryInitials: form.initials,
        syncStatus: 'PENDING_SYNC',
      } as any);

      setSuccess('Saved locally. Syncing…');

      await runSync();

      setForm((prev) => ({
        ...prev,
        name: '',
        phone: '',
        email: '',
        location: '',
        notes: '',
        followUpNotes: '',
        permissionToContact: false,
      }));

      nameRef.current?.focus();
    } catch (err: any) {
      setError(err?.message ?? 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Live Contact Entry"
          subtitle="Offline-first. Auto-sync enabled."
        />

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <Label htmlFor="initials">Your Initials (3 Letters)</Label>
              <Input
                id="initials"
                value={form.initials}
                maxLength={3}
                onChange={(e) =>
                  update(
                    'initials',
                    e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
                  )
                }
              />
            </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                ref={nameRef}
                id="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </div>

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
                onChange={(e) => update('email', e.target.value.toLowerCase())}
              />
              {!emailValid && <ErrorText>Invalid email.</ErrorText>}
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.permissionToContact}
                onChange={(e) =>
                  update('permissionToContact', e.target.checked)
                }
              />
              <Label htmlFor="permissionToContact">
                Permission to Contact
              </Label>
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            {success && (
              <div className="text-green-600 text-sm font-medium">
                {success}
              </div>
            )}

            {syncing && (
              <div className="text-indigo-600 text-sm font-medium">
                Syncing pending records…
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={runSync}
              >
                Retry Sync
              </Button>

              <Button type="submit" disabled={!readyToSave || submitting}>
                {submitting ? 'Saving…' : 'Save & Add Next'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}