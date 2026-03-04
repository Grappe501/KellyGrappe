import React from 'react';
import { Input, Label, Select, HelpText } from '../../../shared/components/FormControls';
import type { LiveContactForm } from '../types/LiveContactForm';

const MET_WHERE_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'DOOR', label: 'Door knocking' },
  { value: 'EVENT', label: 'Event / rally' },
  { value: 'PHONE', label: 'Phone call' },
  { value: 'TEXT', label: 'Text thread' },
  { value: 'REFERRAL', label: 'Referral / intro' },
  { value: 'SOCIAL', label: 'Social media' },
  { value: 'WORK', label: 'Work / professional setting' },
  { value: 'COMMUNITY', label: 'Community space' },
  { value: 'OTHER', label: 'Other' },
];

export function MeetingContextSection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(k: K, v: LiveContactForm[K]) => void;
}) {
  const { form, update } = props;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="metWhere">Where did we meet?</Label>
          <Select id="metWhere" value={form.metWhere} onChange={(e) => update('metWhere', e.target.value)}>
            {MET_WHERE_OPTIONS.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="introducedBy">Introduced by</Label>
          <Input id="introducedBy" value={form.introducedBy} placeholder="Connector name" onChange={(e) => update('introducedBy', e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="eventName">Event name (optional)</Label>
        <Input id="eventName" value={form.eventName} placeholder="Rally, fish fry, meeting, church event…" onChange={(e) => update('eventName', e.target.value)} />
      </div>

      <div>
        <Label htmlFor="metWhereDetails">Meeting details</Label>
        <Input
          id="metWhereDetails"
          value={form.metWhereDetails}
          placeholder="Venue, booth #, neighborhood, table, room, etc."
          onChange={(e) => update('metWhereDetails', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="organization">Organization / workplace / affiliation</Label>
        <Input id="organization" value={form.organization} placeholder="Church, nonprofit, employer, club…" onChange={(e) => update('organization', e.target.value)} />
        <HelpText>Helps build relationship networks + coalition mapping.</HelpText>
      </div>
    </div>
  );
}
