import type { LiveContactForm } from '../types/LiveContactForm';
import { parseCityCounty, type LiveFollowUp } from '../../../shared/utils/contactsDb';
import { normalizePhone, safeTrim, uniqTags } from '../utils/contactFormHelpers';

export function buildLocationLabel(form: LiveContactForm) {
  const parts = [
    safeTrim(form.city),
    safeTrim(form.county) ? `${safeTrim(form.county)} County` : '',
    safeTrim(form.state) || 'AR',
    safeTrim(form.precinct) ? `Precinct ${safeTrim(form.precinct)}` : '',
    safeTrim(form.congressionalDistrict) ? `CD ${safeTrim(form.congressionalDistrict)}` : '',
    safeTrim(form.stateHouseDistrict) ? `HD ${safeTrim(form.stateHouseDistrict)}` : '',
    safeTrim(form.stateSenateDistrict) ? `SD ${safeTrim(form.stateSenateDistrict)}` : '',
  ].filter(Boolean);

  return parts.join(' • ');
}

export function buildTags(form: LiveContactForm): string[] {
  const auto: string[] = [];
  if (form.category) auto.push(String(form.category));
  if (form.supportLevel) auto.push(String(form.supportLevel));
  if (form.teamAssignments?.length) auto.push(...form.teamAssignments.map(String));
  return uniqTags([...(form.tags || []), ...auto]);
}

export function buildLiveFollowUpRow(form: LiveContactForm, contactId: string): Omit<LiveFollowUp, 'id' | 'createdAt'> {
  const tags = buildTags(form);

  return {
    contactId,
    followUpStatus: form.followUpNeeded ? 'NEW' : 'COMPLETED',
    followUpNotes: safeTrim(form.followUpNotes) || undefined,
    followUpTargetAt: safeTrim(form.followUpTargetAt) || undefined,
    followUpCompletedAt: form.followUpNeeded ? null : new Date().toISOString(),
    archived: false,

    name: safeTrim(form.fullName) || undefined,
    phone: safeTrim(form.phone) ? normalizePhone(form.phone) : undefined,
    email: safeTrim(form.email).toLowerCase() || undefined,
    location: buildLocationLabel(form) || undefined,
    notes: safeTrim(form.conversationNotes) || undefined,

    source: 'LIVE_FIELD',
    permissionToContact: !!form.permissionToContact,
    automationEligible: true,

    // Social
    facebookConnected: !!form.facebookConnected,
    facebookProfileName: safeTrim(form.facebookProfileName) || undefined,
    facebookHandle: safeTrim(form.facebookHandle) || undefined,
    facebookUrl: safeTrim(form.facebookUrl) || undefined,

    instagramHandle: safeTrim(form.instagramHandle) || undefined,
    twitterHandle: safeTrim(form.twitterHandle) || undefined,
    linkedinUrl: safeTrim(form.linkedinUrl) || undefined,
    tiktokHandle: safeTrim(form.tiktokHandle) || undefined,

    entryInitials: safeTrim(form.entryInitials) || 'UNK',

    // campaign intelligence
    contactCategory: form.category || undefined,
    supportLevel: form.supportLevel || undefined,
    bestContactMethod: form.bestContactMethod || undefined,
    teamAssignments: form.teamAssignments?.length ? form.teamAssignments : undefined,
    tags,

    metWhere: safeTrim(form.metWhere) || undefined,
    metWhereDetails: safeTrim(form.metWhereDetails) || undefined,
    introducedBy: safeTrim(form.introducedBy) || undefined,
    affiliation: safeTrim(form.organization) || undefined,
    eventName: safeTrim(form.eventName) || undefined,

    topIssue: safeTrim(form.topIssue) || undefined,
    conversationNotes: safeTrim(form.conversationNotes) || undefined,

    precinct: safeTrim(form.precinct) || undefined,
    congressionalDistrict: safeTrim(form.congressionalDistrict) || undefined,
    stateHouseDistrict: safeTrim(form.stateHouseDistrict) || undefined,
    stateSenateDistrict: safeTrim(form.stateSenateDistrict) || undefined,

    interestedVolunteer: !!form.interestedVolunteer,
    interestedDonate: !!form.interestedDonate,
    interestedHostEvent: !!form.interestedHostEvent,
    interestedYardSign: !!form.interestedYardSign,
    interestedCountyLeader: !!form.interestedCountyLeader,
    interestedPrecinctCaptain: !!form.interestedPrecinctCaptain,

    influenceScore: typeof form.influenceScore === 'number' ? form.influenceScore : undefined,
    fundraisingPotential: typeof form.fundraisingPotential === 'number' ? form.fundraisingPotential : undefined,
    volunteerPotential: typeof form.volunteerPotential === 'number' ? form.volunteerPotential : undefined,

    syncStatus: 'PENDING_SYNC',
  };
}

export function buildServerFollowUpPayload(row: any) {
  // Server expects the same payload shape used by followups-create.ts in this repo
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

    // socials
    facebook_connected: row.facebookConnected ?? null,
    facebook_profile_name: row.facebookProfileName ?? null,
    facebook_handle: row.facebookHandle ?? null,
    facebook_url: row.facebookUrl ?? null,
    instagram_handle: row.instagramHandle ?? null,
    twitter_handle: row.twitterHandle ?? null,
    linkedin_url: row.linkedinUrl ?? null,
    tiktok_handle: row.tiktokHandle ?? null,

    // campaign intelligence
    contact_category: row.contactCategory ?? null,
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
