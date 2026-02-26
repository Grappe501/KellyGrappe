import React, { useMemo, useState } from 'react';
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

type PreferredContactMethod = 'Email' | 'Phone' | 'Text';

type EventType =
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

type ExpectedAttendance = '1–10' | '11–25' | '26–50' | '51–100' | '100+';

type RequestedRole =
  | 'Attend and greet attendees'
  | 'Speak briefly'
  | 'Featured speaker'
  | 'Private meeting'
  | 'Fundraiser ask'
  | 'Not sure';

type MediaExpected = 'No' | 'Yes' | 'Not sure';

type FormState = {
  // Who is inviting
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  preferredContactMethod: PreferredContactMethod;
  organization: string;

  // Event basics
  eventTitle: string;
  eventType: EventType;
  eventTypeOther: string;
  eventDescription: string;
  expectedAttendance: ExpectedAttendance;

  // When & where
  startDateTime: string;
  endDateTime: string;
  isTimeFlexible: boolean;

  venueName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;

  // Logistics
  requestedRole: RequestedRole;
  mediaExpected: MediaExpected;
  hostNotes: string;

  // Consent
  permissionToContact: boolean;

  // Anti-spam
  honeypot: string;
};

type AssistResponse = {
  extracted?: Partial<FormState>;
  confidence?: 'low' | 'medium' | 'high';
  notes?: string[];
  drafts?: {
    confirmationEmail?: string;
    confirmationText?: string;
    internalBrief?: string;
    followUpChecklist?: string;
  };
};

const EVENT_TYPES: EventType[] = [
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

const DRAFT_KEY = 'KG_SOS_EVENT_REQUEST_DRAFT_v2'; // new key to avoid old broken drafts

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function isEmailLike(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function prettyDateTime(dtLocal: string) {
  if (!dtLocal) return '';
  // dtLocal is "YYYY-MM-DDTHH:mm"
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return dtLocal;
  return d.toLocaleString();
}

export default function EventRequestPage() {
  const nav = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AssistResponse | null>(null);

  const [form, setForm] = useState<FormState>(() => {
    // Safe draft hydration: ONLY once, synchronously, and only if shape looks right.
    // No background rehydration loops. No per-keystroke localStorage writes.
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.data) {
          return {
            contactName: parsed.data.contactName ?? '',
            contactEmail: parsed.data.contactEmail ?? '',
            contactPhone: parsed.data.contactPhone ?? '',
            preferredContactMethod: parsed.data.preferredContactMethod ?? 'Email',
            organization: parsed.data.organization ?? '',

            eventTitle: parsed.data.eventTitle ?? '',
            eventType: parsed.data.eventType ?? 'Community Town Hall',
            eventTypeOther: parsed.data.eventTypeOther ?? '',
            eventDescription: parsed.data.eventDescription ?? '',
            expectedAttendance: parsed.data.expectedAttendance ?? '11–25',

            startDateTime: parsed.data.startDateTime ?? '',
            endDateTime: parsed.data.endDateTime ?? '',
            isTimeFlexible: !!parsed.data.isTimeFlexible,

            venueName: parsed.data.venueName ?? '',
            addressLine1: parsed.data.addressLine1 ?? '',
            addressLine2: parsed.data.addressLine2 ?? '',
            city: parsed.data.city ?? '',
            state: parsed.data.state ?? 'AR',
            zip: parsed.data.zip ?? '',

            requestedRole: parsed.data.requestedRole ?? 'Attend and greet attendees',
            mediaExpected: parsed.data.mediaExpected ?? 'Not sure',
            hostNotes: parsed.data.hostNotes ?? '',

            permissionToContact: !!parsed.data.permissionToContact,
            honeypot: '',
          };
        }
      }
    } catch {
      // ignore
    }

    return {
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      preferredContactMethod: 'Email',
      organization: '',

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
      hostNotes: '',

      permissionToContact: false,
      honeypot: '',
    };
  });

  const showOtherType = form.eventType === 'Other';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const requiredOk = useMemo(() => {
    if (!form.permissionToContact) return false;
    if (!safeTrim(form.contactName)) return false;
    if (!safeTrim(form.contactEmail)) return false;
    if (!isEmailLike(form.contactEmail)) return false;

    if (!safeTrim(form.eventTitle)) return false;
    if (showOtherType && !safeTrim(form.eventTypeOther)) return false;

    if (!safeTrim(form.startDateTime)) return false;
    if (!safeTrim(form.addressLine1)) return false;
    if (!safeTrim(form.city)) return false;
    if (!safeTrim(form.state)) return false;
    if (!safeTrim(form.zip)) return false;

    return true;
  }, [form, showOtherType]);

  function saveDraft() {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          updatedAt: new Date().toISOString(),
          data: form,
        })
      );
    } catch {
      // ignore
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }

  function applyExtracted(extracted?: Partial<FormState>) {
    if (!extracted) return;
    setForm((prev) => {
      const next: FormState = { ...prev };
      (Object.keys(extracted) as (keyof FormState)[]).forEach((k) => {
        const v = extracted[k];
        if (typeof v === 'undefined' || v === null) return;
        // Never overwrite honeypot
        if (k === 'honeypot') return;
        // Avoid overwriting a field the user already filled unless AI provides something meaningful
        const prevVal = (next[k] as any) ?? '';
        const incoming = v as any;
        const prevIsEmpty =
          typeof prevVal === 'string' ? safeTrim(prevVal) === '' : prevVal === false;
        const incomingIsEmpty =
          typeof incoming === 'string' ? safeTrim(incoming) === '' : incoming === false;

        if (!incomingIsEmpty && (prevIsEmpty || k === 'eventDescription' || k === 'hostNotes')) {
          (next[k] as any) = incoming;
        }
      });
      return next;
    });
  }

  async function callEventAssist(mode: 'extract' | 'drafts') {
    setAiError(null);
    setAiResult(null);

    const text = safeTrim(aiText);
    if (!text) {
      setAiError('Paste an invite, email, or event details first.');
      return;
    }

    try {
      setAiLoading(true);

      const res = await fetch('/.netlify/functions/event-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          text,
          formContext: {
            preferredContactMethod: form.preferredContactMethod,
            requestedRole: form.requestedRole,
            mediaExpected: form.mediaExpected,
            state: form.state || 'AR',
          },
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `AI assist failed (${res.status}).`);
      }

      const json = (await res.json()) as AssistResponse;
      setAiResult(json);

      if (mode === 'extract') {
        applyExtracted(json.extracted);
      }
    } catch (e: any) {
      setAiError(e?.message ?? 'AI assist failed.');
    } finally {
      setAiLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!requiredOk) {
      setSubmitError('Please complete the required fields and confirm consent.');
      return;
    }

    try {
      setSubmitting(true);

      // 1) Submit to backend intake handler
      const submitRes = await submitModule({
        moduleId: 'MODULE_001_EVENT_REQUEST',
        honeypot: form.honeypot,
        data: {
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || undefined,
          preferredContactMethod: form.preferredContactMethod,
          organization: form.organization || undefined,

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
          hostNotes: form.hostNotes || undefined,

          permissionToContact: form.permissionToContact,
          aiDrafts: aiResult?.drafts ?? undefined,
        },
      });

      // 2) Unified intake pipeline: ContactsDB + Origin + Follow-up queue (+ optional eventLead)
      await processIntake({
        originType: 'EVENT_REQUEST',
        originRef: submitRes.requestId,
        rawPayload: {
          moduleId: 'MODULE_001_EVENT_REQUEST',
          form,
          ai: aiResult ?? undefined,
          submit: submitRes,
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
          sourceLabel: 'Event Request',
          permissionToContact: !!form.permissionToContact,
          followUpNotes:
            'New event request submitted. Confirm availability, logistics, and media expectations.',
          location: [
            safeTrim(form.venueName) || safeTrim(form.eventTitle),
            safeTrim(form.city),
            safeTrim(form.state) || 'AR',
          ]
            .filter(Boolean)
            .join(' • '),
          notes: [
            safeTrim(form.organization) ? `Org: ${safeTrim(form.organization)}` : '',
            safeTrim(form.eventType) ? `Type: ${safeTrim(form.eventType)}` : '',
            showOtherType && safeTrim(form.eventTypeOther)
              ? `Other type: ${safeTrim(form.eventTypeOther)}`
              : '',
            safeTrim(form.expectedAttendance) ? `Attendance: ${safeTrim(form.expectedAttendance)}` : '',
            safeTrim(form.requestedRole) ? `Requested role: ${safeTrim(form.requestedRole)}` : '',
            safeTrim(form.mediaExpected) ? `Media expected: ${safeTrim(form.mediaExpected)}` : '',
            safeTrim(form.startDateTime) ? `Start: ${prettyDateTime(form.startDateTime)}` : '',
            safeTrim(form.endDateTime) ? `End: ${prettyDateTime(form.endDateTime)}` : '',
            form.isTimeFlexible ? 'Time flexible: Yes' : 'Time flexible: No',
            safeTrim(form.venueName) ? `Venue: ${safeTrim(form.venueName)}` : '',
            safeTrim(form.addressLine1) ? `Address: ${safeTrim(form.addressLine1)}` : '',
            safeTrim(form.addressLine2) ? safeTrim(form.addressLine2) : '',
            safeTrim(form.city) ? `City: ${safeTrim(form.city)}` : '',
            safeTrim(form.state) ? `State: ${safeTrim(form.state)}` : '',
            safeTrim(form.zip) ? `ZIP: ${safeTrim(form.zip)}` : '',
            safeTrim(form.eventDescription) ? `Details: ${safeTrim(form.eventDescription)}` : '',
            safeTrim(form.hostNotes) ? `Host notes: ${safeTrim(form.hostNotes)}` : '',
            aiResult?.drafts?.internalBrief ? `\n---\nAI Brief:\n${aiResult.drafts.internalBrief}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          automationEligible: true, // we’ll use this later for email/text automation
        },
        eventLead: {
          eventLeadText: safeTrim(form.eventTitle) || undefined,
        },
      });

      // Clean up
      clearDraft();

      nav('/thank-you');
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* HERO */}
        <Card className="bg-white text-slate-900">
          <CardHeader
            title="Invite Kelly to Your Event"
            subtitle="People-powered scheduling. You submit it here — and it goes straight into the campaign’s live follow-up queue."
          />
          <CardContent>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  What happens after you submit?
                </div>
                <ul className="text-sm text-slate-700 leading-relaxed list-disc pl-5 space-y-1">
                  <li>Your request is logged and routed into the campaign inbox.</li>
                  <li>We confirm details fast (usually within 24 hours).</li>
                  <li>Nothing gets lost — every request becomes a follow-up task.</li>
                </ul>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Button type="button" onClick={saveDraft}>
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    clearDraft();
                    // also clear form visually
                    setForm({
                      contactName: '',
                      contactEmail: '',
                      contactPhone: '',
                      preferredContactMethod: 'Email',
                      organization: '',
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
                      hostNotes: '',
                      permissionToContact: false,
                      honeypot: '',
                    });
                    setAiText('');
                    setAiResult(null);
                    setAiError(null);
                    setSubmitError(null);
                  }}
                >
                  Clear Form
                </Button>
              </div>
              <HelpText className="mt-3">
                Tip: “Save Draft” is safe on any device. It won’t interfere with typing.
              </HelpText>
            </div>
          </CardContent>
        </Card>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORM */}
          <div className="lg:col-span-2">
            <Card className="bg-white text-slate-900">
              <CardHeader
                title="Event Details"
                subtitle="If you only have partial info, submit anyway. We’ll follow up and finalize."
              />
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-8">
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

                  {/* SECTION: WHO */}
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                        Who’s inviting Kelly?
                      </h2>
                      <p className="text-sm text-slate-600">
                        We’ll use this to confirm details. No spam. No games. Just coordination.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="contactName">Full name *</Label>
                      <Input
                        id="contactName"
                        value={form.contactName}
                        onChange={(e) => update('contactName', e.target.value)}
                        placeholder="Your name"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactEmail">Email *</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={form.contactEmail}
                          onChange={(e) => update('contactEmail', e.target.value)}
                          placeholder="you@email.com"
                        />
                        {safeTrim(form.contactEmail) && !isEmailLike(form.contactEmail) ? (
                          <p className="mt-1 text-sm text-rose-600">Please enter a valid email.</p>
                        ) : null}
                      </div>

                      <div>
                        <Label htmlFor="contactPhone">Phone (optional)</Label>
                        <Input
                          id="contactPhone"
                          value={form.contactPhone}
                          onChange={(e) => update('contactPhone', e.target.value)}
                          placeholder="501-555-1234"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="preferredContactMethod">Preferred contact method</Label>
                        <Select
                          id="preferredContactMethod"
                          value={form.preferredContactMethod}
                          onChange={(e) =>
                            update('preferredContactMethod', e.target.value as PreferredContactMethod)
                          }
                        >
                          <option value="Email">Email</option>
                          <option value="Phone">Phone</option>
                          <option value="Text">Text</option>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="organization">Organization (optional)</Label>
                        <Input
                          id="organization"
                          value={form.organization}
                          onChange={(e) => update('organization', e.target.value)}
                          placeholder="Church / union / civic org / neighborhood group"
                        />
                      </div>
                    </div>
                  </section>

                  <hr className="border-slate-200" />

                  {/* SECTION: EVENT */}
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                        What’s the event?
                      </h2>
                      <p className="text-sm text-slate-600">
                        Big or small — if people are gathering, it matters.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="eventTitle">Event title *</Label>
                      <Input
                        id="eventTitle"
                        value={form.eventTitle}
                        onChange={(e) => update('eventTitle', e.target.value)}
                        placeholder="Example: Rose Bud Community Town Hall"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="eventType">Event type *</Label>
                        <Select
                          id="eventType"
                          value={form.eventType}
                          onChange={(e) => update('eventType', e.target.value as EventType)}
                        >
                          {EVENT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="expectedAttendance">Expected attendance</Label>
                        <Select
                          id="expectedAttendance"
                          value={form.expectedAttendance}
                          onChange={(e) =>
                            update('expectedAttendance', e.target.value as ExpectedAttendance)
                          }
                        >
                          <option value="1–10">1–10</option>
                          <option value="11–25">11–25</option>
                          <option value="26–50">26–50</option>
                          <option value="51–100">51–100</option>
                          <option value="100+">100+</option>
                        </Select>
                      </div>
                    </div>

                    {showOtherType ? (
                      <div>
                        <Label htmlFor="eventTypeOther">Describe the event type *</Label>
                        <Input
                          id="eventTypeOther"
                          value={form.eventTypeOther}
                          onChange={(e) => update('eventTypeOther', e.target.value)}
                          placeholder="Example: County committee breakfast"
                        />
                      </div>
                    ) : null}

                    <div>
                      <Label htmlFor="eventDescription">Event description (optional)</Label>
                      <Textarea
                        id="eventDescription"
                        rows={4}
                        value={form.eventDescription}
                        onChange={(e) => update('eventDescription', e.target.value)}
                        placeholder="Agenda, audience, topics, format, host names, anything helpful…"
                      />
                    </div>
                  </section>

                  <hr className="border-slate-200" />

                  {/* SECTION: WHEN/WHERE */}
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                        When & where?
                      </h2>
                      <p className="text-sm text-slate-600">
                        The closer the details, the faster we can confirm.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDateTime">Start date & time *</Label>
                        <Input
                          id="startDateTime"
                          type="datetime-local"
                          value={form.startDateTime}
                          onChange={(e) => update('startDateTime', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="endDateTime">End date & time (optional)</Label>
                        <Input
                          id="endDateTime"
                          type="datetime-local"
                          value={form.endDateTime}
                          onChange={(e) => update('endDateTime', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                      <input
                        id="isTimeFlexible"
                        type="checkbox"
                        className="mt-1 h-5 w-5 rounded-md"
                        checked={form.isTimeFlexible}
                        onChange={(e) => update('isTimeFlexible', e.target.checked)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="isTimeFlexible">Time is flexible</Label>
                        <HelpText>
                          Check this if the time can move — it helps us find a slot that works.
                        </HelpText>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="venueName">Venue name (optional)</Label>
                      <Input
                        id="venueName"
                        value={form.venueName}
                        onChange={(e) => update('venueName', e.target.value)}
                        placeholder="Example: White County Fairgrounds"
                      />
                    </div>

                    <div>
                      <Label htmlFor="addressLine1">Street address *</Label>
                      <Input
                        id="addressLine1"
                        value={form.addressLine1}
                        onChange={(e) => update('addressLine1', e.target.value)}
                        placeholder="123 Main St"
                      />
                    </div>

                    <div>
                      <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
                      <Input
                        id="addressLine2"
                        value={form.addressLine2}
                        onChange={(e) => update('addressLine2', e.target.value)}
                        placeholder="Suite / room / entrance notes"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={form.city}
                          onChange={(e) => update('city', e.target.value)}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          value={form.state}
                          onChange={(e) => update('state', e.target.value)}
                          placeholder="AR"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zip">ZIP *</Label>
                        <Input
                          id="zip"
                          value={form.zip}
                          onChange={(e) => update('zip', e.target.value)}
                          placeholder="ZIP"
                        />
                      </div>
                    </div>
                  </section>

                  <hr className="border-slate-200" />

                  {/* SECTION: LOGISTICS */}
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                        Logistics
                      </h2>
                      <p className="text-sm text-slate-600">
                        This helps us show up prepared — and respect the crowd’s time.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="requestedRole">Requested role</Label>
                        <Select
                          id="requestedRole"
                          value={form.requestedRole}
                          onChange={(e) => update('requestedRole', e.target.value as RequestedRole)}
                        >
                          <option value="Attend and greet attendees">Attend and greet attendees</option>
                          <option value="Speak briefly">Speak briefly</option>
                          <option value="Featured speaker">Featured speaker</option>
                          <option value="Private meeting">Private meeting</option>
                          <option value="Fundraiser ask">Fundraiser ask</option>
                          <option value="Not sure">Not sure</option>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="mediaExpected">Media expected?</Label>
                        <Select
                          id="mediaExpected"
                          value={form.mediaExpected}
                          onChange={(e) => update('mediaExpected', e.target.value as MediaExpected)}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                          <option value="Not sure">Not sure</option>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="hostNotes">Host notes (optional)</Label>
                      <Textarea
                        id="hostNotes"
                        rows={4}
                        value={form.hostNotes}
                        onChange={(e) => update('hostNotes', e.target.value)}
                        placeholder="Parking, entrance, schedule, security, who to ask for, anything we should know…"
                      />
                    </div>
                  </section>

                  <hr className="border-slate-200" />

                  {/* CONSENT + SUBMIT */}
                  <section className="space-y-4">
                    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <input
                        id="permissionToContact"
                        type="checkbox"
                        className="mt-1 h-5 w-5 rounded-md"
                        checked={form.permissionToContact}
                        onChange={(e) => update('permissionToContact', e.target.checked)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="permissionToContact">
                          I agree to be contacted about this request. *
                        </Label>
                        <HelpText>
                          Submitting does not guarantee attendance. We confirm based on schedule,
                          location, and campaign priorities — but every request is reviewed.
                        </HelpText>
                      </div>
                    </div>

                    {submitError ? <ErrorText>{submitError}</ErrorText> : null}

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                      <Button type="button" variant="secondary" onClick={() => nav('/')}>
                        Back to Home
                      </Button>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button type="button" variant="secondary" onClick={saveDraft}>
                          Save Draft
                        </Button>
                        <Button type="submit" disabled={submitting || !requiredOk}>
                          {submitting ? 'Submitting…' : 'Submit Event Request'}
                        </Button>
                      </div>
                    </div>

                    {!requiredOk ? (
                      <p className="text-sm text-slate-600">
                        Please complete required fields (marked *) to submit.
                      </p>
                    ) : null}
                  </section>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* AI ASSIST */}
          <div className="lg:col-span-1">
            <Card className="bg-white text-slate-900">
              <CardHeader
                title="Event Assist (AI)"
                subtitle="Paste an invite email, flyer text, or event notes. We’ll help fill the form and draft follow-ups."
              />
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="aiText">Paste event text</Label>
                  <Textarea
                    id="aiText"
                    rows={10}
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    placeholder="Paste the invite email, flyer details, or a text message with the event info…"
                  />
                  <HelpText>
                    We never show your API key in the browser — this runs through a secure Netlify
                    function.
                  </HelpText>
                </div>

                {aiError ? <ErrorText>{aiError}</ErrorText> : null}

                <div className="flex flex-col gap-2">
                  <Button type="button" disabled={aiLoading} onClick={() => callEventAssist('extract')}>
                    {aiLoading ? 'Working…' : 'AI Fill Form'}
                  </Button>
                  <Button type="button" variant="secondary" disabled={aiLoading} onClick={() => callEventAssist('drafts')}>
                    {aiLoading ? 'Working…' : 'Generate Confirmation + Brief'}
                  </Button>
                </div>

                {aiResult?.notes?.length ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">
                      AI Notes ({aiResult.confidence ?? 'medium'} confidence)
                    </div>
                    <ul className="mt-2 text-xs text-slate-700 list-disc pl-5 space-y-1">
                      {aiResult.notes.map((n, idx) => (
                        <li key={idx}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {aiResult?.drafts ? (
                  <div className="space-y-3">
                    {aiResult.drafts.internalBrief ? (
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Internal brief</div>
                        <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                          {aiResult.drafts.internalBrief}
                        </pre>
                      </div>
                    ) : null}

                    {aiResult.drafts.confirmationEmail ? (
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Confirmation email draft</div>
                        <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                          {aiResult.drafts.confirmationEmail}
                        </pre>
                      </div>
                    ) : null}

                    {aiResult.drafts.confirmationText ? (
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Confirmation text draft</div>
                        <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                          {aiResult.drafts.confirmationText}
                        </pre>
                      </div>
                    ) : null}

                    {aiResult.drafts.followUpChecklist ? (
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Follow-up checklist</div>
                        <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                          {aiResult.drafts.followUpChecklist}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Container>
  );
}