import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import Container from "../../shared/components/Container"
import { Card, CardHeader, CardContent } from "../../shared/components/Card"
import { Button } from "../../shared/components/FormControls"

import type {
  BestContactMethod,
  ContactCategory,
  SupportLevel,
} from "../../shared/utils/contactsDb"

import type { LiveContactForm } from "./types/LiveContactForm"

import { ContactIdentitySection } from "./components/ContactIdentitySection"
import { ContactLocationSection } from "./components/ContactLocationSection"
import { MeetingContextSection } from "./components/MeetingContextSection"
import { SocialProfilesSection } from "./components/SocialProfilesSection"
import { CampaignCategorySection } from "./components/CampaignCategorySection"
import { TeamAssignmentSection } from "./components/TeamAssignmentSection"
import { EngagementSignalsSection } from "./components/EngagementSignalsSection"
import { ConversationNotesSection } from "./components/ConversationNotesSection"
import { FollowUpSection } from "./components/FollowUpSection"
import { PhotoCaptureSection } from "./components/PhotoCaptureSection"

import { useLiveContactForm } from "./hooks/useLiveContactForm"
import { syncPendingFollowUps } from "../../shared/utils/syncEngine"

import {
  addContactMedia,
  addLiveFollowUp,
  addOrigin,
  upsertContact,
} from "../../shared/utils/contactsDb"

function safeTrim(v: unknown) {
  return (v ?? "").toString().trim()
}

function splitCsv(raw?: string) {
  const v = safeTrim(raw)
  if (!v) return undefined

  const out = v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)

  return out.length ? Array.from(new Set(out)) : undefined
}

function numOrUndefined(v: number | "") {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

function enumOrUndefined<T extends string>(v: T | ""): T | undefined {
  return v ? (v as T) : undefined
}

function makeEmptyForm(
  keep?: Partial<Pick<LiveContactForm, "entryInitials" | "permissionToContact">>
): LiveContactForm {
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
  }
}

export default function LiveContactPage() {
  const nav = useNavigate()

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const { form, setForm, update, readyToSave, emailValid, normalizeBeforeSave } =
    useLiveContactForm()

  const speedReady = useMemo(() => {
    const hasInitials = safeTrim(form.entryInitials).length >= 2

    const hasIdentity =
      safeTrim(form.fullName) ||
      safeTrim(form.phone) ||
      safeTrim(form.email)

    return hasInitials && Boolean(hasIdentity)
  }, [form])

  useEffect(() => {
    if (!justSaved) return
    const t = setTimeout(() => setJustSaved(false), 1500)
    return () => clearTimeout(t)
  }, [justSaved])

  function onBusinessCardExtracted(data: any) {
    try {
      const next: Partial<LiveContactForm> = {}

      const fullName =
        safeTrim(data?.fullName) ||
        safeTrim(data?.name)

      const email = safeTrim(data?.email)
      const phone = safeTrim(data?.phone)

      const organization =
        safeTrim(data?.organization) ||
        safeTrim(data?.company)

      if (fullName) next.fullName = fullName
      if (email) next.email = email
      if (phone) next.phone = phone
      if (organization) next.organization = organization

      Object.entries(next).forEach(([k, v]) => {
        update(k as keyof LiveContactForm, v as any)
      })
    } catch {}
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!speedReady || !readyToSave || !emailValid || submitting) return

    setSubmitting(true)
    setSubmitError(null)

    const normalized = normalizeBeforeSave(form)

    try {
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

        category: enumOrUndefined<ContactCategory>(normalized.category),
        supportLevel: enumOrUndefined<SupportLevel>(normalized.supportLevel),
        bestContactMethod: enumOrUndefined<BestContactMethod>(normalized.bestContactMethod),

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

        influenceScore: numOrUndefined(normalized.influenceScore),
        fundraisingPotential: numOrUndefined(normalized.fundraisingPotential),
        volunteerPotential: numOrUndefined(normalized.volunteerPotential),

        facebookConnected: normalized.facebookConnected,
        facebookProfileName: normalized.facebookProfileName,
        facebookHandle: normalized.facebookHandle,
        facebookUrl: normalized.facebookUrl,

        instagramHandle: normalized.instagramHandle,
        twitterHandle: normalized.twitterHandle,
        linkedinUrl: normalized.linkedinUrl,
        tiktokHandle: normalized.tiktokHandle,

        createdFrom: "LIVE_FIELD",
      })

      await addOrigin({
        contactId: contact.id,
        originType: "LIVE_FIELD",
        originRef: "live-contact",
        notes: "Field intake",
        rawPayload: { form: normalized },
      })

      if (normalized.profilePhotoDataUrl)
        await addContactMedia({
          contactId: contact.id,
          type: "PROFILE_PHOTO",
          dataUrl: normalized.profilePhotoDataUrl,
        })

      if (normalized.businessCardDataUrl)
        await addContactMedia({
          contactId: contact.id,
          type: "BUSINESS_CARD",
          dataUrl: normalized.businessCardDataUrl,
        })

      if (normalized.contextPhotoDataUrl)
        await addContactMedia({
          contactId: contact.id,
          type: "CONTEXT_IMAGE",
          dataUrl: normalized.contextPhotoDataUrl,
        })

      const followUpStatus = normalized.followUpNeeded ? "NEW" : "COMPLETED"

      await addLiveFollowUp({
        contactId: contact.id,
        followUpStatus,
        followUpNotes: normalized.followUpNotes,
        followUpTargetAt: normalized.followUpDate || undefined,
        followUpCompletedAt:
          followUpStatus === "COMPLETED"
            ? new Date().toISOString()
            : null,

        archived: false,

        name: normalized.fullName,
        phone: normalized.phone,
        email: normalized.email,

        location: [normalized.city, normalized.county]
          .filter(Boolean)
          .join(", "),

        source: "LIVE_FIELD",
        automationEligible: normalized.automationEligible,
        permissionToContact: normalized.permissionToContact,

        entryInitials: normalized.entryInitials,

        contactCategory: enumOrUndefined<ContactCategory>(normalized.category),
        supportLevel: enumOrUndefined<SupportLevel>(normalized.supportLevel),
        bestContactMethod: enumOrUndefined<BestContactMethod>(normalized.bestContactMethod),
      })

      try {
        await syncPendingFollowUps()
      } catch {}

      setJustSaved(true)

      setForm(
        makeEmptyForm({
          entryInitials: normalized.entryInitials,
          permissionToContact: normalized.permissionToContact,
        })
      )
    } catch (err: any) {
      setSubmitError(err?.message ?? "Save failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Live Contact Entry"
          subtitle="Offline-first canvassing tool"
        />

        <CardContent className="space-y-6">

          {submitError && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">
              {submitError}
            </div>
          )}

          {justSaved && (
            <div className="rounded border border-green-200 bg-green-50 p-3 text-sm">
              Saved locally
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">

            <ContactIdentitySection form={form} update={update} emailValid={emailValid}/>
            <ContactLocationSection form={form} update={update}/>
            <MeetingContextSection form={form} update={update}/>

            <CampaignCategorySection form={form} update={update}/>
            <TeamAssignmentSection form={form} update={update}/>
            <EngagementSignalsSection form={form} update={update}/>

            <SocialProfilesSection form={form} update={update}/>
            <ConversationNotesSection form={form} update={update}/>
            <FollowUpSection form={form} update={update}/>

            <PhotoCaptureSection
              form={form}
              update={update}
              onBusinessCardExtracted={onBusinessCardExtracted}
            />

            <div className="flex justify-end gap-3">

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
                Follow Ups
              </Button>

            </div>
          </form>
        </CardContent>
      </Card>
    </Container>
  )
}