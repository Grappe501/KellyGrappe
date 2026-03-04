import React from "react";
import { HelpText, Label } from "../../../shared/components/FormControls";
import type { LiveContactForm } from "../types/LiveContactForm";

/**
 * Reusable toggle row with accessible label association.
 */
function ToggleRow(props: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  const { id, label, checked, onChange, help } = props;

  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50 transition"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />

      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>

        {help ? (
          <HelpText className="mt-1">{help}</HelpText>
        ) : null}
      </div>
    </label>
  );
}

/**
 * EngagementSignalsSection
 *
 * Captures high-value campaign signals discovered during a conversation.
 * These flags help routing for:
 *  - field operations
 *  - fundraising
 *  - volunteer leadership
 *  - event coordination
 */
export function EngagementSignalsSection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(
    key: K,
    value: LiveContactForm[K]
  ) => void;
}) {
  const { form, update } = props;

  return (
    <div className="space-y-4">

      <div>
        <Label htmlFor="signal-volunteer">
          Signals (what did they say “yes” to?)
        </Label>

        <HelpText>
          These signals help route contacts to the correct campaign teams
          (field, fundraising, volunteer leadership, events).
        </HelpText>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        <ToggleRow
          id="signal-volunteer"
          label="Wants to volunteer"
          checked={form.interestedVolunteer}
          onChange={(v) => update("interestedVolunteer", v)}
        />

        <ToggleRow
          id="signal-donate"
          label="Wants to donate"
          checked={form.interestedDonate}
          onChange={(v) => update("interestedDonate", v)}
        />

        <ToggleRow
          id="signal-host-event"
          label="Could host an event"
          checked={form.interestedHostEvent}
          onChange={(v) => update("interestedHostEvent", v)}
        />

        <ToggleRow
          id="signal-yard-sign"
          label="Wants a yard sign"
          checked={form.interestedYardSign}
          onChange={(v) => update("interestedYardSign", v)}
        />

        <ToggleRow
          id="signal-county-leader"
          label="County leader prospect"
          checked={form.interestedCountyLeader}
          onChange={(v) => update("interestedCountyLeader", v)}
          help="Potential organizer for county-level campaign structure."
        />

        <ToggleRow
          id="signal-precinct-captain"
          label="Precinct captain prospect"
          checked={form.interestedPrecinctCaptain}
          onChange={(v) => update("interestedPrecinctCaptain", v)}
          help="Possible precinct-level leader for field operations."
        />

      </div>
    </div>
  );
}