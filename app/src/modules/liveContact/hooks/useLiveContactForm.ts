import { useMemo, useState, useCallback } from "react";
import type { LiveContactForm } from "../types/LiveContactForm";

import {
  clampInitials,
  isEmailLike,
  normalizePhone,
  safeTrim,
  uniqTags,
} from "../utils/contactFormHelpers";

/**
 * Canonical default state for the Live Contact form.
 * Kept separate so reset() can reuse it.
 */
export function defaultLiveContactForm(): LiveContactForm {
  return {
    entryInitials: "",
    fullName: "",
    phone: "",
    email: "",

    city: "",
    county: "",
    state: "AR",
    zip: "",

    precinct: "",
    congressionalDistrict: "",
    stateHouseDistrict: "",
    stateSenateDistrict: "",

    category: "",
    supportLevel: "",
    bestContactMethod: "",
    teamAssignments: [],

    metWhere: "",
    metWhereDetails: "",
    eventName: "",
    introducedBy: "",
    organization: "",

    topIssue: "",
    conversationNotes: "",

    facebookConnected: false,
    facebookProfileName: "",
    facebookHandle: "",
    facebookUrl: "",

    instagramHandle: "",
    twitterHandle: "",
    linkedinUrl: "",
    tiktokHandle: "",

    interestedVolunteer: false,
    interestedDonate: false,
    interestedHostEvent: false,
    interestedYardSign: false,
    interestedCountyLeader: false,
    interestedPrecinctCaptain: false,

    influenceScore: "",
    fundraisingPotential: "",
    volunteerPotential: "",

    tags: [],

    permissionToContact: false,
    followUpNeeded: true,
    followUpNotes: "",
    followUpTargetAt: "",

    profilePhotoDataUrl: "",
    businessCardDataUrl: "",
    contextPhotoDataUrl: "",
  };
}

/**
 * Hook controlling the Live Contact intake form.
 * Optimized for:
 * - fast canvassing entry
 * - offline-first workflows
 * - future CRM expansion
 */
export function useLiveContactForm() {
  const [form, setForm] = useState<LiveContactForm>(defaultLiveContactForm());

  /**
   * Update a single field
   */
  const update = useCallback(
    <K extends keyof LiveContactForm>(key: K, value: LiveContactForm[K]) => {
      setForm((prev) => {
        if (prev[key] === value) return prev;
        return { ...prev, [key]: value };
      });
    },
    []
  );

  /**
   * Batch update multiple fields
   * Useful for business-card extraction or bulk updates.
   */
  const updateMany = useCallback(
    (values: Partial<LiveContactForm>) => {
      setForm((prev) => ({ ...prev, ...values }));
    },
    []
  );

  /**
   * Reset the form
   * Optionally preserve key fields (like initials).
   */
  const reset = useCallback(
    (preserve?: Partial<Pick<LiveContactForm, "entryInitials" | "permissionToContact">>) => {
      setForm({
        ...defaultLiveContactForm(),
        ...preserve,
      });
    },
    []
  );

  /**
   * Email validation
   */
  const emailValid = useMemo(() => {
    if (!form.email) return true;
    return isEmailLike(form.email);
  }, [form.email]);

  /**
   * Fast readiness check for canvassing UX
   */
  const readyToSave = useMemo(() => {
    const hasIdentity = !!safeTrim(form.fullName);
    const hasContactMethod =
      !!safeTrim(form.phone) || !!safeTrim(form.email);

    const initialsValid = form.entryInitials.length >= 2;

    return (
      initialsValid &&
      hasIdentity &&
      hasContactMethod &&
      form.permissionToContact
    );
  }, [form]);

  /**
   * Normalize values before DB save
   */
  function normalizeBeforeSave(next: LiveContactForm): LiveContactForm {
    return {
      ...next,

      entryInitials: clampInitials(next.entryInitials),

      email: safeTrim(next.email).toLowerCase(),

      phone: safeTrim(next.phone)
        ? normalizePhone(next.phone)
        : "",

      tags: uniqTags(next.tags || []),

      city: safeTrim(next.city),
      county: safeTrim(next.county),
      zip: safeTrim(next.zip),

      precinct: safeTrim(next.precinct),
      congressionalDistrict: safeTrim(next.congressionalDistrict),
      stateHouseDistrict: safeTrim(next.stateHouseDistrict),
      stateSenateDistrict: safeTrim(next.stateSenateDistrict),

      organization: safeTrim(next.organization),
      introducedBy: safeTrim(next.introducedBy),

      conversationNotes: safeTrim(next.conversationNotes),
      followUpNotes: safeTrim(next.followUpNotes),
    };
  }

  return {
    form,
    setForm,
    update,
    updateMany,
    reset,
    readyToSave,
    emailValid,
    normalizeBeforeSave,
  };
}