import React from 'react';
import { Card, CardHeader, CardContent } from '../../../shared/components/Card';
import { Label, Select, Textarea } from '../../../shared/components/FormControls';
import type { EventRequestFormState, RequestedRole, MediaExpected, StepValidationErrors } from '../../types';

export default function StepLogistics(props: {
  form: EventRequestFormState;
  onChange: <K extends keyof EventRequestFormState>(key: K, value: EventRequestFormState[K]) => void;
  errors: StepValidationErrors;
}) {
  const { form, onChange } = props;

  return (
    <Card className="bg-white text-slate-900">
      <CardHeader
        title="Logistics"
        subtitle="This helps us show up prepared — and respect the crowd’s time."
      />
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="requestedRole">Requested role</Label>
            <Select
              id="requestedRole"
              value={form.requestedRole}
              onChange={(e) => onChange('requestedRole', e.target.value as RequestedRole)}
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
              onChange={(e) => onChange('mediaExpected', e.target.value as MediaExpected)}
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
            rows={6}
            value={form.hostNotes}
            onChange={(e) => onChange('hostNotes', e.target.value)}
            placeholder="Parking, entrance, schedule, security, who to ask for, anything we should know…"
          />
        </div>
      </CardContent>
    </Card>
  );
}
