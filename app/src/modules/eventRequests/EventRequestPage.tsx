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
import { processIntake } from '../../shared/utils/intakePipeline';

type FormState = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  preferredContactMethod: 'Email' | 'Phone' | 'Text';

  eventTitle: string;
  eventType:
    | 'Candidate Forum / Debate'
    | 'Church Service / Faith Event'
    | 'Community Town Hall'
    | 'School / Sports Event'
    | 'Festival / Fair / Parade'
    | 'Union / Workplace Gathering'
    | 'Civic Club Meeting'
    | 'House Meetup'
    | 'Fundraiser'
    | 'Small Business Visit'
    | 'Other';
  eventTypeOther: string;

  eventDescription: string;
  expectedAttendance: '1–10' | '11–25' | '26–50' | '51–100' | '100+';

  startDateTime: string; // datetime-local
  endDateTime: string; // datetime-local
  isTimeFlexible: boolean;

  venueName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;

  requestedRole:
    | 'Attend and greet attendees'
    | 'Speak briefly'
    | 'Featured speaker'
    | 'Private meeting'
    | 'Fundraiser ask'
    | 'Not sure';
  mediaExpected: 'No' | 'Yes' | 'Not sure';

  permissionToContact: boolean;

  // anti-spam
  honeypot: string;
};

type StepId = 'CONTACT' | 'EVENT' | 'SCHEDULE' | 'FINAL' | 'REVIEW';
type IntakeStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'READY'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'ERROR';

const DRAFT_KEY = 'KG_SOS_EVENT_REQUEST_DRAFT_v1';

const EVENT_TYPES: FormState['eventType'][] = [
  'Candidate Forum / Debate',
  'Church Service / Faith Event',
  'Community Town Hall',
  'School / Sports Event',
  'Festival / Fair / Parade',
  'Union / Workplace Gathering',
  'Civic Club Meeting',
  'House Meetup',
  'Fundraiser',
  'Small Business Visit',
  'Other',
];

const STEP_ORDER: StepId[] = ['CONTACT', 'EVENT', 'SCHEDULE', 'FINAL', 'REVIEW'];

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function isEmailLike(v: string) {
  // Simple, user-friendly check (backend still validates schema)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function titleCaseStep(step: StepId) {
  switch (step) {
    case 'CONTACT':
      return 'Contact';
    case 'EVENT':
      return 'Event';
    case 'SCHEDULE':
      return 'When & Where';
    case 'FINAL':
      return 'Final Details';
    case 'REVIEW':
      return 'Review';
  }
}

function statusBadge(status: IntakeStatus) {
  switch (status) {
    case 'DRAFT':
      return {
        label: 'Draft saved',
        cls: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    case 'IN_PROGRESS':
      return {
        label: 'In progress',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'READY':
      return {
        label: 'Ready to submit',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'SUBMITTING':
      return {
        label: 'Submitting…',
        cls: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'SUBMITTED':
      return {
        label: 'Submitted',
        cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'ERROR':
      return {
        label: 'Needs attention',
        cls: 'bg-rose-50 text-rose-700 border-rose-200',
      };
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
    eventType: 'Community Town Hall',
    eventTypeOther: '',
    eventDescription: '',
    expectedAttendance: '11–25',

    startDateTime: '',
    endDateTime: '',
    isTimeFlexible: false,

    venueName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'AR',
    zip: '',

    requestedRole: 'Attend and greet attendees',
    mediaExpected: 'Not sure',

    permissionToContact: false,

    honeypot: '',
  }));

  const showOtherType = form.eventType === 'Other';

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

  /* -------------------------------------------------------------------------- */
  /*                                  DRAFTS                                    */
  /* -------------------------------------------------------------------------- */

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
      // ignore draft load errors
    }
  }, []);

  useEffect(() => {
    // IMPORTANT: Debounce draft saves.
    // Writing to localStorage synchronously on every keystroke can cause
    // "sticky key" / "one character at a time" input behavior on some devices.
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
        // ignore quota errors
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

  /* -------------------------------------------------------------------------- */
  /*                               VALIDATION                                   */
  /* -------------------------------------------------------------------------- */

  const requiredForSubmit = useMemo(() => {
    if (!form.permissionToContact) return false;
    if (!safeTrim(form.contactName)) return false;
    if (!safeTrim(form.contactEmail)) return false;
    if (!isEmailLike(form.contactEmail)) return false;
    if (!safeTrim(form.eventTitle)) return false;
    if (!safeTrim(form.startDateTime)) return false;
    if (!safeTrim(form.addressLine1)) return false;
    if (!safeTrim(form.city)) return false;
    if (!safeTrim(form.state)) return false;
    if (!safeTrim(form.zip)) return false;
    if (showOtherType && !safeTrim(form.eventTypeOther)) return false;
    return true;
  }, [form, showOtherType]);

  useEffect(() => {
    if (submitting) return;
    if (requestId) return;
    setStatus(
      requiredForSubmit ? 'READY' : status === 'DRAFT' ? 'DRAFT' : 'IN_PROGRESS'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredForSubmit]);

  function validateStep(current: StepId) {
    const errs: Record<string, string> = {};

    const require = (key: keyof FormState, message: string) => {
      if (!safeTrim(form[key])) errs[key as string] = message;
    };

    if (current === 'CONTACT') {
      require('contactName', 'Full name is required.');
      require('contactEmail', 'Email is required.');
      if (safeTrim(form.contactEmail) && !isEmailLike(form.contactEmail)) {
        errs.contactEmail = 'Please enter a valid email address.';
      }
    }

    if (current === 'EVENT') {
      require('eventTitle', 'Event title is required.');
      if (form.eventType === 'Other')
        require('eventTypeOther', 'Please describe the event type.');
    }

    if (current === 'SCHEDULE') {
      require('startDateTime', 'Start date/time is required.');
      require('addressLine1', 'Street address is required.');
      require('city', 'City is required.');
      require('state', 'State is required.');
      require('zip', 'ZIP is required.');
    }

    if (current === 'FINAL') {
      if (!form.permissionToContact) {
        errs.permissionToContact =
          'Consent is required to submit. This confirms the request does not guarantee attendance.';
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
    const next = STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
    setStep(next);
  }

  function goBack() {
    setError(null);
    const idx = STEP_ORDER.indexOf(step);
    const prev = STEP_ORDER[Math.max(idx - 1, 0)];
    setStep(prev);
  }

  /* -------------------------------------------------------------------------- */
  /*                                  SUBMIT                                    */
  /* -------------------------------------------------------------------------- */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (const s of ['CONTACT', 'EVENT', 'SCHEDULE', 'FINAL'] as StepId[]) {
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
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || undefined,
          preferredContactMethod: form.preferredContactMethod,

          eventTitle: form.eventTitle,
          eventType: form.eventType,
          eventTypeOther: showOtherType ? form.eventTypeOther : undefined,
          eventDescription: form.eventDescription || undefined,
          expectedAttendance: form.expectedAttendance,

          startDateTime: form.startDateTime,
          endDateTime: form.endDateTime || undefined,
          isTimeFlexible: form.isTimeFlexible,

          venueName: form.venueName || undefined,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          city: form.city,
          state: form.state,
          zip: form.zip,

          requestedRole: form.requestedRole,
          mediaExpected: form.mediaExpected,
          permissionToContact: form.permissionToContact,
        },
      });

      // Unified intake pipeline (ContactsDB + Origin + Follow-up queue)
      await processIntake({
        originType: 'EVENT_REQUEST',
        originRef: res.requestId,
        rawPayload: {
          moduleId: 'MODULE_001_EVENT_REQUEST',
          form,
          submit: res,
        },
        contact: {
          fullName: safeTrim(form.contactName) || undefined,
          email: safeTrim(form.contactEmail) || undefined,
          phone: safeTrim(form.contactPhone) || undefined,
          city: safeTrim(form.city) || undefined,
          state: safeTrim(form.state) || 'AR',
        },
        followUp: {
          followUpNeeded: true,
          followUpNotes: 'New event request. Triage within 24 hours and confirm logistics.',
          sourceLabel: 'Event Request',
          location: [
            safeTrim(form.venueName) || safeTrim(form.eventTitle),
            safeTrim(form.city),
            safeTrim(form.state) || 'AR',
          ]
            .filter(Boolean)
            .join(' • '),
          notes: [
            safeTrim(form.eventType) ? `Type: ${safeTrim(form.eventType)}` : '',
            showOtherType && safeTrim(form.eventTypeOther)
              ? `Other type: ${safeTrim(form.eventTypeOther)}`
              : '',
            safeTrim(form.requestedRole) ? `Requested role: ${safeTrim(form.requestedRole)}` : '',
            safeTrim(form.startDateTime) ? `Start: ${safeTrim(form.startDateTime)}` : '',
            safeTrim(form.endDateTime) ? `End: ${safeTrim(form.endDateTime)}` : '',
            form.isTimeFlexible ? 'Time flexible: Yes' : 'Time flexible: No',
            safeTrim(form.addressLine1) ? `Address: ${safeTrim(form.addressLine1)}` : '',
            safeTrim(form.addressLine2) ? safeTrim(form.addressLine2) : '',
            safeTrim(form.zip) ? `ZIP: ${safeTrim(form.zip)}` : '',
            safeTrim(form.eventDescription) ? `Details: ${safeTrim(form.eventDescription)}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          permissionToContact: !!form.permissionToContact,
          automationEligible: false,
        },
        eventLead: {
          eventLeadText: safeTrim(form.eventTitle) || undefined,
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

  /* -------------------------------------------------------------------------- */
  /*                                   UI                                       */
  /* -------------------------------------------------------------------------- */

  const badge = statusBadge(status);
  const currentIndex = STEP_ORDER.indexOf(step);

  function Stepper() {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${badge.cls}`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-70" />
            <span className="font-medium">{badge.label}</span>
          </div>

          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-4 self-start sm:self-auto"
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
    return <p className="mt-1 text-sm text-rose-600">{msg}</p>;
  }

  function Section({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) {
    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-slate-600 leading-relaxed">{subtitle}</p>
          ) : null}
        </div>
        <div className="space-y-4">{children}</div>
      </section>
    );
  }

  function ReviewRow({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-3 border-b border-slate-100">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="md:col-span-2 text-sm text-slate-900">{value}</div>
      </div>
    );
  }

  return (
    <Container>
      {/* MOBILE WIDTH FIX:
          Container adds px-4; this makes the card full-bleed on mobile.
          Keeps normal margins on sm+.
      */}
      <Card className="-mx-4 sm:mx-0 w-auto sm:w-full bg-white text-slate-900">
        <CardHeader
          title="Event Request Intake"
          subtitle="A structured intake form used to schedule candidate engagements reliably and transparently."
          className="bg-white !px-4 sm:!px-6"
        />
        <CardContent className="bg-white !px-4 sm:!px-6">
          <form onSubmit={onSubmit} className="space-y-8 text-slate-900">
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

            {/* CONTACT */}
            {step === 'CONTACT' ? (
              <Section
                title="Contact"
                subtitle="We use this information to confirm details, clarify scheduling, and coordinate arrival."
              >
                <div>
                  <Label htmlFor="contactName">Full name</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    placeholder="Your name"
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
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="preferredContactMethod">
                    Preferred contact method
                  </Label>
                  <Select
                    id="preferredContactMethod"
                    name="preferredContactMethod"
                    value={form.preferredContactMethod}
                    onChange={(e) =>
                      update(
                        'preferredContactMethod',
                        e.target.value as FormState['preferredContactMethod']
                      )
                    }
                  >
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="Text">Text</option>
                  </Select>
                </div>
              </Section>
            ) : null}

            {/* EVENT */}
            {step === 'EVENT' ? (
              <Section
                title="Event"
                subtitle="Any size or subject is welcome — if people are gathering and you’re willing to invite Kelly, submit it here."
              >
                <div>
                  <Label htmlFor="eventTitle">Event title</Label>
                  <Input
                    id="eventTitle"
                    name="eventTitle"
                    placeholder="Example: Downtown Community Town Hall"
                    value={form.eventTitle}
                    onChange={(e) => update('eventTitle', e.target.value)}
                  />
                  <FieldHint id="eventTitle" />
                </div>

                <div>
                  <Label htmlFor="eventType">Event type</Label>
                  <Select
                    id="eventType"
                    name="eventType"
                    value={form.eventType}
                    onChange={(e) =>
                      update('eventType', e.target.value as FormState['eventType'])
                    }
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>

                {showOtherType ? (
                  <div>
                    <Label htmlFor="eventTypeOther">Describe the event</Label>
                    <Input
                      id="eventTypeOther"
                      name="eventTypeOther"
                      placeholder="What type of event is this?"
                      value={form.eventTypeOther}
                      onChange={(e) => update('eventTypeOther', e.target.value)}
                    />
                    <FieldHint id="eventTypeOther" />
                  </div>
                ) : null}

                <div>
                  <Label htmlFor="eventDescription">Event description (optional)</Label>
                  <Textarea
                    id="eventDescription"
                    name="eventDescription"
                    rows={4}
                    placeholder="Anything we should know: schedule, audience, format, topics, hosts…"
                    value={form.eventDescription}
                    onChange={(e) => update('eventDescription', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="expectedAttendance">Expected attendance</Label>
                  <Select
                    id="expectedAttendance"
                    name="expectedAttendance"
                    value={form.expectedAttendance}
                    onChange={(e) =>
                      update(
                        'expectedAttendance',
                        e.target.value as FormState['expectedAttendance']
                      )
                    }
                  >
                    <option value="1–10">1–10</option>
                    <option value="11–25">11–25</option>
                    <option value="26–50">26–50</option>
                    <option value="51–100">51–100</option>
                    <option value="100+">100+</option>
                  </Select>
                </div>
              </Section>
            ) : null}

            {/* SCHEDULE */}
            {step === 'SCHEDULE' ? (
              <Section
                title="When & Where"
                subtitle="Give us the best available timing and location. We’ll follow up if anything needs clarifying."
              >
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
                  <div className="space-y-1">
                    <Label htmlFor="isTimeFlexible">Timing is flexible</Label>
                    <HelpText>
                      Check this if the schedule can shift based on availability.
                    </HelpText>
                  </div>
                </div>

                <div>
                  <Label htmlFor="venueName">Venue name (optional)</Label>
                  <Input
                    id="venueName"
                    name="venueName"
                    placeholder="Example: City Hall"
                    value={form.venueName}
                    onChange={(e) => update('venueName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="addressLine1">Street address</Label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    placeholder="123 Main St"
                    value={form.addressLine1}
                    onChange={(e) => update('addressLine1', e.target.value)}
                  />
                  <FieldHint id="addressLine1" />
                </div>

                <div>
                  <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
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
                      value={form.state}
                      onChange={(e) =>
                        update('state', e.target.value.toUpperCase())
                      }
                      maxLength={2}
                    />
                    <FieldHint id="state" />
                  </div>

                  <div>
                    <Label htmlFor="zip">ZIP</Label>
                    <Input
                      id="zip"
                      name="zip"
                      value={form.zip}
                      onChange={(e) => update('zip', e.target.value)}
                      inputMode="numeric"
                      pattern="\d{5}"
                      maxLength={5}
                    />
                    <FieldHint id="zip" />
                  </div>
                </div>
              </Section>
            ) : null}

            {/* FINAL */}
            {step === 'FINAL' ? (
              <Section
                title="Final Details"
                subtitle="This helps triage requests and plan logistics."
              >
                <div>
                  <Label htmlFor="requestedRole">What role are you requesting?</Label>
                  <Select
                    id="requestedRole"
                    name="requestedRole"
                    value={form.requestedRole}
                    onChange={(e) =>
                      update(
                        'requestedRole',
                        e.target.value as FormState['requestedRole']
                      )
                    }
                  >
                    <option value="Attend and greet attendees">
                      Attend and greet attendees
                    </option>
                    <option value="Speak briefly">Speak briefly</option>
                    <option value="Featured speaker">Featured speaker</option>
                    <option value="Private meeting">Private meeting</option>
                    <option value="Fundraiser ask">Fundraiser ask</option>
                    <option value="Not sure">Not sure</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="mediaExpected">Will media be present?</Label>
                  <Select
                    id="mediaExpected"
                    name="mediaExpected"
                    value={form.mediaExpected}
                    onChange={(e) =>
                      update(
                        'mediaExpected',
                        e.target.value as FormState['mediaExpected']
                      )
                    }
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                    <option value="Not sure">Not sure</option>
                  </Select>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <input
                    id="permissionToContact"
                    name="permissionToContact"
                    type="checkbox"
                    className="mt-1 h-5 w-5 rounded-md"
                    checked={form.permissionToContact}
                    onChange={(e) =>
                      update('permissionToContact', e.target.checked)
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="permissionToContact">
                      I understand this is a request and does not guarantee
                      attendance. The campaign may contact me for additional
                      information.
                    </Label>
                    {fieldErrors.permissionToContact ? (
                      <p className="text-sm text-rose-600">
                        {fieldErrors.permissionToContact}
                      </p>
                    ) : null}
                    <HelpText>Consent is required to submit.</HelpText>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  By submitting, you confirm the information is accurate to the
                  best of your knowledge.
                </p>
              </Section>
            ) : null}

            {/* REVIEW */}
            {step === 'REVIEW' ? (
              <Section
                title="Review & Submit"
                subtitle="Please confirm details before submitting. This creates a tracking record and sends notifications."
              >
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <ReviewRow
                    label="Contact"
                    value={`${safeTrim(form.contactName)} • ${safeTrim(
                      form.contactEmail
                    )}${
                      safeTrim(form.contactPhone)
                        ? ` • ${safeTrim(form.contactPhone)}`
                        : ''
                    }`}
                  />
                  <ReviewRow
                    label="Preferred contact"
                    value={form.preferredContactMethod}
                  />
                  <ReviewRow label="Event" value={safeTrim(form.eventTitle)} />
                  <ReviewRow
                    label="Type"
                    value={
                      form.eventType === 'Other'
                        ? `Other — ${safeTrim(form.eventTypeOther)}`
                        : form.eventType
                    }
                  />
                  <ReviewRow
                    label="Attendance"
                    value={form.expectedAttendance}
                  />
                  <ReviewRow
                    label="Requested role"
                    value={form.requestedRole}
                  />
                  <ReviewRow label="Media" value={form.mediaExpected} />
                  <ReviewRow
                    label="Start"
                    value={`${form.startDateTime}${
                      form.isTimeFlexible ? ' (flexible)' : ''
                    }`}
                  />
                  <ReviewRow
                    label="End"
                    value={form.endDateTime ? form.endDateTime : 'Not provided'}
                  />
                  <ReviewRow
                    label="Location"
                    value={
                      <>
                        <div>
                          {safeTrim(form.venueName)
                            ? safeTrim(form.venueName)
                            : 'Venue not provided'}
                        </div>
                        <div>
                          {safeTrim(form.addressLine1)}
                          {safeTrim(form.addressLine2)
                            ? `, ${safeTrim(form.addressLine2)}`
                            : ''}
                        </div>
                        <div>
                          {safeTrim(form.city)}, {safeTrim(form.state)}{' '}
                          {safeTrim(form.zip)}
                        </div>
                      </>
                    }
                  />
                  <ReviewRow
                    label="Description"
                    value={
                      safeTrim(form.eventDescription)
                        ? safeTrim(form.eventDescription)
                        : 'Not provided'
                    }
                  />
                  <ReviewRow
                    label="Consent"
                    value={
                      form.permissionToContact ? 'Confirmed' : 'Not confirmed'
                    }
                  />
                </div>

                {!requiredForSubmit ? (
                  <ErrorText>
                    This request is not ready to submit. Please go back and
                    complete the required fields.
                  </ErrorText>
                ) : null}
              </Section>
            ) : null}

            {error ? <ErrorText>{error}</ErrorText> : null}

            {/* CONTROLS */}
            <div className="pt-2 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => nav('/')}
                  className="w-full sm:w-auto"
                >
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
                    <Button
                      type="button"
                      onClick={goNext}
                      disabled={submitting}
                      className="w-full sm:w-auto"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitting || !requiredForSubmit}
                      className="w-full sm:w-auto"
                    >
                      {submitting ? 'Submitting…' : 'Submit Event Request'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed">
                Your progress is saved automatically on this device. If you need
                to finish later, you can return and continue where you left off.
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}