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

/* -----------------------------
   Types
-------------------------------- */

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
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  preferredContactMethod: PreferredContactMethod;
  organization: string;

  eventTitle: string;
  eventType: EventType;
  eventTypeOther: string;
  eventDescription: string;
  expectedAttendance: ExpectedAttendance;

  startDateTime: string;
  endDateTime: string;
  isTimeFlexible: boolean;

  venueName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;

  requestedRole: RequestedRole;
  mediaExpected: MediaExpected;
  hostNotes: string;

  permissionToContact: boolean;
  honeypot: string;
};

/* -----------------------------
   Helpers
-------------------------------- */

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function isEmailLike(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/* -----------------------------
   Component
-------------------------------- */

export default function EventRequestPage() {
  const nav = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
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

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const requiredOk = useMemo(() => {
    return (
      form.permissionToContact &&
      safeTrim(form.contactName) &&
      isEmailLike(form.contactEmail) &&
      safeTrim(form.eventTitle) &&
      safeTrim(form.startDateTime) &&
      safeTrim(form.addressLine1) &&
      safeTrim(form.city) &&
      safeTrim(form.state) &&
      safeTrim(form.zip)
    );
  }, [form]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!requiredOk) {
      setSubmitError('Please complete required fields and confirm consent.');
      return;
    }

    try {
      setSubmitting(true);

      const submitRes = await submitModule({
        moduleId: 'MODULE_001_EVENT_REQUEST',
        honeypot: form.honeypot,
        data: form,
      });

      await processIntake({
        originType: 'EVENT_REQUEST',
        originRef: submitRes.requestId,
        rawPayload: form,
        contact: {
          fullName: form.contactName,
          email: form.contactEmail,
          phone: form.contactPhone || undefined,
          city: form.city,
          state: form.state,
        },
        followUp: {
          followUpNeeded: true,
          sourceLabel: 'Event Request',
          permissionToContact: form.permissionToContact,
          followUpNotes: 'New event request submitted.',
        },
      });

      nav('/thank-you');
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Invite Kelly to Your Event"
          subtitle="Submit once. We follow up fast."
        />
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">

            <div>
              <Label htmlFor="contactName">Full name *</Label>
              <Input
                id="contactName"
                value={form.contactName}
                onChange={(e) => update('contactName', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="contactEmail">Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
              />
              {safeTrim(form.contactEmail) &&
              !isEmailLike(form.contactEmail) ? (
                <ErrorText>Please enter a valid email.</ErrorText>
              ) : null}
            </div>

            <div>
              <Label htmlFor="eventTitle">Event title *</Label>
              <Input
                id="eventTitle"
                value={form.eventTitle}
                onChange={(e) => update('eventTitle', e.target.value)}
              />
            </div>

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
              <Label htmlFor="addressLine1">Street address *</Label>
              <Input
                id="addressLine1"
                value={form.addressLine1}
                onChange={(e) => update('addressLine1', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="zip">ZIP *</Label>
              <Input
                id="zip"
                value={form.zip}
                onChange={(e) => update('zip', e.target.value)}
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.permissionToContact}
                onChange={(e) =>
                  update('permissionToContact', e.target.checked)
                }
              />
              <HelpText>
                I agree to be contacted about this request.
              </HelpText>
            </div>

            {submitError ? <ErrorText>{submitError}</ErrorText> : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={!requiredOk || submitting}>
                {submitting ? 'Submitting…' : 'Submit Event Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}