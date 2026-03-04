import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import { Button, ErrorText, HelpText, Label } from '../../shared/components/FormControls';

import { addContactMedia, addOrigin, addLiveFollowUp, parseCityCounty, upsertContact } from '../../shared/utils/contactsDb';

import { useLiveContactForm } from './hooks/useLiveContactForm';
import { splitCsvTags, uniqTags, safeTrim, normalizePhone } from './utils/contactFormHelpers';

import { ContactIdentitySection } from './components/ContactIdentitySection';
import { ContactLocationSection } from './components/ContactLocationSection';
import { CampaignCategorySection } from './components/CampaignCategorySection';
import { TeamAssignmentSection } from './components/TeamAssignmentSection';
import { EngagementSignalsSection } from './components/EngagementSignalsSection';
import { MeetingContextSection } from './components/MeetingContextSection';
import { ConversationNotesSection } from './components/ConversationNotesSection';
import { SocialProfilesSection } from './components/SocialProfilesSection';
import { PhotoCaptureSection } from './components/PhotoCaptureSection';
import { FollowUpSection } from './components/FollowUpSection';

import { buildLiveFollowUpRow, buildLocationLabel, buildTags } from './services/followupPayloadBuilder';
import { syncPendingLiveFollowUps } from './services/liveContactSync';

export default function LiveContactPage() {
  const nav = useNavigate();
  const nameRef = useRef<HTMLInputElement | null>(null);

  const { form, update, setForm, readyToSave, emailValid, normalizeBeforeSave } = useLiveContactForm();

  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    async function onOnline() {
      await runSync();
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSync() {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const res = await syncPendingLiveFollowUps();
      if (res.attempted) {
        setSuccess(`Sync: ${res.synced} synced, ${res.errors} errors.`);
      }
    } finally {
      setSyncing(false);
    }
  }

  function applyBusinessCardExtracted(data: any) {
    // Gentle auto-fill: only fill blanks unless extraction is confidently valuable
    setForm((p) => ({
      ...p,
      fullName: p.fullName || data.fullName || '',
      email: p.email || data.email || '',
      phone: p.phone || data.phone || '',
      organization: p.organization || data.organization || '',
      facebookHandle: p.facebookHandle || data.facebookHandle || '',
      facebookProfileName: p.facebookProfileName || data.facebookProfileName || '',
      facebookConnected: p.facebookConnected || !!(data.facebookHandle || data.facebookProfileName),
      city: p.city || data.city || '',
      county: p.county || data.county || '',
      state: p.state || data.state || 'AR',
      zip: p.zip || data.zip || '',
    }));
    setExpanded(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const normalized = normalizeBeforeSave(form);

    if (!readyToSave) {
      setError('Initials, name, a contact method (phone/email), and consent are required.');
      return;
    }

    if (!emailValid) {
      setError('Invalid email format.');
      return;
    }

    try {
      setSubmitting(true);

      // 1) Upsert canonical contact
      const contact = await upsertContact({
        fullName: safeTrim(normalized.fullName) || undefined,
        email: safeTrim(normalized.email) || undefined,
        phone: safeTrim(normalized.phone) || undefined,

        city: safeTrim(normalized.city) || undefined,
        county: safeTrim(normalized.county) || undefined,
        state: safeTrim(normalized.state) || 'AR',
        zip: safeTrim(normalized.zip) || undefined,

        precinct: safeTrim(normalized.precinct) || undefined,
        congressionalDistrict: safeTrim(normalized.congressionalDistrict) || undefined,
        stateHouseDistrict: safeTrim(normalized.stateHouseDistrict) || undefined,
        stateSenateDistrict: safeTrim(normalized.stateSenateDistrict) || undefined,

        category: (normalized.category || undefined) as any,
        supportLevel: (normalized.supportLevel || undefined) as any,
        bestContactMethod: (normalized.bestContactMethod || undefined) as any,
        teamAssignments: normalized.teamAssignments?.length ? normalized.teamAssignments : undefined,

        introducedBy: safeTrim(normalized.introducedBy) || undefined,
        organization: safeTrim(normalized.organization) || undefined,
        metWhere: safeTrim(normalized.metWhere) || undefined,
        eventName: safeTrim(normalized.eventName) || undefined,
        metWhereDetails: safeTrim(normalized.metWhereDetails) || undefined,

        topIssue: safeTrim(normalized.topIssue) || undefined,
        conversationNotes: safeTrim(normalized.conversationNotes) || undefined,

        interestedVolunteer: normalized.interestedVolunteer,
        interestedDonate: normalized.interestedDonate,
        interestedHostEvent: normalized.interestedHostEvent,
        interestedYardSign: normalized.interestedYardSign,
        interestedCountyLeader: normalized.interestedCountyLeader,
        interestedPrecinctCaptain: normalized.interestedPrecinctCaptain,

        influenceScore: typeof normalized.influenceScore === 'number' ? normalized.influenceScore : undefined,
        fundraisingPotential: typeof normalized.fundraisingPotential === 'number' ? normalized.fundraisingPotential : undefined,
        volunteerPotential: typeof normalized.volunteerPotential === 'number' ? normalized.volunteerPotential : undefined,

        facebookConnected: normalized.facebookConnected,
        facebookProfileName: safeTrim(normalized.facebookProfileName) || undefined,
        facebookHandle: safeTrim(normalized.facebookHandle) || undefined,
        facebookUrl: safeTrim(normalized.facebookUrl) || undefined,

        instagramHandle: safeTrim(normalized.instagramHandle) || undefined,
        twitterHandle: safeTrim(normalized.twitterHandle) || undefined,
        linkedinUrl: safeTrim(normalized.linkedinUrl) || undefined,
        tiktokHandle: safeTrim(normalized.tiktokHandle) || undefined,

        tags: buildTags(normalized),
        createdFrom: 'LIVE_FIELD',
      });

      // 2) Media capture (offline-first)
      if (safeTrim(normalized.profilePhotoDataUrl)) {
        await addContactMedia({
          contactId: contact.id,
          type: 'PROFILE_PHOTO',
          dataUrl: normalized.profilePhotoDataUrl,
          syncStatus: 'PENDING_SYNC',
        });
      }
      if (safeTrim(normalized.businessCardDataUrl)) {
        await addContactMedia({
          contactId: contact.id,
          type: 'BUSINESS_CARD',
          dataUrl: normalized.businessCardDataUrl,
          aiParsedData: {
            extractedFrom: 'scan-card',
          },
          syncStatus: 'PENDING_SYNC',
        });
      }
      if (safeTrim(normalized.contextPhotoDataUrl)) {
        await addContactMedia({
          contactId: contact.id,
          type: 'CONTEXT_IMAGE',
          dataUrl: normalized.contextPhotoDataUrl,
          syncStatus: 'PENDING_SYNC',
        });
      }

      // 3) Origin log (immutable payload)
      await addOrigin({
        contactId: contact.id,
        originType: 'LIVE_FIELD',
        notes: 'Captured via Live Contact Entry.',
        rawPayload: normalized as any,
      });

      // 4) Live follow-up row (offline-first)
      await addLiveFollowUp(
        buildLiveFollowUpRow(normalized, contact.id) as any
      );

      setSuccess('Saved locally. Syncing if online…');

      // 5) Best-effort sync queue
      await runSync();

      // 6) Reset for next contact (keep initials for speed)
      setForm((prev) => ({
        ...prev,
        fullName: '',
        phone: '',
        email: '',
        city: '',
        county: '',
        zip: '',
        precinct: '',
        congressionalDistrict: '',
        stateHouseDistrict: '',
        stateSenateDistrict: '',

        category: '',
        supportLevel: '',
        bestContactMethod: '',
        teamAssignments: [],

        metWhere: '',
        metWhereDetails: '',
        eventName: '',
        introducedBy: '',
        organization: '',

        topIssue: '',
        conversationNotes: '',

        facebookConnected: false,
        facebookProfileName: '',
        facebookHandle: '',
        facebookUrl: '',

        instagramHandle: '',
        twitterHandle: '',
        linkedinUrl: '',
        tiktokHandle: '',

        interestedVolunteer: false,
        interestedDonate: false,
        interestedHostEvent: false,
        interestedYardSign: false,
        interestedCountyLeader: false,
        interestedPrecinctCaptain: false,

        influenceScore: '',
        fundraisingPotential: '',
        volunteerPotential: '',

        tags: [],

        permissionToContact: false,
        followUpNeeded: true,
        followUpNotes: '',
        followUpTargetAt: '',

        profilePhotoDataUrl: '',
        businessCardDataUrl: '',
        contextPhotoDataUrl: '',
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
          subtitle="Field intelligence capture. Offline-first. Syncs when online."
        />
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-8">
            {error && <ErrorText>{error}</ErrorText>}
            {success && <div className="text-green-600 text-sm font-medium">{success}</div>}
            {syncing && <div className="text-indigo-600 text-sm font-medium">Syncing pending records…</div>}

            {/* Consent */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <input
                  id="permissionToContact"
                  type="checkbox"
                  checked={form.permissionToContact}
                  onChange={(e) => update('permissionToContact', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="permissionToContact">Permission to contact</Label>
                  <HelpText className="mt-1">
                    Required before saving. Verbal “yes” counts — we’re logging consent.
                  </HelpText>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="space-y-8">
                <ContactIdentitySection
                  form={form}
                  update={update}
                  emailValid={emailValid}
                />

                <ContactLocationSection form={form} update={update} />

                <CampaignCategorySection form={form} update={update} />

                <TeamAssignmentSection form={form} update={update} />

                <EngagementSignalsSection form={form} update={update} />
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Expanded intel</div>
                    <HelpText>Toggle to move fast in the field, then deepen later.</HelpText>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => setExpanded((v) => !v)}>
                    {expanded ? 'Hide' : 'Show'}
                  </Button>
                </div>

                <PhotoCaptureSection
                  form={form}
                  update={update}
                  onBusinessCardExtracted={applyBusinessCardExtracted}
                />

                {expanded ? (
                  <>
                    <MeetingContextSection form={form} update={update} />
                    <ConversationNotesSection form={form} update={update} />
                    <SocialProfilesSection form={form} update={update} />
                  </>
                ) : null}

                <FollowUpSection form={form} update={update} />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={runSync}>
                Retry Sync
              </Button>

              <Button type="submit" disabled={!readyToSave || submitting}>
                {submitting ? 'Saving…' : 'Save & Add Next'}
              </Button>

              <Button type="button" variant="secondary" onClick={() => nav('/live-contacts')}>
                Go to Follow-Ups
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
