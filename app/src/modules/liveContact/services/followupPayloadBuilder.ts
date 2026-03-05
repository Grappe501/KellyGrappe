import type { LiveContactForm } from '../types/LiveContactForm';
import { type LiveFollowUp } from '../../../shared/utils/db/contactsDb';
import { normalizePhone, safeTrim } from '../utils/contactFormHelpers';

export function buildLocationLabel(form: LiveContactForm) {
  const parts = [
    safeTrim(form.city),
    safeTrim(form.county) ? `${safeTrim(form.county)} County` : '',
    safeTrim(form.state) || 'AR',
  ].filter(Boolean);

  return parts.join(' • ');
}

export function buildLiveFollowUpRow(
  form: LiveContactForm,
  contactId: string
): Omit<LiveFollowUp, 'id' | 'createdAt'> {

  return {

    contactId,

    followUpStatus: form.followUpNeeded ? 'NEW' : 'COMPLETED',

    followUpNotes: safeTrim(form.followUpNotes) || undefined,

    followUpTargetAt: safeTrim(form.followUpTargetAt) || undefined,

    followUpCompletedAt: form.followUpNeeded
      ? undefined
      : new Date().toISOString(),

    archived: false,

    name: safeTrim(form.fullName) || undefined,

    phone: safeTrim(form.phone)
      ? normalizePhone(form.phone)
      : undefined,

    email: safeTrim(form.email).toLowerCase() || undefined,

    location: buildLocationLabel(form) || undefined,

    notes: safeTrim(form.conversationNotes) || undefined,

    source: 'LIVE_FIELD',

    permissionToContact: !!form.permissionToContact,

    entryInitials: safeTrim(form.entryInitials) || 'UNK',

    syncStatus: 'PENDING_SYNC',
  };
}

export function buildServerFollowUpPayload(row: any) {

  return {

    contact_id: row.contactId,

    status: row.followUpStatus,

    notes: row.followUpNotes ?? row.notes ?? null,

    archived: row.archived ?? false,

    completed_at: row.followUpCompletedAt ?? null,

    target_at: row.followUpTargetAt ?? null,

    name: row.name ?? null,

    phone: row.phone ?? null,

    email: row.email ?? null,

    location: row.location ?? null,

    source: row.source ?? 'LIVE_FIELD',

    permission_to_contact: row.permissionToContact ?? null,

    entry_initials: row.entryInitials ?? 'UNK',

    /* Additional campaign intelligence sent to server */

    facebook_profile_name: row.facebookProfileName ?? null,
    facebook_handle: row.facebookHandle ?? null,
    facebook_url: row.facebookUrl ?? null,

    instagram_handle: row.instagramHandle ?? null,
    twitter_handle: row.twitterHandle ?? null,
    linkedin_url: row.linkedinUrl ?? null,
    tiktok_handle: row.tiktokHandle ?? null,

    support_level: row.supportLevel ?? null,
    best_contact_method: row.bestContactMethod ?? null,

    team_assignments: row.teamAssignments ?? null,

    tags: row.tags ?? null,

    met_where: row.metWhere ?? null,
    met_where_details: row.metWhereDetails ?? null,

    introduced_by: row.introducedBy ?? null,
    affiliation: row.affiliation ?? null,
    event_name: row.eventName ?? null,

    top_issue: row.topIssue ?? null,
    conversation_notes: row.conversationNotes ?? null,

    precinct: row.precinct ?? null,
    congressional_district: row.congressionalDistrict ?? null,
    state_house_district: row.stateHouseDistrict ?? null,
    state_senate_district: row.stateSenateDistrict ?? null,
  };
}