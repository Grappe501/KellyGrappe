import React from 'react';
import { Input, Label, HelpText } from '../../../shared/components/FormControls';
import type { LiveContactForm } from '../types/LiveContactForm';

export function ContactLocationSection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(k: K, v: LiveContactForm[K]) => void;
}) {
  const { form, update } = props;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" value={form.city} onChange={(e) => update('city', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="county">County</Label>
          <Input id="county" value={form.county} onChange={(e) => update('county', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" value={form.zip} onChange={(e) => update('zip', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" value={form.state} onChange={(e) => update('state', e.target.value)} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">Districts / Precinct</div>
        <HelpText className="mt-1">
          Manual for now. We can auto-fill later using your Gov Data API keys (address → districts).
        </HelpText>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="congressionalDistrict">Congressional District</Label>
            <Input
              id="congressionalDistrict"
              value={form.congressionalDistrict}
              placeholder="AR-02"
              onChange={(e) => update('congressionalDistrict', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="precinct">Precinct</Label>
            <Input
              id="precinct"
              value={form.precinct}
              placeholder="Precinct ID / Name"
              onChange={(e) => update('precinct', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="stateHouseDistrict">State House District</Label>
            <Input
              id="stateHouseDistrict"
              value={form.stateHouseDistrict}
              placeholder="HD-45"
              onChange={(e) => update('stateHouseDistrict', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="stateSenateDistrict">State Senate District</Label>
            <Input
              id="stateSenateDistrict"
              value={form.stateSenateDistrict}
              placeholder="SD-18"
              onChange={(e) => update('stateSenateDistrict', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
