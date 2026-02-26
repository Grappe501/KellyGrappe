import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, ErrorText } from '../../shared/components/FormControls';
import WizardLayout from './wizard/WizardLayout';
import AiAssistPanel from './wizard/AiAssistPanel';

import StepWho from './wizard/steps/StepWho';
import StepBasics from './wizard/steps/StepBasics';
import StepSchedule from './wizard/steps/StepSchedule';
import StepLogistics from './wizard/steps/StepLogistics';
import StepReview from './wizard/steps/StepReview';

import type { AssistResponse, CalendarConflictResult, EventRequestFormState } from './types';
import { loadDraft, saveDraft, clearDraft } from './utils/draft';
import { safeTrim, prettyDateTime } from './utils/formatting';
import { validateStep, hasErrors } from './utils/validation';

import { submitModule } from '../../shared/utils/apiClient';
import { processIntake } from '../../shared/utils/intakePipeline';
import { useWizard } from './wizard/useWizard';

function defaultForm(): EventRequestFormState {
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
}

export default function EventRequestPage() {
  const nav = useNavigate();

  const [form, setForm] = useState<EventRequestFormState>(() => loadDraft() ?? defaultForm());
  const [aiResult, setAiResult] = useState<AssistResponse | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [checkingCalendar, setCheckingCalendar] = useState(false);
  const [conflictResult, setConflictResult] = useState<CalendarConflictResult | null>(null);

  const showOtherType = form.eventType === 'Other';

  function update<K extends keyof EventRequestFormState>(key: K, value: EventRequestFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyExtracted(extracted?: Partial<EventRequestFormState>) {
    if (!extracted) return;
    setForm((prev) => {
      const next: EventRequestFormState = { ...prev };
      (Object.keys(extracted) as (keyof EventRequestFormState)[]).forEach((k) => {
        const v = extracted[k];
        if (typeof v === 'undefined' || v === null) return;
        if (k === 'honeypot') return;

        const prevVal = (next[k] as any) ?? '';
        const incoming = v as any;

        const prevIsEmpty = typeof prevVal === 'string' ? safeTrim(prevVal) === '' : prevVal === false;
        const incomingIsEmpty = typeof incoming === 'string' ? safeTrim(incoming) === '' : incoming === false;

        if (!incomingIsEmpty && (prevIsEmpty || k === 'eventDescription' || k === 'hostNotes')) {
          (next[k] as any) = incoming;
        }
      });
      return next;
    });
  }

  async function checkCalendar() {
    // Phase 1: optional function. If not present, we simply show a helpful message.
    setConflictResult(null);
    const e = validateStep('schedule', form);
    if (hasErrors(e)) {
      setConflictResult({
        ok: false,
        conflict: false,
        message: 'Fill out the schedule fields first, then try calendar check again.',
      });
      return;
    }

    try {
      setCheckingCalendar(true);
      const res = await fetch('/.netlify/functions/calendar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDateTime: form.startDateTime,
          endDateTime: form.endDateTime || null,
          location: {
            venueName: form.venueName || null,
            addressLine1: form.addressLine1,
            addressLine2: form.addressLine2 || null,
            city: form.city,
            state: form.state,
            zip: form.zip,
          },
          isTimeFlexible: form.isTimeFlexible,
        }),
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => '');
        throw new Error(raw || 'Calendar check is not available in this environment.');
      }

      const json = (await res.json()) as CalendarConflictResult;
      setConflictResult(json);
    } catch (err: any) {
      setConflictResult({
        ok: false,
        conflict: false,
        message: err?.message ?? 'Calendar check is not available right now.',
      });
    } finally {
      setCheckingCalendar(false);
    }
  }

  async function finalSubmit() {
    setSubmitError(null);

    const reviewErrors = validateStep('review', form);
    if (hasErrors(reviewErrors)) {
      setSubmitError('Please complete the required fields and confirm consent.');
      return;
    }

    try {
      setSubmitting(true);

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
          followUpNotes: 'New event request submitted. Confirm availability, logistics, and media expectations.',
          location: [
            safeTrim(form.venueName) || safeTrim(form.eventTitle),
            safeTrim(form.city),
            safeTrim(form.state) || 'AR',
          ].filter(Boolean).join(' • '),
          notes: [
            safeTrim(form.organization) ? `Org: ${safeTrim(form.organization)}` : '',
            safeTrim(form.eventType) ? `Type: ${safeTrim(form.eventType)}` : '',
            showOtherType && safeTrim(form.eventTypeOther) ? `Other type: ${safeTrim(form.eventTypeOther)}` : '',
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
          ].filter(Boolean).join('\n'),
          automationEligible: true,
        },
        eventLead: {
          eventLeadText: safeTrim(form.eventTitle) || undefined,
        },
      });

      clearDraft();
      nav('/thank-you');
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Wizard state
  const wizard = useWizard(form);

  const stepBody = useMemo(() => {
    switch (wizard.stepId) {
      case 'who':
        return <StepWho form={form} onChange={update} errors={wizard.errors} />;
      case 'basics':
        return <StepBasics form={form} onChange={update} errors={wizard.errors} />;
      case 'schedule':
        return (
          <StepSchedule
            form={form}
            onChange={update}
            errors={wizard.errors}
            conflictResult={conflictResult}
            onCheckCalendar={checkCalendar}
            checkingCalendar={checkingCalendar}
          />
        );
      case 'logistics':
        return <StepLogistics form={form} onChange={update} errors={wizard.errors} />;
      case 'review':
      default:
        return (
          <StepReview
            form={form}
            errors={wizard.errors}
            aiResult={aiResult}
            submitError={submitError}
            submitting={submitting}
            onToggleConsent={(checked) => update('permissionToContact', checked)}
            onSubmit={finalSubmit}
          />
        );
    }
  }, [wizard.stepId, wizard.errors, form, conflictResult, checkingCalendar, aiResult, submitError, submitting]);

  const footer = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="secondary" onClick={() => nav('/')}>
        Back to Home
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          onClick={() => wizard.back()}
          disabled={wizard.stepIndex === 0}
        >
          Back
        </Button>

        <Button
          type="button"
          onClick={() => {
            if (wizard.stepId === 'review') return;
            const res = wizard.next();
            if (!res.ok) setSubmitError('Please fix the highlighted fields.');
            else setSubmitError(null);
          }}
        >
          {wizard.stepId === 'logistics' ? 'Review' : 'Next'}
        </Button>
      </div>
    </div>
  );

  return (
    <WizardLayout
      title="Invite Kelly to Your Event"
      subtitle="A people-powered request that routes straight into the campaign follow-up queue."
      steps={wizard.steps}
      activeId={wizard.stepId}
      onStepClick={(id) => wizard.goTo(id)}
      onSaveDraft={() => saveDraft(form)}
      onClearDraft={() => {
        clearDraft();
        setForm(defaultForm());
        setAiResult(null);
        setSubmitError(null);
        setConflictResult(null);
      }}
      footer={
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">{footer}</div>
          <div className="lg:col-span-1">
            <AiAssistPanel
              form={form}
              aiResult={aiResult}
              setAiResult={setAiResult}
              onApplyExtracted={applyExtracted}
            />
            {submitError ? (
              <div className="mt-4">
                <ErrorText>{submitError}</ErrorText>
              </div>
            ) : null}
          </div>
        </div>
      }
    >
      {stepBody}
    </WizardLayout>
  );
}
