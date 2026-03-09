import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import Container from "@components/Container"
import { Card, CardHeader, CardContent } from "@components/Card"
import { Button } from "@components/FormControls"

import type {
  BestContactMethod,
} from "@db/contactsDb.types"

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

import { upsertContact } from "@services/contacts.service"
import { addOrigin } from "@services/origins.service"
import { addLiveFollowUp } from "@services/followups.service"
import { addContactMedia } from "@services/media.service"

function safeTrim(v: unknown) {
  return (v ?? "").toString().trim()
}

function enumOrUndefined<T extends string>(v: T | "" | undefined): T | undefined {
  return v ? (v as T) : undefined
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

  async function onSubmit(e: React.FormEvent) {

    e.preventDefault()

    if (!speedReady || !readyToSave || !emailValid || submitting) return

    setSubmitting(true)
    setSubmitError(null)

    const normalized = normalizeBeforeSave(form)

    try {

      /* CONTACT UPSERT */

      const contact = await upsertContact({
        ...(normalized as any)
      })

      /* ORIGIN */

      await addOrigin({
        contactId: contact.id,
        originType: "LIVE_FIELD",
        rawPayload: {
          source: "live-contact",
          notes: "Field intake",
          form: normalized
        }
      })

      /* MEDIA */

      if (normalized.profilePhotoDataUrl)
        await addContactMedia({
          contactId: contact.id,
          type: "PROFILE_PHOTO",
          dataUrl: normalized.profilePhotoDataUrl
        })

      if (normalized.businessCardDataUrl)
        await addContactMedia({
          contactId: contact.id,
          type: "BUSINESS_CARD",
          dataUrl: normalized.businessCardDataUrl
        })

      if (normalized.contextPhotoDataUrl)
        await addContactMedia({
          contactId: contact.id,
          type: "CONTEXT_IMAGE",
          dataUrl: normalized.contextPhotoDataUrl
        })

      /* FOLLOW UP */

      const followUpStatus = normalized.followUpNeeded ? "NEW" : "COMPLETED"

      await addLiveFollowUp({

        contactId: contact.id,

        followUpStatus,

        followUpNotes: normalized.followUpNotes || undefined,

        followUpTargetAt:
          normalized.followUpTargetAt ||
          normalized.followUpDate ||
          undefined,

        followUpCompletedAt:
          followUpStatus === "COMPLETED"
            ? new Date().toISOString()
            : undefined,

        archived: false,

        name: normalized.fullName,
        phone: normalized.phone || undefined,
        email: normalized.email || undefined,

        location: [normalized.city, normalized.county]
          .filter(Boolean)
          .join(", ") || undefined,

        source: "LIVE_FIELD",

        permissionToContact: normalized.permissionToContact,

        entryInitials: normalized.entryInitials,
      })

      try {
        await syncPendingFollowUps()
      } catch {}

      setJustSaved(true)

      setForm({
        ...form,
        fullName: "",
        phone: "",
        email: ""
      })

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
              onBusinessCardExtracted={(data) => {
                if (!data) return
                if (data.fullName) update("fullName", data.fullName)
                if (data.email) update("email", data.email)
                if (data.phone) update("phone", data.phone)
              }}
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
                onClick={() => nav("/live-contacts")}
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