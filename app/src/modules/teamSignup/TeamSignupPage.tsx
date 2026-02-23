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

type HoursPerWeek = '1-2 hours' | '3-4 hours' | '6-8 hours' | 'More than 8 hours' | 'Other';

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
type IntakeStatus = 'DRAFT' | 'IN_PROGRESS' | 'READY' | 'SUBMITTING' | 'SUBMITTED' | 'ERROR';

const DRAFT_KEY = 'KG_SOS_TEAM_SIGNUP_DRAFT_v1';
const STEP_ORDER: StepId[] = ['CONTACT', 'AVAILABILITY', 'TEAMS', 'OTHER', 'REVIEW'];

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function isEmailLike(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function titleCaseStep(step: StepId) {
  switch (step) {
    case 'CONTACT':
      return 'Contact';
    case 'AVAILABILITY':
      return 'Availability';
    case 'TEAMS':
      return 'Teams';
    case 'OTHER':
      return 'Other';
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

const OPTIONS = {
  creativeDigitalTeam: [
    'Canva Template Designer: Design reusable templates for graphics, flyers, and social posts to keep the campaign’s look consistent and professional.',
    'Vertical Video Creator/Editor (CapCut): Edit short vertical videos quickly for TikTok, Instagram, and Facebook using campaign-provided clips and captions.',
    'TikTok & Instagram Content Creator: Help grow the campaign’s presence on TikTok and Instagram with creative, authentic, people-first content.',
    'Twitter & Bluesky Social Content Creator: Stay abreast of political and community news. Coordinate social posts as needed.',
  ],
  communicationsPRTeam: [
    'Letter to the Editor Team: Help recruit and support community members to write letters to local papers, sharing positive stories and civic-minded messages.',
    'Volunteer Staff Writer: Help shape the voice of the campaign through clear, compelling writing. You’ll draft press releases, newsletter pieces, and Substack articles that share our message of civility, service, and people-powered leadership. Work closely with Kelly and the communications team to turn real stories from across Arkansas into content that informs and inspires.',
  ],
  constituentServicesTeam: [
    'Constituent Issue Tracker & Research Assistant: Track questions and concerns from voters and connect them to the right state offices for help—bringing real service back into public service.',
  ],
  democracyRightsTeam: [
    'Restorative Rights Team: Assist with outreach and education around restoring voting rights and ensuring every Arkansan can fully participate in democracy.',
    'Voter Registration Team: Help develop and execute our statewide voter registration plan—partnering with schools, churches, and community groups to expand access.',
  ],
  fieldEventsTeam: [
    'Button-Making Committee: Create and distribute campaign buttons and materials that help supporters show their pride and start conversations.',
    'Event Lead: Coordinate logistics and volunteers for local campaign events, from meetups to election-day celebrations.',
    'Popcorn Party Host: Host informal “popcorn party” or community gatherings to talk local issues with civility, share ideas, and connect neighbors.',
    'T-Shirt Design Team: We LOVE fun t-shirts and we want to get them out everywhere. Help us design a fun series for voters',
  ],
  financeFundraisingTeam: [
    'Finance & Compliance Team: Track donations, invoices, and expenses to keep our campaign finances organized and compliant with state reporting.',
    'Grassroots Fundraising Lead (Good Change Model): Lead local fundraising efforts in your area—organizing small events or creative drives to raise awareness and support. Commission-based.',
    'House Party Host: Host a fundraising "house party", inviting a group of friends to come together with the mission of raising money for the campaign.',
  ],
  operationsTeam: [
    'Scheduling Support: Assist in keeping Kelly’s campaign calendar organized and updated, including events, meetings, and deadlines.',
    'Travel Coordination: Help plan and coordinate travel logistics for campaign stops across Arkansas.',
  ],
  outreachOrganizingTeam: [
    'Business-to-Business Outreach Team: Connect with small business owners and local leaders who care about fair policy, community growth, and civic engagement.',
    'Nonprofit Outreach Committee: Build relationships with nonprofits doing good work across Arkansas to align on shared community goals.',
    'Church & Faith Outreach Coordinator: Connect with churches and faith leaders to promote service, compassion, and civic responsibility through trusted relationships.',
    'Union Outreach Team: Engage union members and labor allies around shared values of fairness, dignity, and democracy.',
    'Youth Activation: Mobilize young voters and volunteers—leading outreach, school engagement, and social content that amplifies youth voices.',
    'Get out the Vote Team: Work with the team to create a robust plan to get Arkansas voters to the polls.',
    "Power of 5 Team Leader: If you're ready to organize with your five (at least) best friends and activate your own community, sign up to attend a short training to learn more.",
    'Surrogate Speaker: This team will represent Kelly and speak on her behalf when she is unable to be present. Must be comfortable speaking in public.',
    'Outbound Call Team: Call constituents to let them know about upcoming events and encourage participation',
    'Canvassing Team: This team is for you if knocking on doors is your thing.',
    'Encouragement & Appreciation Team: Your job is to look for opportunities to encourage Kelly and the other volunteers. Lift someone up and thank them for doing good work online, text and handwritten notes are great.',
    "Prayer Leadership Team: Each week at the end of the volunteer call, we'll ask one volunteer to lead the team in prayer. We will do this at the end so if prayer isn't for you, you can drop prior to our weekly prayer time.",
  ],
  socialMediaStorytellingTeam: [
    '“Voices from the People” Content Coordinator: Manage our weekly social series sharing messages and stories from Arkansans in their own words.',
    'Social Media Monitoring Volunteer: Help keep an eye on social media mentions and comments so we don’t miss important conversations or engagement opportunities.',
    'Content Creator: Create meaningful content to be used througout the campaign across multiple social channels',
    "Storytelling Through the Arts: Coordinating with artists across the state to amplify local art supporting Kelly's campaign",
  ],
} as const;

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

  const [step, setStep] = useState<StepId>('CONTACT');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<IntakeStatus>('IN_PROGRESS');
  const [requestId, setRequestId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const didHydrateDraft = useRef(false);

  const [form, setForm] = useState<FormState>(() => ({
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

  function toggleInArray(key: keyof Pick<
    FormState,
    | 'creativeDigitalTeam'
    | 'communicationsPRTeam'
    | 'constituentServicesTeam'
    | 'democracyRightsTeam'
    | 'fieldEventsTeam'
    | 'financeFundraisingTeam'
    | 'operationsTeam'
    | 'outreachOrganizingTeam'
    | 'socialMediaStorytellingTeam'
  >, value: string) {
    setForm((prev) => {
      const current = prev[key] as string[];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next } as FormState;
    });
    setStatus((s) => (s === 'SUBMITTED' ? 'SUBMITTED' : 'IN_PROGRESS'));
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

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ step, updatedAt: new Date().toISOString(), data: form })
      );
    } catch {
      // ignore
    }
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
    if (!safeTrim(form.hoursPerWeek)) return false;
    if (form.hoursPerWeek === 'Other' && !safeTrim(form.hoursPerWeekOther)) return false;
    if (!participationOk) return false;
    if (!form.permissionToContact) return false;
    return true;
  }, [form, participationOk]);

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
      require('email', 'Email is required.');
      if (safeTrim(form.email) && !isEmailLike(form.email)) {
        errs.email = 'Please enter a valid email address.';
      }
      require('name', 'Name is required.');
      require('location', 'City/County is required.');
    }

    if (current === 'AVAILABILITY') {
      require('hoursPerWeek', 'Please select an availability estimate.');
      if (form.hoursPerWeek === 'Other') {
        require('hoursPerWeekOther', 'Please describe your availability.');
      }
    }

    if (current === 'TEAMS') {
      // No required fields here (participation can be “stay in touch” or “other contribution”)
    }

    if (current === 'OTHER') {
      if (!participationOk) {
        errs._participation = 'Please select at least one team role, choose “Stay in touch”, or tell us how you can help.';
      }
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

    for (const s of ['CONTACT', 'AVAILABILITY', 'OTHER'] as StepId[]) {
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
        moduleId: 'MODULE_002_TEAM_SIGNUP',
        honeypot: form.honeypot,
        data: {
          email: form.email,
          phone: safeTrim(form.phone) || undefined,
          name: form.name,
          location: form.location,
          hoursPerWeek: form.hoursPerWeek,
          hoursPerWeekOther: form.hoursPerWeek === 'Other' ? form.hoursPerWeekOther : undefined,

          creativeDigitalTeam: form.creativeDigitalTeam,
          communicationsPRTeam: form.communicationsPRTeam,
          constituentServicesTeam: form.constituentServicesTeam,
          democracyRightsTeam: form.democracyRightsTeam,
          fieldEventsTeam: form.fieldEventsTeam,
          financeFundraisingTeam: form.financeFundraisingTeam,
          operationsTeam: form.operationsTeam,
          outreachOrganizingTeam: form.outreachOrganizingTeam,
          socialMediaStorytellingTeam: form.socialMediaStorytellingTeam,

          stayInTouch: form.stayInTouch,
          otherContribution: safeTrim(form.otherContribution) || undefined,
          eventInviteDetails: safeTrim(form.eventInviteDetails) || undefined,
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

  function CheckboxList({
    title,
    items,
    selected,
    onToggle,
  }: {
    title: string;
    items: readonly string[];
    selected: string[];
    onToggle: (value: string) => void;
  }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="space-y-3">
          {items.map((item) => {
            const checked = selected.includes(item);
            return (
              <label key={item} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded-md border-slate-300"
                  checked={checked}
                  onChange={() => onToggle(item)}
                />
                <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Join a People Powered Team"
          subtitle="Choose how you’d like to help. You don’t need to be an expert — you just need to care."
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
              <Section title="Contact" subtitle="This lets the team follow up and coordinate next steps.">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@email.com"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                  />
                  <FieldHint id="email" />
                </div>

                <div>
                  <Label htmlFor="phone">Contact Phone Number (text & call)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="501-555-1234"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">What is your name?</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                    />
                    <FieldHint id="name" />
                  </div>

                  <div>
                    <Label htmlFor="location">Where do you live? City/County</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="City / County"
                      value={form.location}
                      onChange={(e) => update('location', e.target.value)}
                    />
                    <FieldHint id="location" />
                  </div>
                </div>
              </Section>
            ) : null}

            {step === 'AVAILABILITY' ? (
              <Section
                title="Availability"
                subtitle="Approximately how many hours per week do you have available to volunteer?"
              >
                <div>
                  <Label htmlFor="hoursPerWeek">Hours per week</Label>
                  <Select
                    id="hoursPerWeek"
                    name="hoursPerWeek"
                    value={form.hoursPerWeek}
                    onChange={(e) => update('hoursPerWeek', e.target.value as HoursPerWeek)}
                  >
                    <option value="1-2 hours">1-2 hours</option>
                    <option value="3-4 hours">3-4 hours</option>
                    <option value="6-8 hours">6-8 hours</option>
                    <option value="More than 8 hours">More than 8 hours</option>
                    <option value="Other">Other</option>
                  </Select>
                  <FieldHint id="hoursPerWeek" />
                </div>

                {form.hoursPerWeek === 'Other' ? (
                  <div>
                    <Label htmlFor="hoursPerWeekOther">Other</Label>
                    <Input
                      id="hoursPerWeekOther"
                      name="hoursPerWeekOther"
                      placeholder="Example: 10 hours every other week"
                      value={form.hoursPerWeekOther}
                      onChange={(e) => update('hoursPerWeekOther', e.target.value)}
                    />
                    <FieldHint id="hoursPerWeekOther" />
                  </div>
                ) : null}
              </Section>
            ) : null}

            {step === 'TEAMS' ? (
              <Section
                title="Volunteer roles"
                subtitle="Select any roles that fit. You can choose more than one."
              >
                <CheckboxList
                  title="Creative & Digital Team"
                  items={OPTIONS.creativeDigitalTeam}
                  selected={form.creativeDigitalTeam}
                  onToggle={(v) => toggleInArray('creativeDigitalTeam', v)}
                />

                <CheckboxList
                  title="Communication & Public Relations Team"
                  items={OPTIONS.communicationsPRTeam}
                  selected={form.communicationsPRTeam}
                  onToggle={(v) => toggleInArray('communicationsPRTeam', v)}
                />

                <CheckboxList
                  title="Constituent Services Team"
                  items={OPTIONS.constituentServicesTeam}
                  selected={form.constituentServicesTeam}
                  onToggle={(v) => toggleInArray('constituentServicesTeam', v)}
                />

                <CheckboxList
                  title="Democracy & Rights Team"
                  items={OPTIONS.democracyRightsTeam}
                  selected={form.democracyRightsTeam}
                  onToggle={(v) => toggleInArray('democracyRightsTeam', v)}
                />

                <CheckboxList
                  title="Field & Events Team"
                  items={OPTIONS.fieldEventsTeam}
                  selected={form.fieldEventsTeam}
                  onToggle={(v) => toggleInArray('fieldEventsTeam', v)}
                />

                <CheckboxList
                  title="Finance & Fundraising Team"
                  items={OPTIONS.financeFundraisingTeam}
                  selected={form.financeFundraisingTeam}
                  onToggle={(v) => toggleInArray('financeFundraisingTeam', v)}
                />

                <CheckboxList
                  title="Operations Team"
                  items={OPTIONS.operationsTeam}
                  selected={form.operationsTeam}
                  onToggle={(v) => toggleInArray('operationsTeam', v)}
                />

                <CheckboxList
                  title="Outreach & Organizing Team"
                  items={OPTIONS.outreachOrganizingTeam}
                  selected={form.outreachOrganizingTeam}
                  onToggle={(v) => toggleInArray('outreachOrganizingTeam', v)}
                />

                <CheckboxList
                  title="Social Media & Storytelling Team"
                  items={OPTIONS.socialMediaStorytellingTeam}
                  selected={form.socialMediaStorytellingTeam}
                  onToggle={(v) => toggleInArray('socialMediaStorytellingTeam', v)}
                />

                <HelpText>
                  If you’re not sure yet, you can choose “Stay in touch” on the next step.
                </HelpText>
              </Section>
            ) : null}

            {step === 'OTHER' ? (
              <Section
                title="Final questions"
                subtitle="If you don’t see the right fit above, tell us what we’re missing."
              >
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <input
                    id="stayInTouch"
                    name="stayInTouch"
                    type="checkbox"
                    className="mt-1 h-5 w-5 rounded-md"
                    checked={form.stayInTouch}
                    onChange={(e) => update('stayInTouch', e.target.checked)}
                  />
                  <div>
                    <Label htmlFor="stayInTouch">Just Stay In Touch</Label>
                    <HelpText>
                      I'm not ready to volunteer just yet but sign me up to receive emails and stay updated on the campaign's progress.
                    </HelpText>
                  </div>
                </div>

                {fieldErrors._participation ? (
                  <p className="text-sm text-rose-700">{fieldErrors._participation}</p>
                ) : null}

                <div>
                  <Label htmlFor="otherContribution">
                    I don't see anything on this initial list but here's how I can contribute to this people-powered campaign.
                  </Label>
                  <Textarea
                    id="otherContribution"
                    name="otherContribution"
                    rows={4}
                    placeholder="Tell us what you’re good at and how you’d like to help."
                    value={form.otherContribution}
                    onChange={(e) => update('otherContribution', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="eventInviteDetails">
                    Do you have an event coming up you'd like to invite Kelly to? Please include the County, event details and point of contact.
                  </Label>
                  <Textarea
                    id="eventInviteDetails"
                    name="eventInviteDetails"
                    rows={4}
                    placeholder="Optional — include county, date/time, venue, contact person."
                    value={form.eventInviteDetails}
                    onChange={(e) => update('eventInviteDetails', e.target.value)}
                  />
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
                      I agree that the campaign may contact me about volunteer opportunities and next steps.
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
              <Section
                title="Review & Submit"
                subtitle="Confirm details before submitting. This creates a tracking record and notifies the team."
              >
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <ReviewRow label="Name" value={safeTrim(form.name)} />
                  <ReviewRow label="Email" value={safeTrim(form.email)} />
                  <ReviewRow label="Phone" value={safeTrim(form.phone) ? safeTrim(form.phone) : 'Not provided'} />
                  <ReviewRow label="City/County" value={safeTrim(form.location)} />
                  <ReviewRow
                    label="Availability"
                    value={
                      form.hoursPerWeek === 'Other'
                        ? `Other — ${safeTrim(form.hoursPerWeekOther)}`
                        : form.hoursPerWeek
                    }
                  />
                  <ReviewRow
                    label="Selections"
                    value={
                      hasAnySelection(form)
                        ? 'Team roles selected'
                        : form.stayInTouch
                          ? 'Stay in touch'
                          : safeTrim(form.otherContribution)
                            ? 'Other contribution provided'
                            : 'None'
                    }
                  />
                  <ReviewRow
                    label="Other contribution"
                    value={safeTrim(form.otherContribution) ? safeTrim(form.otherContribution) : 'Not provided'}
                  />
                  <ReviewRow
                    label="Event invite details"
                    value={safeTrim(form.eventInviteDetails) ? safeTrim(form.eventInviteDetails) : 'Not provided'}
                  />
                  <ReviewRow label="Consent" value={form.permissionToContact ? 'Confirmed' : 'Not confirmed'} />
                </div>

                {!requiredForSubmit ? (
                  <ErrorText>
                    This signup is not ready to submit. Please go back and complete the required fields.
                  </ErrorText>
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
                      {submitting ? 'Submitting…' : 'Submit Signup'}
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
