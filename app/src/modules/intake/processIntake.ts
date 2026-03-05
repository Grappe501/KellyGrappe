/* app/src/modules/intake/processIntake.ts

   Module adapter for intake forms.

   Responsibility:
   - Normalize module form data
   - Map to pipeline format
   - Call shared intake pipeline
*/

import {
  processIntake as pipelineProcessIntake,
  type ProcessIntakeParams,
} from "../../shared/utils/intakePipeline";

/* ------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------ */

export type ProcessIntakeInput = {
  form: Record<string, any>;
  source: string;
};

/* ------------------------------------------------------ */
/* UTILS */
/* ------------------------------------------------------ */

function safeTrim(v: unknown): string {
  return (v ?? "").toString().trim();
}

function normalizePhone(raw?: string) {
  const v = safeTrim(raw);
  if (!v) return undefined;
  const digits = v.replace(/\D/g, "");
  return digits || undefined;
}

/* ------------------------------------------------------ */
/* MAIN */
/* ------------------------------------------------------ */

export async function runProcessIntake(input: ProcessIntakeInput) {
  const form = input.form ?? {};
  const source = safeTrim(input.source) || "unknown";

  const params: ProcessIntakeParams = {
    originType: source as any,
    rawPayload: form,

    contact: {
      fullName: safeTrim(form.fullName) || undefined,
      email: safeTrim(form.email).toLowerCase() || undefined,
      phone: normalizePhone(form.phone),

      city: safeTrim(form.city) || undefined,
      county: safeTrim(form.county) || undefined,
      state: safeTrim(form.state) || undefined,
      zip: safeTrim(form.zip) || undefined,

      precinct: safeTrim(form.precinct) || undefined,
      congressionalDistrict: safeTrim(form.congressionalDistrict) || undefined,
      stateHouseDistrict: safeTrim(form.stateHouseDistrict) || undefined,
      stateSenateDistrict: safeTrim(form.stateSenateDistrict) || undefined,

      category: form.category,
      supportLevel: form.supportLevel,
      bestContactMethod: form.bestContactMethod,

      introducedBy: safeTrim(form.introducedBy) || undefined,
      organization: safeTrim(form.organization) || undefined,

      metWhere: safeTrim(form.metWhere) || undefined,
      metWhereDetails: safeTrim(form.metWhereDetails) || undefined,
      eventName: safeTrim(form.eventName) || undefined,

      topIssue: safeTrim(form.topIssue) || undefined,
      conversationNotes: safeTrim(form.conversationNotes) || undefined,

      tags: Array.isArray(form.tags) ? form.tags : [],
      teamAssignments: Array.isArray(form.teamAssignments)
        ? form.teamAssignments
        : [],
    },

    followUp: {
      followUpNeeded:
        typeof form.followUpNeeded === "boolean"
          ? form.followUpNeeded
          : true,

      followUpNotes: safeTrim(form.followUpNotes) || undefined,

      sourceLabel: safeTrim(form.metWhere) || undefined,
      location: safeTrim(form.city) || undefined,
      notes: safeTrim(form.conversationNotes) || undefined,
    },
  };

  return pipelineProcessIntake(params);
}

/* Export legacy name for modules that already import processIntake */
export const processIntake = runProcessIntake;