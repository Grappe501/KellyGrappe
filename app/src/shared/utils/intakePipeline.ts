/* app/src/shared/utils/intakePipeline.ts
   Unified intake pipeline.

   Non-negotiable contract:
   Every intake source must:
   1) Upsert into ContactsDB (canonical contact record)
   2) Create an origin log (ContactOrigin)
   3) Create a follow-up row so it appears on /live-contacts
   4) Attempt to enqueue a server-side follow-up so the board is global
      (safe no-op until server endpoint is live)

   This file centralizes that behavior so modules don’t drift.
*/

import {
  addEventLead,
  addLiveFollowUp,
  addOrigin,
  replaceVolunteerInterests,
  upsertContact,
  upsertVolunteerProfile,
  type Contact,
  type OriginType,
  type VolunteerProfile,
} from './contactsDb';

function safeTrim(v: unknown): string {
  return (v ?? '').toString().trim();
}

function normalizePhone(raw: string): string {
  return safeTrim(raw).replace(/\D/g, '');
}

async function postJsonWithTimeout(
  url: string,
  body: unknown,
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
  } finally {
    window.clearTimeout(t);
  }
}

/**
 * Attempts to push the follow-up to a server-side queue (Supabase-backed),
 * so /live-contacts becomes global across devices.
 *
 * This is intentionally "best effort":
 * - If the endpoint doesn't exist yet, we do nothing.
 * - If it fails, the local follow-up still exists and UI still works.
 *
 * Next step in this thread: implement /.netlify/functions/followup-upsert
 * and a Supabase followups table, then /live-contacts loads from server.
 */
async function tryEnqueueServerFollowUp(payload: Record<string, unknown>) {
  try {
    const endpoint = '/.netlify/functions/followup-upsert';
    const res = await postJsonWithTimeout(endpoint, payload, 7000);

    // If the endpoint isn't deployed yet, Netlify will return 404.
    if (!res.ok) return;

    // We don’t require anything from the response yet.
    // Later we may read { serverFollowUpId } for linking.
    await res.json().catch(() => undefined);
  } catch {
    // best-effort only — never break intake
  }
}

export type IntakeContactInput = Partial<Contact> & {
  fullName?: string;
  email?: string;
  phone?: string;
};

export type IntakeFollowUpInput = {
  followUpNeeded?: boolean;
  followUpNotes?: string;
  sourceLabel?: string;
  location?: string;
  notes?: string;
  automationEligible?: boolean;
  permissionToContact?: boolean;

  facebookConnected?: boolean;
  facebookProfileName?: string;
  facebookHandle?: string;
};

export type IntakeVolunteerExtras = {
  profile?: VolunteerProfile;
  interests?: Array<{ teamKey: string; roleLabel: string }>;
};

export type IntakeEventLeadExtras = {
  eventLeadText?: string;
  parsedCounty?: string;
};

export type ProcessIntakeParams = {
  originType: OriginType;
  originRef?: string;
  originNotes?: string;
  rawPayload: Record<string, unknown>;

  contact: IntakeContactInput;
  followUp?: IntakeFollowUpInput;

  volunteer?: IntakeVolunteerExtras;
  eventLead?: IntakeEventLeadExtras;
};

export async function processIntake(params: ProcessIntakeParams): Promise<{
  contact: Contact;
  followUpId: string;
  originId: string;
}> {
  const email = safeTrim(params.contact.email).toLowerCase() || undefined;
  const phoneRaw = safeTrim(params.contact.phone);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : undefined;

  const contact = await upsertContact({
    ...params.contact,
    email,
    phone,
  });

  const origin = await addOrigin({
    contactId: contact.id,
    originType: params.originType,
    originRef: params.originRef,
    notes: params.originNotes,
    rawPayload: params.rawPayload ?? {},
  });

  // Optional: module-specific normalized objects
  if (params.volunteer?.profile) {
    await upsertVolunteerProfile({
      ...params.volunteer.profile,
      contactId: contact.id,
    });
  }

  if (params.volunteer?.interests?.length) {
    await replaceVolunteerInterests({
      contactId: contact.id,
      interests: params.volunteer.interests,
    });
  }

  if (safeTrim(params.eventLead?.eventLeadText)) {
    await addEventLead({
      contactId: contact.id,
      eventLeadText: safeTrim(params.eventLead?.eventLeadText),
      parsedCounty: safeTrim(params.eventLead?.parsedCounty) || undefined,
    });
  }

  const follow = params.followUp ?? {};
  const followUpNeeded =
    typeof follow.followUpNeeded === 'boolean' ? follow.followUpNeeded : true;

  const followUp = await addLiveFollowUp({
    contactId: contact.id,
    followUpStatus: followUpNeeded ? 'NEW' : 'COMPLETED',
    followUpNotes: safeTrim(follow.followUpNotes) || undefined,
    followUpCompletedAt: followUpNeeded ? null : new Date().toISOString(),
    archived: false,

    // list display
    name: contact.fullName,
    phone: contact.phone,
    email: contact.email,
    location: safeTrim(follow.location) || undefined,
    notes: safeTrim(follow.notes) || undefined,
    source: safeTrim(follow.sourceLabel) || undefined,
    automationEligible: !!follow.automationEligible,
    permissionToContact: !!follow.permissionToContact,

    facebookConnected:
      typeof follow.facebookConnected === 'boolean'
        ? follow.facebookConnected
        : contact.facebookConnected,
    facebookProfileName:
      safeTrim(follow.facebookProfileName) || contact.facebookProfileName,
    facebookHandle: safeTrim(follow.facebookHandle) || contact.facebookHandle,
  });

  // Best-effort: enqueue server-side follow-up (global board)
  // This will be fully activated once followup-upsert Netlify function is implemented.
  void tryEnqueueServerFollowUp({
    version: 1,
    originType: params.originType,
    originRef: params.originRef ?? null,
    originNotes: params.originNotes ?? null,
    originId: origin.id,
    followUpId: followUp.id,

    contact: {
      id: contact.id,
      fullName: contact.fullName ?? null,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      location: safeTrim(follow.location) || null,
    },

    followUp: {
      status: followUp.followUpStatus,
      notes: followUp.followUpNotes ?? null,
      source: followUp.source ?? null,
      automationEligible: !!followUp.automationEligible,
      permissionToContact: !!followUp.permissionToContact,
    },

    rawPayload: params.rawPayload ?? {},
    createdAt: new Date().toISOString(),
  });

  return { contact, followUpId: followUp.id, originId: origin.id };
}