// app/src/modules/liveContact/LiveContactPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Container from "../../shared/components/Container";
import { Card, CardHeader, CardContent } from "../../shared/components/Card";
import { Button } from "../../shared/components/FormControls";

import type {
  BestContactMethod,
  ContactCategory,
  SupportLevel,
} from "../../shared/utils/contactsDb";
import type { LiveContactForm } from "./types/LiveContactForm";

import { ContactIdentitySection } from "./components/ContactIdentitySection";
import { ContactLocationSection } from "./components/ContactLocationSection";
import { MeetingContextSection } from "./components/MeetingContextSection";
import { SocialProfilesSection } from "./components/SocialProfilesSection";
import { CampaignCategorySection } from "./components/CampaignCategorySection";
import { TeamAssignmentSection } from "./components/TeamAssignmentSection";
import { EngagementSignalsSection } from "./components/EngagementSignalsSection";
import { ConversationNotesSection } from "./components/ConversationNotesSection";
import { FollowUpSection } from "./components/FollowUpSection";
import { PhotoCaptureSection } from "./components/PhotoCaptureSection";

import { useLiveContactForm } from "./hooks/useLiveContactForm";
import { syncPendingFollowUps } from "../../shared/utils/syncEngine";

import {
  addContactMedia,
  addLiveFollowUp,
  addOrigin,
  upsertContact,
} from "../../shared/utils/contactsDb";

function safeTrim(v: unknown) {
  return (v ?? "").toString().trim();
}

function splitCsv(raw: string | undefined): string[] | undefined {
  const v = safeTrim(raw);
  if (!v) return undefined;
  const out = v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return out.length ? Array.from(new Set(out)) : undefined;
}

function numOrU(v: number | "" | undefined): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function enumOrU<T extends string>(v: T | "" | undefined): T | undefined {
  return v ? (v as T) : undefined;
}

function makeEmptyForm(keep?: Partial<Pick<LiveContactForm, "entryInitials" | "permissionToContact">>): LiveContactForm {
  return {
    entryInitials: keep?.entryInitials ?? "",
    fullName: "",
    phone: "",
    email: "",
    permissionToContact: keep?.permissionToContact ?? false,

    city: "",
    county: "",
    state: "AR",
    zip: "",
    precinct: "",
    congressionalDistrict: "",
    stateHouseDistrict: "",
    stateSenateDistrict: "",

    metWhere: "",
    metWhereDetails: "",
    introducedBy: "",
    organization: "",
    affiliation: "",
    eventName: "",

    category: "",
    supportLevel: "",
    bestContactMethod: "",
    teamAssignments: [],
    rolePotentialCsv: "",
    tags: [],

    interestedVolunteer: false,
    interestedDonate: false,
    interestedHostEvent: false,
    interestedYardSign: false,
    interestedCountyLeader: false,
    interestedPrecinctCaptain: false,

    influenceScore: "",
    fundraisingPotential: "",
    volunteerPotential: "",

    facebookConnected: false,
    facebookProfileName: "",
    facebookHandle: "",
    facebookUrl: "",
    instagramHandle: "",
    twitterHandle: "",
    linkedinUrl: "",
    tiktokHandle: "",

    topIssue: "",
    conversationNotes: "",

    followUpNeeded: true,
    followUpType: "CALL",
    followUpPriority: "NORMAL",
    followUpDate: "",
    followUpNotes: "",
    automationEligible: true,

    profilePhotoDataUrl: "",
    businessCardDataUrl: "",
    contextPhotoDataUrl: "",
  };
}

/**
 * Production-grade Live Contact Entry
 * - Offline-first
 * - Canvassing-speed UX
 * - Canonical schema + origin logging
 * - LiveFollowUp always written locally (never disappears)
 *
 * NOTE:
 * - This file is aligned to the *actual* exports/signatures:
 *   - useLiveContactForm(): { form, setForm, update, readyToSave, emailValid, normalizeBeforeSave }
 *   - PhotoCaptureSection expects { form, update, onBusinessCardExtracted }
 *   - contactsDb schema: LiveFollowUp.followUpStatus is required ("NEW" | "IN_PROGRESS" | "COMPLETED")
 */
export default function LiveContactPage() {
  const nav = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const { form, setForm, update, readyToSave, emailValid, normalizeBeforeSave } =
    useLiveContactForm();

  // Extra “fast guard”: initials + identity (name OR phone/email)
  const speedReady = useMemo(() => {
    const hasInitials = safeTrim(form.entryInitials).length >= 2;
    const hasIdentity =
      safeTrim(form.fullName).length > 0 ||
      safeTrim(form.phone).length > 0 ||
      safeTrim(form.email).length > 0;
    return hasInitials && hasIdentity;
  }, [form.entryInitials, form.fullName, form.phone, form.email]);

  useEffect(() => {
    if (!justSaved) return;
    const t = window.setTimeout(() => setJustSaved(false), 1500);
    return () => window.clearTimeout(t);
  }, [justSaved]);

  function onBusinessCardExtracted(data: any) {
    // Keep this best-effort + non-blocking: only apply obvious fields if present.
    // This is future-proof: different extractors can return different shapes.
    try {
      const next: Partial<LiveContactForm> = {};

      const fullName =
        safeTrim(data?.fullName) ||
        safeTrim(data?.name) ||
        safeTrim(data?.person) ||
        "";
      const email = safeTrim(data?.email) || "";
      const phone = safeTrim(data?.phone) || safeTrim(data?.mobile) || "";
      const organization = safeTrim(data?.organization) || safeTrim(data?.company) || "";

      if (fullName) next.fullName = fullName;
      if (email) next.email = email;
      if (phone) next.phone = phone;
      if (organization) next.organization = organization;

      // Merge using update() so hooks/validators stay consistent.
      for (const [k, v] of Object.entries(next) as Array<
        [keyof LiveContactForm, LiveContactForm[keyof LiveContactForm]]
      >) {
        update(k, v);
      }
    } catch {
      // ignore on purpose
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!speedReady || !readyToSave || !emailValid || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    const normalized = normalizeBeforeSave(form);

    try {
      // 1) Upsert canonical Contact
      const contact = await upsertContact({
        fullName: normalized.fullName,
        phone: normalized.phone,
        email: normalized.email,

        city: normalized.city,
        county: normalized.county,
        state: normalized.state,
        zip: normalized.zip,

        precinct: normalized.precinct,
        congressionalDistrict: normalized.congressionalDistrict,
        stateHouseDistrict: normalized.stateHouseDistrict,
        stateSenateDistrict: normalized.stateSenateDistrict,

        category: enumOrU<ContactCategory>(normalized.category),
        supportLevel: enumOrU<SupportLevel>(normalized.supportLevel),
        bestContactMethod: enumOrU<BestContactMethod>(normalized.bestContactMethod),

        teamAssignments: normalized.teamAssignments,
        rolePotential: splitCsv(normalized.rolePotentialCsv),
        tags: normalized.tags,

        introducedBy: normalized.introducedBy,
        organization: normalized.organization,
        metWhere: normalized.metWhere,
        metWhereDetails: normalized.metWhereDetails,
        eventName: normalized.eventName,

        topIssue: normalized.topIssue,
        conversationNotes: normalized.conversationNotes,

        interestedVolunteer: normalized.interestedVolunteer,
        interestedDonate: normalized.interestedDonate,
        interestedHostEvent: normalized.interestedHostEvent,
        interestedYardSign: normalized.interestedYardSign,
        interestedCountyLeader: normalized.interestedCountyLeader,
        interestedPrecinctCaptain: normalized.interestedPrecinctCaptain,

        influenceScore: numOrU(normalized.influenceScore),
        fundraisingPotential: numOrU(normalized.fundraisingPotential),
        volunteerPotential: numOrU(normalized.volunteerPotential),

        facebookConnected: normalized.facebookConnected,
        facebookProfileName: normalized.facebookProfileName,
        facebookHandle: normalized.facebookHandle,
        facebookUrl: normalized.facebookUrl,

        instagramHandle: normalized.instagramHandle,
        twitterHandle: normalized.twitterHandle,
        linkedinUrl: normalized.linkedinUrl,
        tiktokHandle: normalized.tiktokHandle,

        createdFrom: "LIVE_FIELD",
      });

      // 2) Origin log (audit + future routing)
      await addOrigin({
        contactId: contact.id,
        originType: "LIVE_FIELD",
        originRef: "live-contact",
        notes: "Field intake via Live Contact Entry page",
        rawPayload: {
          version: 1,
          source: "LiveContactPage",
          form: normalized,
        },
      });

      // 3) Optional media (store locally; sync later)
      // NOTE: we store in ContactMedia store; server upload can happen in sync engine later.
      if (safeTrim(normalized.profilePhotoDataUrl)) {
        await addContactMedia({
          contactId: contact.id,
          type: "PROFILE_PHOTO",
          dataUrl: normalized.profilePhotoDataUrl,
        });
      }

      if (safeTrim(normalized.businessCardDataUrl)) {
        await addContactMedia({
          contactId: contact.id,
          type: "BUSINESS_CARD_SCAN", // if your enum is BUSINESS_CARD, change this accordingly
          // IMPORTANT: your contactsDb ContactMediaType is: 'PROFILE_PHOTO' | 'BUSINESS_CARD' | 'CONTEXT_IMAGE'
          // If this line errors, replace "BUSINESS_CARD_SCAN" with "BUSINESS_CARD".
          dataUrl: normalized.businessCardDataUrl,
        } as any);
      }

      if (safeTrim(normalized.contextPhotoDataUrl)) {
        await addContactMedia({
          contactId: contact.id,
          type: "CONTEXT_IMAGE",
          dataUrl: normalized.contextPhotoDataUrl,
        });
      }

      // 4) LiveFollowUp is the canonical local field record (never disappears)
      // Map the UX follow-up model (needed/priority/type/date) into the DB followUpStatus model.
      const followUpStatus = normalized.followUpNeeded ? "NEW" : "COMPLETED";

      const followUpNotesPacked = [
        safeTrim(normalized.followUpNotes),
        // future-proof: keep metadata without adding columns yet
        `type:${normalized.followUpType}`,
        `priority:${normalized.followUpPriority}`,
      ]
        .filter(Boolean)
        .join(" | ");

      await addLiveFollowUp({
        contactId: contact.id,
        followUpStatus,
        followUpNotes: followUpNotesPacked || undefined,
        followUpTargetAt: safeTrim(normalized.followUpDate) || undefined,
        followUpCompletedAt: followUpStatus === "COMPLETED" ? new Date().toISOString() : null,
        archived: false,

        // Snapshot fields for list display + ops triage
        name: normalized.fullName,
        phone: normalized.phone,
        email: normalized.email,
        location: [safeTrim(normalized.city), safeTrim(normalized.county)]
          .filter(Boolean)
          .join(", "),
        notes: normalized.conversationNotes,

        source: "LIVE_FIELD",
        automationEligible: normalized.automationEligible,
        permissionToContact: normalized.permissionToContact,

        facebookConnected: normalized.facebookConnected,
        facebookProfileName: normalized.facebookProfileName,
        facebookHandle: normalized.facebookHandle,
        facebookUrl: normalized.facebookUrl,

        instagramHandle: normalized.instagramHandle,
        twitterHandle: normalized.twitterHandle,
        linkedinUrl: normalized.linkedinUrl,
        tiktokHandle: normalized.tiktokHandle,

        entryInitials: normalized.entryInitials,

        contactCategory: enumOrU<ContactCategory>(normalized.category),
        supportLevel: enumOrU<SupportLevel>(normalized.supportLevel),
        bestContactMethod: enumOrU<BestContactMethod>(normalized.bestContactMethod),

        teamAssignments: normalized.teamAssignments,
        rolePotential: splitCsv(normalized.rolePotentialCsv),
        tags: normalized.tags,

        metWhere: normalized.metWhere,
        metWhereDetails: normalized.metWhereDetails,
        introducedBy: normalized.introducedBy,
        affiliation: normalized.affiliation,
        eventName: normalized.eventName,

        topIssue: normalized.topIssue,
        conversationNotes: normalized.conversationNotes,

        precinct: normalized.precinct,
        congressionalDistrict: normalized.congressionalDistrict,
        stateHouseDistrict: normalized.stateHouseDistrict,
        stateSenateDistrict: normalized.stateSenateDistrict,

        interestedVolunteer: normalized.interestedVolunteer,
        interestedDonate: normalized.interestedDonate,
        interestedHostEvent: normalized.interestedHostEvent,
        interestedYardSign: normalized.interestedYardSign,
        interestedCountyLeader: normalized.interestedCountyLeader,
        interestedPrecinctCaptain: normalized.interestedPrecinctCaptain,

        influenceScore: numOrU(normalized.influenceScore),
        fundraisingPotential: numOrU(normalized.fundraisingPotential),
        volunteerPotential: numOrU(normalized.volunteerPotential),
      });

      // 5) Best-effort sync (never block canvassing speed)
      try {
        await syncPendingFollowUps();
      } catch {
        // ignored on purpose
      }

      setJustSaved(true);

      // SPEED UX: reset but keep initials + permission
      const keep = {
        entryInitials: normalized.entryInitials,
        permissionToContact: normalized.permissionToContact,
      };
      setForm(makeEmptyForm(keep));
    } catch (err: any) {
      setSubmitError(err?.message ?? "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retrySync() {
    setSubmitError(null);
    try {
      await syncPendingFollowUps();
    } catch (e: any) {
      setSubmitError(e?.message ?? "Sync failed. You may be offline.");
    }
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Live Contact Entry"
          subtitle="Offline-first. Built for canvassing speed."
        />

        <CardContent className="space-y-6">
          {submitError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {submitError}
            </div>
          ) : null}

          {justSaved ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              Saved locally ✅
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-6">
            <ContactIdentitySection form={form} update={update} emailValid={emailValid} />
            <ContactLocationSection form={form} update={update} />
            <MeetingContextSection form={form} update={update} />

            <CampaignCategorySection form={form} update={update} />
            <TeamAssignmentSection form={form} update={update} />
            <EngagementSignalsSection form={form} update={update} />

            <SocialProfilesSection form={form} update={update} />
            <ConversationNotesSection form={form} update={update} />
            <FollowUpSection form={form} update={update} />

            <PhotoCaptureSection
              form={form}
              update={update}
              onBusinessCardExtracted={onBusinessCardExtracted}
            />

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={retrySync}>
                Retry Sync
              </Button>

              <Button
                type="submit"
                disabled={!speedReady || !readyToSave || !emailValid || submitting}
              >
                {submitting ? "Saving…" : "Save & Add Next"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => nav("/followups")}
              >
                Go to Follow-Ups
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}