import { useMemo, useState } from 'react';
import type { LiveContactForm } from '../types/LiveContactForm';
import { clampInitials, isEmailLike, normalizePhone, safeTrim, uniqTags } from '../utils/contactFormHelpers';

export function defaultLiveContactForm(): LiveContactForm {
  return {
    entryInitials: '',
    fullName: '',
    phone: '',
    email: '',

    city: '',
    county: '',
    state: 'AR',
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
  };
}

export function useLiveContactForm() {
  const [form, setForm] = useState<LiveContactForm>(defaultLiveContactForm());

  function update<K extends keyof LiveContactForm>(key: K, value: LiveContactForm[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  const emailValid = useMemo(() => isEmailLike(form.email), [form.email]);

  const readyToSave = useMemo(() => {
    const hasContactMethod = !!safeTrim(form.phone) || !!safeTrim(form.email);
    return form.entryInitials.length === 3 && !!safeTrim(form.fullName) && hasContactMethod && form.permissionToContact;
  }, [form]);

  function normalizeBeforeSave(next: LiveContactForm): LiveContactForm {
    return {
      ...next,
      entryInitials: clampInitials(next.entryInitials),
      email: safeTrim(next.email).toLowerCase(),
      phone: safeTrim(next.phone) ? normalizePhone(next.phone) : '',
      tags: uniqTags(next.tags || []),
      city: safeTrim(next.city),
      county: safeTrim(next.county),
      zip: safeTrim(next.zip),
      precinct: safeTrim(next.precinct),
      congressionalDistrict: safeTrim(next.congressionalDistrict),
      stateHouseDistrict: safeTrim(next.stateHouseDistrict),
      stateSenateDistrict: safeTrim(next.stateSenateDistrict),
    };
  }

  return { form, setForm, update, readyToSave, emailValid, normalizeBeforeSave };
}
