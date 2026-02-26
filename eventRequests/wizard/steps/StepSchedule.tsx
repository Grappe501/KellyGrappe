import React from 'react';
import { Card, CardHeader, CardContent } from '../../../shared/components/Card';
import { Input, Label, ErrorText, HelpText, Button } from '../../../shared/components/FormControls';
import type { EventRequestFormState, StepValidationErrors, CalendarConflictResult } from '../../types';

export default function StepSchedule(props: {
  form: EventRequestFormState;
  onChange: <K extends keyof EventRequestFormState>(key: K, value: EventRequestFormState[K]) => void;
  errors: StepValidationErrors;
  conflictResult?: CalendarConflictResult | null;
  onCheckCalendar?: () => void;
  checkingCalendar?: boolean;
}) {
  const { form, onChange, errors, conflictResult, onCheckCalendar, checkingCalendar } = props;

  return (
    <Card className="bg-white text-slate-900">
      <CardHeader
        title="When & where?"
        subtitle="The closer the details, the faster we can confirm."
      />
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="startDateTime">Start date & time *</Label>
            <Input
              id="startDateTime"
              type="datetime-local"
              value={form.startDateTime}
              onChange={(e) => onChange('startDateTime', e.target.value)}
            />
            {errors.startDateTime ? <ErrorText>{errors.startDateTime}</ErrorText> : null}
          </div>

          <div>
            <Label htmlFor="endDateTime">End date & time (optional)</Label>
            <Input
              id="endDateTime"
              type="datetime-local"
              value={form.endDateTime}
              onChange={(e) => onChange('endDateTime', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
          <input
            id="isTimeFlexible"
            type="checkbox"
            className="mt-1 h-5 w-5 rounded-md"
            checked={form.isTimeFlexible}
            onChange={(e) => onChange('isTimeFlexible', e.target.checked)}
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
            onChange={(e) => onChange('venueName', e.target.value)}
            placeholder="Example: White County Fairgrounds"
          />
        </div>

        <div>
          <Label htmlFor="addressLine1">Street address *</Label>
          <Input
            id="addressLine1"
            value={form.addressLine1}
            onChange={(e) => onChange('addressLine1', e.target.value)}
            placeholder="123 Main St"
          />
          {errors.addressLine1 ? <ErrorText>{errors.addressLine1}</ErrorText> : null}
        </div>

        <div>
          <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
          <Input
            id="addressLine2"
            value={form.addressLine2}
            onChange={(e) => onChange('addressLine2', e.target.value)}
            placeholder="Suite / room / entrance notes"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => onChange('city', e.target.value)}
              placeholder="City"
            />
            {errors.city ? <ErrorText>{errors.city}</ErrorText> : null}
          </div>
          <div>
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={form.state}
              onChange={(e) => onChange('state', e.target.value)}
              placeholder="AR"
            />
            {errors.state ? <ErrorText>{errors.state}</ErrorText> : null}
          </div>
          <div>
            <Label htmlFor="zip">ZIP *</Label>
            <Input
              id="zip"
              value={form.zip}
              onChange={(e) => onChange('zip', e.target.value)}
              placeholder="ZIP"
            />
            {errors.zip ? <ErrorText>{errors.zip}</ErrorText> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Optional: check schedule conflicts</div>
              <div className="text-xs text-slate-600">
                If enabled on your deployment, we can check the campaign calendar for overlap.
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={onCheckCalendar} disabled={checkingCalendar}>
              {checkingCalendar ? 'Checking…' : 'Check Calendar'}
            </Button>
          </div>

          {conflictResult ? (
            <div className="mt-3 text-sm">
              <div className={conflictResult.conflict ? 'text-rose-700' : 'text-emerald-700'}>
                {conflictResult.message ?? (conflictResult.conflict ? 'Conflict detected.' : 'No conflict detected.')}
              </div>
              {conflictResult.suggestedTimes?.length ? (
                <ul className="mt-2 list-disc pl-5 text-xs text-slate-700">
                  {conflictResult.suggestedTimes.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
