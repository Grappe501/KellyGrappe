import React from 'react';
import { Card, CardHeader, CardContent } from '../../../shared/components/Card';
import { Input, Label, Select, ErrorText } from '../../../shared/components/FormControls';
import type { EventRequestFormState, PreferredContactMethod, StepValidationErrors } from '../../types';

export default function StepWho(props: {
  form: EventRequestFormState;
  onChange: <K extends keyof EventRequestFormState>(key: K, value: EventRequestFormState[K]) => void;
  errors: StepValidationErrors;
}) {
  const { form, onChange, errors } = props;

  return (
    <Card className="bg-white text-slate-900">
      <CardHeader
        title="Who’s inviting Kelly?"
        subtitle="We’ll use this to confirm details — no spam, no games, just coordination."
      />
      <CardContent className="space-y-5">
        <div>
          <Label htmlFor="contactName">Full name *</Label>
          <Input
            id="contactName"
            value={form.contactName}
            onChange={(e) => onChange('contactName', e.target.value)}
            placeholder="Your name"
          />
          {errors.contactName ? <ErrorText>{errors.contactName}</ErrorText> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="contactEmail">Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) => onChange('contactEmail', e.target.value)}
              placeholder="you@email.com"
            />
            {errors.contactEmail ? <ErrorText>{errors.contactEmail}</ErrorText> : null}
          </div>

          <div>
            <Label htmlFor="contactPhone">Phone (optional)</Label>
            <Input
              id="contactPhone"
              value={form.contactPhone}
              onChange={(e) => onChange('contactPhone', e.target.value)}
              placeholder="501-555-1234"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="preferredContactMethod">Preferred contact method</Label>
            <Select
              id="preferredContactMethod"
              value={form.preferredContactMethod}
              onChange={(e) => onChange('preferredContactMethod', e.target.value as PreferredContactMethod)}
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
              onChange={(e) => onChange('organization', e.target.value)}
              placeholder="Church / union / civic org / neighborhood group"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
