import React from 'react';
import { HelpText, Input, Label, Textarea } from '@components/FormControls';
import type { LiveContactForm } from '../types/LiveContactForm';

export function FollowUpSection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(k: K, v: LiveContactForm[K]) => void;
}) {
  const { form, update } = props;

  return (
    <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Follow-up</div>
          <HelpText className="mt-1">If we promised anything, or should circle back, flag it.</HelpText>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="followUpNeeded"
            type="checkbox"
            checked={form.followUpNeeded}
            onChange={(e) => update('followUpNeeded', e.target.checked)}
            className="mt-1"
          />
          <Label htmlFor="followUpNeeded">Follow-up needed</Label>
        </div>
      </div>

      <div>
        <Label htmlFor="followUpNotes">Follow-up notes</Label>
        <Textarea
          id="followUpNotes"
          value={form.followUpNotes}
          placeholder="What did we promise? Next step? Who should own it?"
          onChange={(e) => update('followUpNotes', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="followUpTargetAt">Target date/time (optional)</Label>
        <Input
          id="followUpTargetAt"
          type="datetime-local"
          value={form.followUpTargetAt}
          onChange={(e) => update('followUpTargetAt', e.target.value)}
        />
        <HelpText>This will later drive reminders + smarter SLA.</HelpText>
      </div>
    </div>
  );
}
