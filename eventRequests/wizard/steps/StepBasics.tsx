import React from 'react';
import { Card, CardHeader, CardContent } from '../../../shared/components/Card';
import { Input, Label, Select, Textarea, ErrorText, HelpText } from '../../../shared/components/FormControls';
import type { EventRequestFormState, EventType, ExpectedAttendance, StepValidationErrors } from '../../types';
import { EVENT_TYPES } from '../../utils/constants';

export default function StepBasics(props: {
  form: EventRequestFormState;
  onChange: <K extends keyof EventRequestFormState>(key: K, value: EventRequestFormState[K]) => void;
  errors: StepValidationErrors;
}) {
  const { form, onChange, errors } = props;
  const showOther = form.eventType === 'Other';

  return (
    <Card className="bg-white text-slate-900">
      <CardHeader
        title="Event basics"
        subtitle="Big or small — if people are gathering, it matters."
      />
      <CardContent className="space-y-5">
        <div>
          <Label htmlFor="eventTitle">Event title *</Label>
          <Input
            id="eventTitle"
            value={form.eventTitle}
            onChange={(e) => onChange('eventTitle', e.target.value)}
            placeholder="Example: Rose Bud Community Town Hall"
          />
          {errors.eventTitle ? <ErrorText>{errors.eventTitle}</ErrorText> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="eventType">Event type *</Label>
            <Select
              id="eventType"
              value={form.eventType}
              onChange={(e) => onChange('eventType', e.target.value as EventType)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            {showOther ? (
              <HelpText className="mt-1">If you pick “Other”, tell us what kind of event it is.</HelpText>
            ) : null}
          </div>

          <div>
            <Label htmlFor="expectedAttendance">Expected attendance</Label>
            <Select
              id="expectedAttendance"
              value={form.expectedAttendance}
              onChange={(e) => onChange('expectedAttendance', e.target.value as ExpectedAttendance)}
            >
              <option value="1–10">1–10</option>
              <option value="11–25">11–25</option>
              <option value="26–50">26–50</option>
              <option value="51–100">51–100</option>
              <option value="100+">100+</option>
            </Select>
          </div>
        </div>

        {showOther ? (
          <div>
            <Label htmlFor="eventTypeOther">Describe the event type *</Label>
            <Input
              id="eventTypeOther"
              value={form.eventTypeOther}
              onChange={(e) => onChange('eventTypeOther', e.target.value)}
              placeholder="Example: County committee breakfast"
            />
            {errors.eventTypeOther ? <ErrorText>{errors.eventTypeOther}</ErrorText> : null}
          </div>
        ) : null}

        <div>
          <Label htmlFor="eventDescription">Event description (optional)</Label>
          <Textarea
            id="eventDescription"
            rows={5}
            value={form.eventDescription}
            onChange={(e) => onChange('eventDescription', e.target.value)}
            placeholder="Agenda, audience, format, topics, host names… anything helpful."
          />
        </div>
      </CardContent>
    </Card>
  );
}
