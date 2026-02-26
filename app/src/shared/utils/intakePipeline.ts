/* app/src/shared/utils/intakePipeline.ts
   Unified intake pipeline.

   Non-negotiable contract:
   Every intake source must:
   1) Upsert into ContactsDB (canonical contact record)
   2) Create an origin log (ContactOrigin)
   3) Create a follow-up row so it appears on /live-contacts

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

  return { contact, followUpId: followUp.id, originId: origin.id };
}
