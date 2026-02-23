import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import { Button, ErrorText, HelpText, Input, Label, Select, Textarea } from '../../shared/components/FormControls';
import { submitModule } from '../../shared/utils/apiClient';

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
  startDateTime: string;
  endDateTime: string;
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

export default function EventRequestPage() {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    honeypot: ''
  }));

  const showOtherType = form.eventType === 'Other';

  const canSubmit = useMemo(() => {
    if (!form.permissionToContact) return false;
    if (!form.contactName.trim()) return false;
    if (!form.contactEmail.trim()) return false;
    if (!form.eventTitle.trim()) return false;
    if (!form.startDateTime.trim()) return false;
    if (!form.addressLine1.trim()) return false;
    if (!form.city.trim()) return false;
    if (!form.state.trim()) return false;
    if (!form.zip.trim()) return false;
    if (showOtherType && !form.eventTypeOther.trim()) return false;
    return true;
  }, [form, showOtherType]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError('Please complete the required fields and confirm the consent checkbox.');
      return;
    }

    try {
      setSubmitting(true);

      // NOTE: Turnstile token can be added later; keep payload shape stable.
      await submitModule({
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
          permissionToContact: form.permissionToContact
        }
      });

      nav('/thank-you');
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Event Request"
          subtitle="If people are gathering in your community and you’re willing to invite Kelly to attend, please fill out this request."
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

            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">About You</h2>

              <div>
                <Label htmlFor="contactName">Full Name</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  placeholder="Enter your name"
                  value={form.contactName}
                  onChange={(e) => update('contactName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="contactEmail">Email Address</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={form.contactEmail}
                  onChange={(e) => update('contactEmail', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="contactPhone">Phone Number (optional)</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  placeholder="501-555-1234"
                  value={form.contactPhone}
                  onChange={(e) => update('contactPhone', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                <Select
                  id="preferredContactMethod"
                  name="preferredContactMethod"
                  value={form.preferredContactMethod}
                  onChange={(e) => update('preferredContactMethod', e.target.value as FormState['preferredContactMethod'])}
                >
                  <option value="Email">Email</option>
                  <option value="Phone">Phone</option>
                  <option value="Text">Text</option>
                </Select>
              </div>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Event Information</h2>

              <div>
                <Label htmlFor="eventTitle">Event Title</Label>
                <Input
                  id="eventTitle"
                  name="eventTitle"
                  placeholder="Bryant High School Basketball Game"
                  value={form.eventTitle}
                  onChange={(e) => update('eventTitle', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Select
                  id="eventType"
                  name="eventType"
                  value={form.eventType}
                  onChange={(e) => update('eventType', e.target.value as FormState['eventType'])}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>

              {showOtherType ? (
                <div>
                  <Label htmlFor="eventTypeOther">Please describe the event type</Label>
                  <Input
                    id="eventTypeOther"
                    name="eventTypeOther"
                    placeholder="Describe the event"
                    value={form.eventTypeOther}
                    onChange={(e) => update('eventTypeOther', e.target.value)}
                  />
                </div>
              ) : null}

              <div>
                <Label htmlFor="eventDescription">Event Description (optional)</Label>
                <Textarea
                  id="eventDescription"
                  name="eventDescription"
                  placeholder="Tell us anything helpful about this event..."
                  rows={4}
                  value={form.eventDescription}
                  onChange={(e) => update('eventDescription', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="expectedAttendance">Estimated Attendance</Label>
                <Select
                  id="expectedAttendance"
                  name="expectedAttendance"
                  value={form.expectedAttendance}
                  onChange={(e) => update('expectedAttendance', e.target.value as FormState['expectedAttendance'])}
                >
                  <option value="1–10">1–10</option>
                  <option value="11–25">11–25</option>
                  <option value="26–50">26–50</option>
                  <option value="51–100">51–100</option>
                  <option value="100+">100+</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="requestedRole">What would you like Kelly to do at this event?</Label>
                <Select
                  id="requestedRole"
                  name="requestedRole"
                  value={form.requestedRole}
                  onChange={(e) => update('requestedRole', e.target.value as FormState['requestedRole'])}
                >
                  <option value="Attend and greet attendees">Attend and greet attendees</option>
                  <option value="Speak briefly">Speak briefly</option>
                  <option value="Featured speaker">Featured speaker</option>
                  <option value="Private meeting">Private meeting</option>
                  <option value="Fundraiser ask">Fundraiser ask</option>
                  <option value="Not sure">Not sure</option>
                </Select>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">When &amp; Where</h2>

              <div>
                <Label htmlFor="startDateTime">Event Date &amp; Start Time</Label>
                <Input
                  id="startDateTime"
                  name="startDateTime"
                  type="datetime-local"
                  value={form.startDateTime}
                  onChange={(e) => update('startDateTime', e.target.value)}
                />
                <HelpText>If you don’t know the exact time yet, choose your best estimate and check “Time is flexible.”</HelpText>
              </div>

              <div>
                <Label htmlFor="endDateTime">End Time (optional)</Label>
                <Input
                  id="endDateTime"
                  name="endDateTime"
                  type="datetime-local"
                  value={form.endDateTime}
                  onChange={(e) => update('endDateTime', e.target.value)}
                />
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-950/40 p-4 ring-1 ring-white/10">
                <input
                  id="isTimeFlexible"
                  name="isTimeFlexible"
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded-md bg-slate-950/60 ring-1 ring-white/10"
                  checked={form.isTimeFlexible}
                  onChange={(e) => update('isTimeFlexible', e.target.checked)}
                />
                <div>
                  <Label htmlFor="isTimeFlexible">Time is flexible</Label>
                  <HelpText>Select this if the start time could change.</HelpText>
                </div>
              </div>

              <div>
                <Label htmlFor="venueName">Venue Name (if applicable)</Label>
                <Input
                  id="venueName"
                  name="venueName"
                  placeholder="First Baptist Church"
                  value={form.venueName}
                  onChange={(e) => update('venueName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="addressLine1">Street Address</Label>
                <Input
                  id="addressLine1"
                  name="addressLine1"
                  value={form.addressLine1}
                  onChange={(e) => update('addressLine1', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="addressLine2">Address Line 2 (optional)</Label>
                <Input
                  id="addressLine2"
                  name="addressLine2"
                  value={form.addressLine2}
                  onChange={(e) => update('addressLine2', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value.toUpperCase())}
                    maxLength={2}
                  />
                </div>

                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    name="zip"
                    value={form.zip}
                    onChange={(e) => update('zip', e.target.value)}
                    inputMode="numeric"
                    pattern="\d{5}"
                    maxLength={5}
                  />
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Final Details</h2>

              <div>
                <Label htmlFor="mediaExpected">Will media be present?</Label>
                <Select
                  id="mediaExpected"
                  name="mediaExpected"
                  value={form.mediaExpected}
                  onChange={(e) => update('mediaExpected', e.target.value as FormState['mediaExpected'])}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                  <option value="Not sure">Not sure</option>
                </Select>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-950/40 p-4 ring-1 ring-white/10">
                <input
                  id="permissionToContact"
                  name="permissionToContact"
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded-md bg-slate-950/60 ring-1 ring-white/10"
                  checked={form.permissionToContact}
                  onChange={(e) => update('permissionToContact', e.target.checked)}
                />
                <div>
                  <Label htmlFor="permissionToContact">
                    I understand this is a request and does not guarantee attendance. The campaign may contact me for additional information.
                  </Label>
                </div>
              </div>
            </section>

            {error ? <ErrorText>{error}</ErrorText> : null}

            <div className="space-y-3">
              <Button type="submit" disabled={submitting || !canSubmit}>
                {submitting ? 'Submitting…' : 'Submit Event Request'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => nav('/')}>
                Back
              </Button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              By submitting, you confirm the information is accurate to the best of your knowledge.
            </p>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
