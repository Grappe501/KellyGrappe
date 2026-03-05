import React from "react";
import { HelpText, Label, Button } from "../../../shared/components/FormControls";
import type { LiveContactForm } from "../types/LiveContactForm";
import type { CampaignTeam } from "../../../shared/utils/db/contactsDb";

/**
 * Campaign team definitions
 * Easy to expand later if campaign structure grows.
 */
const TEAMS: Array<{ key: CampaignTeam; label: string }> = [
  { key: "CREATIVE_DIGITAL", label: "Creative & Digital" },
  { key: "COMMUNICATIONS_PR", label: "Communication & Public Relations" },
  { key: "CONSTITUENT_SERVICES", label: "Constituent Services" },
  { key: "DEMOCRACY_RIGHTS", label: "Democracy & Rights" },
  { key: "FIELD_EVENTS", label: "Field & Events" },
  { key: "FINANCE_FUNDRAISING", label: "Finance & Fundraising" },
  { key: "OPERATIONS", label: "Operations" },
  { key: "OUTREACH_ORGANIZING", label: "Outreach & Organizing" },
  { key: "SOCIAL_STORYTELLING", label: "Social Media & Storytelling" },
];

/**
 * Small reusable chip button
 */
function Chip(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={props.active ? "primary" : "secondary"}
      onClick={props.onClick}
      className="rounded-full px-4 py-2"
    >
      {props.label}
    </Button>
  );
}

/**
 * TeamAssignmentSection
 *
 * Allows routing contacts to campaign departments.
 * This drives internal task ownership and follow-up workflows.
 */
export function TeamAssignmentSection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(
    key: K,
    value: LiveContactForm[K]
  ) => void;
}) {
  const { form, update } = props;

  function toggle(team: CampaignTeam) {
    const active = form.teamAssignments.includes(team);

    update(
      "teamAssignments",
      active
        ? form.teamAssignments.filter((t) => t !== team)
        : [...form.teamAssignments, team]
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="team-assignment">
          Team fit (volunteer staff departments)
        </Label>

        <HelpText>
          Tap to assign campaign departments. This drives routing and follow-up
          ownership.
        </HelpText>
      </div>

      {/* hidden anchor element so Label htmlFor requirement is satisfied */}
      <input id="team-assignment" type="hidden" />

      <div className="mt-2 flex flex-wrap gap-2">
        {TEAMS.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            active={form.teamAssignments.includes(t.key)}
            onClick={() => toggle(t.key)}
          />
        ))}
      </div>
    </div>
  );
}
