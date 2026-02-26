import React from 'react';
import { Card, CardHeader, CardContent } from '../../../shared/components/Card';
import { Label, HelpText, ErrorText, Button } from '../../../shared/components/FormControls';
import type { EventRequestFormState, StepValidationErrors, AssistResponse } from '../../types';
import { prettyDateTime, safeTrim } from '../../utils/formatting';

function Row(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-3">
      <div className="text-xs font-semibold text-slate-600">{props.label}</div>
      <div className="sm:col-span-2 text-sm text-slate-900">{props.value}</div>
    </div>
  );
}

export default function StepReview(props: {
  form: EventRequestFormState;
  errors: StepValidationErrors;
  aiResult: AssistResponse | null;
  submitError: string | null;
  submitting: boolean;
  onToggleConsent: (checked: boolean) => void;
  onSubmit: () => void;
}) {
  const { form, errors, aiResult, submitError, submitting, onToggleConsent, onSubmit } = props;
  const showOther = form.eventType === 'Other';

  const summaryLocation = [
    safeTrim(form.venueName) || safeTrim(form.eventTitle),
    safeTrim(form.city),
    safeTrim(form.state) || 'AR',
  ].filter(Boolean).join(' • ');

  return (
    <Card className="bg-white text-slate-900">
      <CardHeader
        title="Review & submit"
        subtitle="This will go straight into the campaign inbox and live follow-up queue."
      />
      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Summary</div>
          <div className="mt-3 space-y-3">
            <Row label="Host" value={`${form.contactName} (${form.contactEmail})`} />
            <Row label="Event" value={form.eventTitle} />
            <Row label="Type" value={showOther ? `${form.eventType} — ${form.eventTypeOther}` : form.eventType} />
            <Row label="When" value={prettyDateTime(form.startDateTime)} />
            <Row label="Where" value={summaryLocation} />
            <Row label="Role" value={form.requestedRole} />
            <Row label="Media" value={form.mediaExpected} />
          </div>
        </div>

        {aiResult?.drafts?.internalBrief ? (
          <div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              AI internal brief (optional)
            </div>
            <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
              {aiResult.drafts.internalBrief}
            </pre>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <input
              id="permissionToContact"
              type="checkbox"
              className="mt-1 h-5 w-5 rounded-md"
              checked={form.permissionToContact}
              onChange={(e) => onToggleConsent(e.target.checked)}
            />
            <div className="space-y-1">
              <Label htmlFor="permissionToContact">I agree to be contacted about this request. *</Label>
              <HelpText>
                Submitting does not guarantee attendance. We confirm based on schedule, location,
                and campaign priorities — but every request is reviewed.
              </HelpText>
            </div>
          </div>

          {errors.permissionToContact ? <ErrorText>{errors.permissionToContact}</ErrorText> : null}
          {submitError ? <ErrorText>{submitError}</ErrorText> : null}

          <div className="mt-4">
            <Button type="button" onClick={onSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Event Request'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
