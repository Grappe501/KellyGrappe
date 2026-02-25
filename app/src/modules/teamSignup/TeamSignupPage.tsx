import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardContent, CardHeader } from '../../shared/components/Card';
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

type HoursPerWeek =
  | '1-2 hours'
  | '3-4 hours'
  | '6-8 hours'
  | 'More than 8 hours'
  | 'Other';

type FormState = {
  email: string;
  phone: string;
  name: string;
  location: string;
  hoursPerWeek: HoursPerWeek;
  hoursPerWeekOther: string;

  creativeDigitalTeam: string[];
  communicationsPRTeam: string[];
  constituentServicesTeam: string[];
  democracyRightsTeam: string[];
  fieldEventsTeam: string[];
  financeFundraisingTeam: string[];
  operationsTeam: string[];
  outreachOrganizingTeam: string[];
  socialMediaStorytellingTeam: string[];

  stayInTouch: boolean;
  otherContribution: string;
  eventInviteDetails: string;

  permissionToContact: boolean;
  honeypot: string;
};

type StepId = 'CONTACT' | 'AVAILABILITY' | 'TEAMS' | 'OTHER' | 'REVIEW';
type IntakeStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'READY'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'ERROR';

const DRAFT_KEY = 'KG_SOS_TEAM_SIGNUP_DRAFT_v2'; // version bump to clear bad drafts
const STEP_ORDER: StepId[] = [
  'CONTACT',
  'AVAILABILITY',
  'TEAMS',
  'OTHER',
  'REVIEW',
];

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function isEmailLike(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function hasAnySelection(form: FormState) {
  const arrays = [
    form.creativeDigitalTeam,
    form.communicationsPRTeam,
    form.constituentServicesTeam,
    form.democracyRightsTeam,
    form.fieldEventsTeam,
    form.financeFundraisingTeam,
    form.operationsTeam,
    form.outreachOrganizingTeam,
    form.socialMediaStorytellingTeam,
  ];
  return arrays.some((a) => a.length > 0);
}

export default function TeamSignupPage() {
  const nav = useNavigate();
  const didHydrateDraft = useRef(false);

  const [step, setStep] = useState<StepId>('CONTACT');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<IntakeStatus>('IN_PROGRESS');
  const [requestId, setRequestId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormState>({
    email: '',
    phone: '',
    name: '',
    location: '',
    hoursPerWeek: '1-2 hours',
    hoursPerWeekOther: '',

    creativeDigitalTeam: [],
    communicationsPRTeam: [],
    constituentServicesTeam: [],
    democracyRightsTeam: [],
    fieldEventsTeam: [],
    financeFundraisingTeam: [],
    operationsTeam: [],
    outreachOrganizingTeam: [],
    socialMediaStorytellingTeam: [],

    stayInTouch: false,
    otherContribution: '',
    eventInviteDetails: '',

    permissionToContact: false,
    honeypot: '',
  });

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const copy = { ...prev };
      delete copy[key as string];
      return copy;
    });
  }

  /* -------------------- Draft Hydration -------------------- */

  useEffect(() => {
    if (didHydrateDraft.current) return;
    didHydrateDraft.current = true;

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.data) setForm((p: FormState) => ({ ...p, ...parsed.data }));
      if (parsed?.step && STEP_ORDER.includes(parsed.step)) {
        setStep(parsed.step);
      }
      setStatus('DRAFT');
    } catch {}
  }, []);

  /* -------------------- Draft Save (FIXED) -------------------- */

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            step,
            updatedAt: new Date().toISOString(),
            data: form,
          })
        );
      } catch {}
    }, 400);

    return () => clearTimeout(timeout);
  }, [form, step]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setStatus('IN_PROGRESS');
  }

  /* -------------------- Validation -------------------- */

  const participationOk = useMemo(() => {
    if (hasAnySelection(form)) return true;
    if (form.stayInTouch) return true;
    if (safeTrim(form.otherContribution)) return true;
    return false;
  }, [form]);

  const requiredForSubmit = useMemo(() => {
    if (!safeTrim(form.email) || !isEmailLike(form.email)) return false;
    if (!safeTrim(form.name)) return false;
    if (!safeTrim(form.location)) return false;
    if (!form.permissionToContact) return false;
    if (!participationOk) return false;
    return true;
  }, [form, participationOk]);

  /* -------------------- Submit -------------------- */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!requiredForSubmit) {
      setError('Please complete required fields.');
      return;
    }

    try {
      setSubmitting(true);

      const res = await submitModule({
        moduleId: 'MODULE_002_TEAM_SIGNUP',
        honeypot: form.honeypot,
        data: form,
      });

      setRequestId(res.requestId);
      setStatus('SUBMITTED');
      clearDraft();
      nav('/thank-you');
    } catch (err: any) {
      setError(err?.message ?? 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  /* -------------------- UI -------------------- */

  return (
    <Container>
      <Card>
        <CardHeader
          title="Join a People Powered Team"
          subtitle="Choose how you'd like to help."
        />
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="location">City / County</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
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
              <Label htmlFor="permissionToContact">
                I agree to be contacted.
              </Label>
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Signup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}