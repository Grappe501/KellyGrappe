import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import {
  Button,
  ErrorText,
  HelpText,
  Input,
  Label,
  Select,
  Textarea,
} from '../../shared/components/FormControls';
import { submitModule } from '../../shared/utils/apiClient';

type EventType =
  | 'Town Hall'
  | 'Community Meeting'
  | 'Church Event'
  | 'Fundraiser'
  | 'School / Youth Event'
  | 'Festival'
  | 'Civic Organization'
  | 'Other';

type PreferredContact = 'Email' | 'Phone' | 'Text';

type RequestedRole =
  | 'Kelly Attends'
  | 'Kelly Speaks'
  | 'Meet & Greet'
  | 'Booth / Table'
  | 'Other';

type ExpectedAttendance =
  | '1-25'
  | '26-50'
  | '51-100'
  | '101-250'
  | '251-500'
  | '500+'
  | 'Unknown';

type FormState = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  preferredContactMethod: PreferredContact;

  eventTitle: string;
  eventType: EventType;
  eventTypeOther: string;
  eventDescription: string;
  expectedAttendance: ExpectedAttendance;
  requestedRole: RequestedRole;
  requestedRoleOther: string;
  mediaExpected: 'Yes' | 'No' | 'Unknown';

  startDateTime: string;
  endDateTime: string;
  isTimeFlexible: boolean;

  venueName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;

  permissionToContact: boolean;

  honeypot: string;
};

type StepId = 'CONTACT' | 'EVENT' | 'SCHEDULE' | 'LOCATION' | 'REVIEW';
type IntakeStatus = 'DRAFT' | 'IN_PROGRESS' | 'READY' | 'SUBMITTING' | 'SUBMITTED' | 'ERROR';

const DRAFT_KEY = 'KG_SOS_EVENT_REQUEST_DRAFT_v1';
const STEP_ORDER: StepId[] = ['CONTACT', 'EVENT', 'SCHEDULE', 'LOCATION', 'REVIEW'];

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function isEmailLike(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isPhoneLike(v: string) {
  const digits = v.replace(/\D/g, '');
  return digits.length >= 10;
}

function titleCaseStep(step: StepId) {
  switch (step) {
    case 'CONTACT':
      return 'Contact';
    case 'EVENT':
      return 'Event';
    case 'SCHEDULE':
      return 'Schedule';
    case 'LOCATION':
      return 'Location';
    case 'REVIEW':
      return 'Review';
  }
}

function statusBadge(status: IntakeStatus) {
  switch (status) {
    case 'DRAFT':
      return { label: 'Draft saved', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'IN_PROGRESS':
      return { label: 'In progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'READY':
      return { label: 'Ready to submit', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'SUBMITTING':
      return { label: 'Submitting…', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'SUBMITTED':
      return { label: 'Submitted', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'ERROR':
      return { label: 'Needs attention', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
}

export default function EventRequestPage() {
  const nav = useNavigate();

  const [step, setStep] = useState<StepId>('CONTACT');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<IntakeStatus>('IN_PROGRESS');
  const [requestId, setRequestId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const didHydrateDraft = useRef(false);

  const [form, setForm] = useState<FormState>(() => ({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    preferredContactMethod: 'Email',

    eventTitle: '',
    eventType: 'Town Hall',
    eventTypeOther: '',
    eventDescription: '',
    expectedAttendance: 'Unknown',
    requestedRole: 'Kelly Attends',
    requestedRoleOther: '',
    mediaExpected: 'Unknown',

    startDateTime: '',
    endDateTime: '',
    isTimeFlexible: false,

    venueName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'AR',
    zip: '',

    permissionToContact: false,

    honeypot: '',
  }));

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus((s) => (s === 'SUBMITTED' ? 'SUBMITTED' : 'IN_PROGRESS'));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const copy = { ...prev };
      delete copy[key as string];
      return copy;
    });
  }

  /* ------------------------------- Drafts -------------------------------- */

  useEffect(() => {
    if (didHydrateDraft.current) return;
    didHydrateDraft.current = true;

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.data && typeof parsed.data === 'object') {
        setForm((prev) => ({ ...prev, ...parsed.data }));
        setStatus('DRAFT');
      }
      if (parsed?.step && STEP_ORDER.includes(parsed.step)) setStep(parsed.step);
    } catch {
      // ignore
    }
  }, []);

  // IMPORTANT FIX:
  // Debounce draft saves so we don't write to localStorage on every keystroke
  // (this can cause the "one letter then it jumps / stops typing" behavior on some devices).
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            step,
            updatedAt: new Date().toISOString(),
            data: form,
          })
        );
      } catch {
        // ignore
      }
    }, 400);

    return () => window.clearTimeout(t);
  }, [form, step]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setStatus('IN_PROGRESS');
  }

  /* ----------------------------- Validation ------------------------------ */

  const requiredForSubmit = useMemo(() => {
    if (!safeTrim(form.contactName)) return false;
    if (!safeTrim(form.contactEmail) || !isEmailLike(form.contactEmail)) return false;

    if (safeTrim(form.contactPhone) && !isPhoneLike(form.contactPhone)) return false;

    if (!safeTrim(form.eventTitle)) return false;
    if (!safeTrim(form.eventType)) return false;
    if (form.eventType === 'Other' && !safeTrim(form.eventTypeOther)) return false;

    if (!safeTrim(form.startDateTime)) return false;

    if (!safeTrim(form.city)) return false;
    if (!safeTrim(form.state)) return false;
    if (!safeTrim(form.zip)) return false;

    if (!form.permissionToContact) return false;

    return true;
  }, [form]);

  useEffect(() => {
    if (submitting) return;
    if (requestId) return;
    setStatus(requiredForSubmit ? 'READY' : status === 'DRAFT' ? 'DRAFT' : 'IN_PROGRESS');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredForSubmit]);

  function validateStep(current: StepId) {
    const errs: Record<string, string> = {};
    const require = (key: keyof FormState, message: string) => {
      if (!safeTrim(form[key])) errs[key as string] = message;
    };

    if (current === 'CONTACT') {
      require('contactName', 'Name is required.');
      require('contactEmail', 'Email is required.');
      if (safeTrim(form.contactEmail) && !isEmailLike(form.contactEmail)) {
        errs.contactEmail = 'Please enter a valid email address.';
      }
      if (safeTrim(form.contactPhone) && !isPhoneLike(form.contactPhone)) {
        errs.contactPhone = 'Please enter a valid phone number.';
      }
      require('preferredContactMethod', 'Select a preferred contact method.');
    }

    if (current === 'EVENT') {
      require('eventTitle', 'Event title is required.');
      require('eventType', 'Please select an event type.');
      if (form.eventType === 'Other') {
        require('eventTypeOther', 'Please describe the event type.');
      }
      require('expectedAttendance', 'Please select an attendance estimate.');
      require('requestedRole', 'Please select a requested role.');
      if (form.requestedRole === 'Other') {
        require('requestedRoleOther', 'Please describe the requested role.');
      }
      require('mediaExpected', 'Please select media expectation.');
    }

    if (current === 'SCHEDULE') {
      require('startDateTime', 'Start date/time is required.');
    }

    if (current === 'LOCATION') {
      require('city', 'City is required.');
      require('state', 'State is required.');
      require('zip', 'ZIP is required.');
      if (!form.permissionToContact) {
        errs.permissionToContact = 'Consent is required to submit.';
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    setError(null);
    const ok = validateStep(step);
    if (!ok) {
      setStatus('ERROR');
      setError('Please fix the highlighted fields to continue.');
      return;
    }
    const idx = STEP_ORDER.indexOf(step);
    setStep(STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)]);
  }

  function goBack() {
    setError(null);
    const idx = STEP_ORDER.indexOf(step);
    setStep(STEP_ORDER[Math.max(idx - 1, 0)]);
  }

  /* ------------------------------- Submit -------------------------------- */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (const s of ['CONTACT', 'EVENT', 'SCHEDULE', 'LOCATION'] as StepId[]) {
      const ok = validateStep(s);
      if (!ok) {
        setStep(s);
        setStatus('ERROR');
        setError('Please fix the highlighted fields before submitting.');
        return;
      }
    }

    if (!requiredForSubmit) {
      setStatus('ERROR');
      setError('Please complete required fields and confirm consent.');
      return;
    }

    try {
      setSubmitting(true);
      setStatus('SUBMITTING');

      const res = await submitModule({
        moduleId: 'MODULE_001_EVENT_REQUEST',
        honeypot: form.honeypot,
        data: {
          contactName: safeTrim(form.contactName),
          contactEmail: safeTrim(form.contactEmail),
          contactPhone: safeTrim(form.contactPhone) || undefined,
          preferredContactMethod: form.preferredContactMethod,

          eventTitle: safeTrim(form.eventTitle),
          eventType: form.eventType,
          eventTypeOther: form.eventType === 'Other' ? safeTrim(form.eventTypeOther) : undefined,
          eventDescription: safeTrim(form.eventDescription) || undefined,
          expectedAttendance: form.expectedAttendance,
          requestedRole: form.requestedRole,
          requestedRoleOther: form.requestedRole === 'Other' ? safeTrim(form.requestedRoleOther) : undefined,
          mediaExpected: form.mediaExpected,

          startDateTime: form.startDateTime,
          endDateTime: safeTrim(form.endDateTime) || undefined,
          isTimeFlexible: form.isTimeFlexible,

          venueName: safeTrim(form.venueName) || undefined,
          addressLine1: safeTrim(form.addressLine1) || undefined,
          addressLine2: safeTrim(form.addressLine2) || undefined,
          city: safeTrim(form.city),
          state: safeTrim(form.state),
          zip: safeTrim(form.zip),

          permissionToContact: form.permissionToContact,
        },
      });

      setRequestId(res.requestId);
      setStatus('SUBMITTED');
      clearDraft();
      nav('/thank-you');
    } catch (err: any) {
      setStatus('ERROR');
      setError(err?.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* --------------------------------- UI ---------------------------------- */

  const badge = statusBadge(status);
  const currentIndex = STEP_ORDER.indexOf(step);

  function Stepper() {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${badge.cls}`}>
            <span className="h-2 w-2 rounded-full bg-current opacity-70" />
            <span className="font-medium">{badge.label}</span>
          </div>

          <button
            type="button"
            className="text-xs text-slate-600 hover:text-slate-900 underline underline-offset-4 self-start sm:self-auto"
            onClick={clearDraft}
          >
            Clear saved draft
          </button>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex items-center gap-2 min-w-max">
            {STEP_ORDER.map((s, idx) => {
              const isActive = s === step;
              const isDone = idx < currentIndex;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (idx <= currentIndex) setStep(s);
                  }}
                  className={[
                    'flex-none rounded-lg border px-3 py-2 text-xs font-semibold transition',
                    isActive
                      ? 'border-slate-900 text-slate-900 bg-white'
                      : 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-white',
                    isDone ? 'opacity-100' : '',
                  ].join(' ')}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {titleCaseStep(s)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function FieldHint({ id }: { id: string }) {
    const msg = fieldErrors[id];
    if (!msg) return null;
    return <p className="mt-1 text-sm text-rose-700">{msg}</p>;
  }

  function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-600 leading-relaxed">{subtitle}</p> : null}
        </div>
        <div className="space-y-4">{children}</div>
      </section>
    );
  }

  function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-3 border-b border-slate-100">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="md:col-span-2 text-sm text-slate-900">{value}</div>
      </div>
    );
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Event Request"
          subtitle="Tell us what’s happening in your community — Kelly wants to show up, listen, and serve."
        />
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-8">
            <Stepper />

            {/* Honeypot */}
            <div className="hidden" aria-hidden="true">
              <Label htmlFor="companyWebsite">Company Website</Label>
              <Input
                id="companyWebsite"
                name="companyWebsite"
                value={form.honeypot}
                onChange={(e) => update('honeypot', e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {step === 'CONTACT' ? (
              <Section title="Contact" subtitle="How should we reach you to coordinate details?">
                <div>
                  <Label htmlFor="contactName">Your Name</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    placeholder="Full name"
                    value={form.contactName}
                    onChange={(e) => update('contactName', e.target.value)}
                  />
                  <FieldHint id="contactName" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      placeholder="you@email.com"
                      value={form.contactEmail}
                      onChange={(e) => update('contactEmail', e.target.value)}
                    />
                    <FieldHint id="contactEmail" />
                  </div>

                  <div>
                    <Label htmlFor="contactPhone">Phone (optional)</Label>
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      placeholder="501-555-1234"
                      value={form.contactPhone}
                      onChange={(e) => update('contactPhone', e.target.value)}
                      inputMode="tel"
                    />
                    <FieldHint id="contactPhone" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="preferredContactMethod">Preferred contact method</Label>
                  <Select
                    id="preferredContactMethod"
                    name="preferredContactMethod"
                    value={form.preferredContactMethod}
                    onChange={(e) => update('preferredContactMethod', e.target.value as PreferredContact)}
                  >
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="Text">Text</option>
                  </Select>
                  <FieldHint id="preferredContactMethod" />
                </div>
              </Section>
            ) : null}

            {step === 'EVENT' ? (
              <Section title="Event" subtitle="Give us the basics so we can evaluate and plan.">
                <div>
                  <Label htmlFor="eventTitle">Event title</Label>
                  <Input
                    id="eventTitle"
                    name="eventTitle"
                    placeholder="Example: Johnson County Town Hall"
                    value={form.eventTitle}
                    onChange={(e) => update('eventTitle', e.target.value)}
                  />
                  <FieldHint id="eventTitle" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eventType">Event type</Label>
                    <Select
                      id="eventType"
                      name="eventType"
                      value={form.eventType}
                      onChange={(e) => update('eventType', e.target.value as EventType)}
                    >
                      <option value="Town Hall">Town Hall</option>
                      <option value="Community Meeting">Community Meeting</option>
                      <option value="Church Event">Church Event</option>
                      <option value="Fundraiser">Fundraiser</option>
                      <option value="School / Youth Event">School / Youth Event</option>
                      <option value="Festival">Festival</option>
                      <option value="Civic Organization">Civic Organization</option>
                      <option value="Other">Other</option>
                    </Select>
                    <FieldHint id="eventType" />
                  </div>

                  {form.eventType === 'Other' ? (
                    <div>
                      <Label htmlFor="eventTypeOther">Other event type</Label>
                      <Input
                        id="eventTypeOther"
                        name="eventTypeOther"
                        placeholder="Describe the type"
                        value={form.eventTypeOther}
                        onChange={(e) => update('eventTypeOther', e.target.value)}
                      />
                      <FieldHint id="eventTypeOther" />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="expectedAttendance">Estimated attendance</Label>
                      <Select
                        id="expectedAttendance"
                        name="expectedAttendance"
                        value={form.expectedAttendance}
                        onChange={(e) => update('expectedAttendance', e.target.value as ExpectedAttendance)}
                      >
                        <option value="Unknown">Unknown</option>
                        <option value="1-25">1-25</option>
                        <option value="26-50">26-50</option>
                        <option value="51-100">51-100</option>
                        <option value="101-250">101-250</option>
                        <option value="251-500">251-500</option>
                        <option value="500+">500+</option>
                      </Select>
                      <FieldHint id="expectedAttendance" />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="eventDescription">Event description (optional)</Label>
                  <Textarea
                    id="eventDescription"
                    name="eventDescription"
                    rows={4}
                    placeholder="Anything helpful for context."
                    value={form.eventDescription}
                    onChange={(e) => update('eventDescription', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="requestedRole">Requested role</Label>
                    <Select
                      id="requestedRole"
                      name="requestedRole"
                      value={form.requestedRole}
                      onChange={(e) => update('requestedRole', e.target.value as RequestedRole)}
                    >
                      <option value="Kelly Attends">Kelly Attends</option>
                      <option value="Kelly Speaks">Kelly Speaks</option>
                      <option value="Meet & Greet">Meet & Greet</option>
                      <option value="Booth / Table">Booth / Table</option>
                      <option value="Other">Other</option>
                    </Select>
                    <FieldHint id="requestedRole" />
                  </div>

                  {form.requestedRole === 'Other' ? (
                    <div>
                      <Label htmlFor="requestedRoleOther">Other requested role</Label>
                      <Input
                        id="requestedRoleOther"
                        name="requestedRoleOther"
                        placeholder="Describe what you need"
                        value={form.requestedRoleOther}
                        onChange={(e) => update('requestedRoleOther', e.target.value)}
                      />
                      <FieldHint id="requestedRoleOther" />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="mediaExpected">Media expected?</Label>
                      <Select
                        id="mediaExpected"
                        name="mediaExpected"
                        value={form.mediaExpected}
                        onChange={(e) => update('mediaExpected', e.target.value as 'Yes' | 'No' | 'Unknown')}
                      >
                        <option value="Unknown">Unknown</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </Select>
                      <FieldHint id="mediaExpected" />
                    </div>
                  )}
                </div>
              </Section>
            ) : null}

            {step === 'SCHEDULE' ? (
              <Section title="Schedule" subtitle="Give us the date/time so we can check availability.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDateTime">Start date & time</Label>
                    <Input
                      id="startDateTime"
                      name="startDateTime"
                      type="datetime-local"
                      value={form.startDateTime}
                      onChange={(e) => update('startDateTime', e.target.value)}
                    />
                    <FieldHint id="startDateTime" />
                  </div>

                  <div>
                    <Label htmlFor="endDateTime">End date & time (optional)</Label>
                    <Input
                      id="endDateTime"
                      name="endDateTime"
                      type="datetime-local"
                      value={form.endDateTime}
                      onChange={(e) => update('endDateTime', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <input
                    id="isTimeFlexible"
                    name="isTimeFlexible"
                    type="checkbox"
                    className="mt-1 h-5 w-5 rounded-md"
                    checked={form.isTimeFlexible}
                    onChange={(e) => update('isTimeFlexible', e.target.checked)}
                  />
                  <div>
                    <Label htmlFor="isTimeFlexible">Time is flexible</Label>
                    <HelpText>If date/time can shift, we’ll coordinate options with you.</HelpText>
                  </div>
                </div>
              </Section>
            ) : null}

            {step === 'LOCATION' ? (
              <Section title="Location" subtitle="Where is the event happening?">
                <div>
                  <Label htmlFor="venueName">Venue name (optional)</Label>
                  <Input
                    id="venueName"
                    name="venueName"
                    placeholder="Example: Community Center"
                    value={form.venueName}
                    onChange={(e) => update('venueName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="addressLine1">Address line 1 (optional)</Label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    placeholder="Street address"
                    value={form.addressLine1}
                    onChange={(e) => update('addressLine1', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    placeholder="Suite / Unit"
                    value={form.addressLine2}
                    onChange={(e) => update('addressLine2', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="City"
                      value={form.city}
                      onChange={(e) => update('city', e.target.value)}
                    />
                    <FieldHint id="city" />
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="AR"
                      value={form.state}
                      onChange={(e) => update('state', e.target.value)}
                    />
                    <FieldHint id="state" />
                  </div>

                  <div>
                    <Label htmlFor="zip">ZIP</Label>
                    <Input
                      id="zip"
                      name="zip"
                      placeholder="ZIP"
                      value={form.zip}
                      onChange={(e) => update('zip', e.target.value)}
                      inputMode="numeric"
                    />
                    <FieldHint id="zip" />
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <input
                    id="permissionToContact"
                    name="permissionToContact"
                    type="checkbox"
                    className="mt-1 h-5 w-5 rounded-md"
                    checked={form.permissionToContact}
                    onChange={(e) => update('permissionToContact', e.target.checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="permissionToContact">
                      I agree that the campaign may contact me about this request.
                    </Label>
                    {fieldErrors.permissionToContact ? (
                      <p className="text-sm text-rose-700">{fieldErrors.permissionToContact}</p>
                    ) : null}
                    <HelpText>Consent is required to submit.</HelpText>
                  </div>
                </div>
              </Section>
            ) : null}

            {step === 'REVIEW' ? (
              <Section title="Review & Submit" subtitle="Confirm details before submitting.">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <ReviewRow label="Name" value={safeTrim(form.contactName)} />
                  <ReviewRow label="Email" value={safeTrim(form.contactEmail)} />
                  <ReviewRow label="Phone" value={safeTrim(form.contactPhone) ? safeTrim(form.contactPhone) : 'Not provided'} />
                  <ReviewRow label="Preferred contact" value={form.preferredContactMethod} />
                  <ReviewRow label="Event title" value={safeTrim(form.eventTitle)} />
                  <ReviewRow
                    label="Event type"
                    value={form.eventType === 'Other' ? `Other — ${safeTrim(form.eventTypeOther)}` : form.eventType}
                  />
                  <ReviewRow label="Attendance" value={form.expectedAttendance} />
                  <ReviewRow
                    label="Requested role"
                    value={form.requestedRole === 'Other' ? `Other — ${safeTrim(form.requestedRoleOther)}` : form.requestedRole}
                  />
                  <ReviewRow label="Media expected" value={form.mediaExpected} />
                  <ReviewRow label="Start" value={form.startDateTime || '—'} />
                  <ReviewRow label="End" value={form.endDateTime || '—'} />
                  <ReviewRow label="Flexible" value={form.isTimeFlexible ? 'Yes' : 'No'} />
                  <ReviewRow label="Venue" value={safeTrim(form.venueName) ? safeTrim(form.venueName) : 'Not provided'} />
                  <ReviewRow label="City/State/ZIP" value={`${safeTrim(form.city)}, ${safeTrim(form.state)} ${safeTrim(form.zip)}`} />
                  <ReviewRow label="Consent" value={form.permissionToContact ? 'Confirmed' : 'Not confirmed'} />
                </div>

                {!requiredForSubmit ? (
                  <ErrorText>This request is not ready to submit. Please go back and complete the required fields.</ErrorText>
                ) : null}
              </Section>
            ) : null}

            {error ? <ErrorText>{error}</ErrorText> : null}

            <div className="pt-2 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Button type="button" variant="secondary" onClick={() => nav('/')} className="w-full sm:w-auto">
                  Back to Home
                </Button>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={goBack}
                    disabled={step === 'CONTACT' || submitting}
                    className="w-full sm:w-auto"
                  >
                    Back
                  </Button>

                  {step !== 'REVIEW' ? (
                    <Button type="button" onClick={goNext} disabled={submitting} className="w-full sm:w-auto">
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit" disabled={submitting || !requiredForSubmit} className="w-full sm:w-auto">
                      {submitting ? 'Submitting…' : 'Submit Request'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed">
                Your progress is saved automatically on this device. If you need to finish later, you can return and continue where you left off.
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}