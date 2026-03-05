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

import { upsertContact, type Contact } from "./db/services/contacts.service";
import { addLiveFollowUp } from "./db/services/followups.service";

/* --------------------------------- UTILS -------------------------------- */

function safeTrim(v: unknown): string {
  return (v ?? "").toString().trim();
}

function normalizePhone(raw: string): string {
  return safeTrim(raw).replace(/\D/g, "");
}

function nowIso(): string {
  return new Date().toISOString();
}

async function postJsonWithTimeout(
  url: string,
  body: unknown,
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const t = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
  } finally {
    globalThis.clearTimeout(t);
  }
}

/**
 * Attempts to push the follow-up to a server-side queue (Supabase-backed),
 * so /live-contacts becomes global across devices.
 *
 * Best effort only:
 * - If endpoint isn't deployed yet (404), do nothing.
 * - If it fails, local follow-up still exists and UI still works.
 */
async function tryEnqueueServerFollowUp(payload: Record<string, unknown>) {
  try {
    const endpoint = "/.netlify/functions/followup-upsert";
    const res = await postJsonWithTimeout(endpoint, payload, 7000);
    if (!res.ok) return;
    await res.json().catch(() => undefined);
  } catch {
    // best-effort only — never break intake
  }
}

/* ------------------------------ BEST-EFFORT STUBS ------------------------------ */
/**
 * These are intentionally build-safe no-ops for now.
 * Wire them to real services later (origins.service, volunteers.service, events.service)
 * without changing module imports.
 */

export type OriginType = string;

export type VolunteerProfile = Record<string, unknown>;

async function addOrigin(_input: {
  contactId: string;
  originType: OriginType;
  originRef?: string;
  notes?: string;
  rawPayload?: unknown;
  capturedAt?: string;
}): Promise<{ id: string }> {
  // TODO: replace with real origins service when available
  return { id: `origin_${Date.now()}` };
}

async function upsertVolunteerProfile(_input: VolunteerProfile & { contactId: string }): Promise<void> {
  // TODO: replace with real volunteers service when available
}

async function replaceVolunteerInterests(_input: {
  contactId: string;
  interests: Array<{ teamKey: string; roleLabel: string }>;
}): Promise<void> {
  // TODO: replace with real volunteers service when available
}

async function addEventLead(_input: {
  contactId: string;
  eventLeadText: string;
  parsedCounty?: string;
}): Promise<void> {
  // TODO: replace with real events service when available
}

/* --------------------------------- TYPES -------------------------------- */

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

  // NOTE: intentionally removed fields that are not in LiveFollowUp type:
  // - automationEligible
  // - permissionToContact
  // - facebook* fields
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

/* --------------------------------- API ---------------------------------- */

export async function processIntake(params: ProcessIntakeParams): Promise<{
  contact: Contact;
  followUpId: string;
  originId: string;
}> {
  // Normalize identity
  const email = safeTrim(params.contact.email).toLowerCase() || undefined;
  const phoneRaw = safeTrim(params.contact.phone);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : undefined;

  // 1) Canonical Contact
  const contact = await upsertContact({
    ...params.contact,
    email,
    phone,
  });

  // 2) Origin log (best-effort stub for now)
  const origin = await addOrigin({
    contactId: contact.id,
    originType: params.originType,
    originRef: params.originRef,
    notes: params.originNotes,
    rawPayload: params.rawPayload ?? {},
    capturedAt: nowIso(),
  });

  // Optional: module-specific normalized objects (best-effort stubs for now)
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

  // 3) Local follow-up row (must exist no matter what)
  const follow = params.followUp ?? {};
  const followUpNeeded =
    typeof follow.followUpNeeded === "boolean" ? follow.followUpNeeded : true;

  const followUp = await addLiveFollowUp({
    contactId: contact.id,
    followUpStatus: followUpNeeded ? "NEW" : "COMPLETED",
    followUpNotes: safeTrim(follow.followUpNotes) || undefined,
    followUpCompletedAt: followUpNeeded ? undefined : nowIso(),
    archived: false,

    // list display snapshot
    name: contact.fullName,
    phone: contact.phone,
    email: contact.email,
    location: safeTrim(follow.location) || undefined,
    notes: safeTrim(follow.notes) || undefined,
    source: safeTrim(follow.sourceLabel) || undefined,
  });

  // 4) Best-effort server enqueue (global board)
  void tryEnqueueServerFollowUp({
    version: 1,
    originType: params.originType,
    originId: origin.id,
    followUpId: followUp.id,

    contact: {
      id: contact.id,
      fullName: contact.fullName,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      location: safeTrim(follow.location) || null,
    },

    followUp: {
      status: followUp.followUpStatus,
      notes: followUp.followUpNotes ?? null,
      source: followUp.source ?? null,
    },

    rawPayload: params.rawPayload ?? {},
    createdAt: nowIso(),
  });

  return { contact, followUpId: followUp.id, originId: origin.id };
}