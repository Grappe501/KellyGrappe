/* app/src/modules/intake/processIntake.ts

   Module adapter for intake forms.

   Responsibility:
   - Normalize module form data
   - Map to pipeline format
   - Enforce safe data permissions
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

  workspaceId?: string;
  organizationId?: string;

  user?: {
    id: string;
    role: string;
  };
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
/* SAFE PERMISSION FILTER
   Prevents tenants from writing protected fields
------------------------------------------------------ */

function sanitizeTenantInput(form: Record<string, any>) {
  return {
    fullName: safeTrim(form.fullName),
    email: safeTrim(form.email).toLowerCase(),
    phone: normalizePhone(form.phone),

    city: safeTrim(form.city),
    county: safeTrim(form.county),
    state: safeTrim(form.state),
    zip: safeTrim(form.zip),

    category: form.category,
    supportLevel: form.supportLevel,
    bestContactMethod: form.bestContactMethod,

    introducedBy: safeTrim(form.introducedBy),
    organization: safeTrim(form.organization),

    metWhere: safeTrim(form.metWhere),
    metWhereDetails: safeTrim(form.metWhereDetails),
    eventName: safeTrim(form.eventName),

    topIssue: safeTrim(form.topIssue),
    conversationNotes: safeTrim(form.conversationNotes),

    tags: Array.isArray(form.tags) ? form.tags : [],
    teamAssignments: Array.isArray(form.teamAssignments)
      ? form.teamAssignments
      : [],
  };
}

/* ------------------------------------------------------ */
/* MAIN */
/* ------------------------------------------------------ */

export async function runProcessIntake(input: ProcessIntakeInput) {
  const form = input.form ?? {};
  const source = safeTrim(input.source) || "unknown";

  const workspaceId = input.workspaceId;
  const organizationId = input.organizationId;
  const user = input.user;

  /* Ensure workspace context exists */

  if (!workspaceId) {
    throw new Error("Workspace context missing. Intake blocked.");
  }

  const sanitized = sanitizeTenantInput(form);

  const params: ProcessIntakeParams = {
    originType: source as any,
    rawPayload: form,

    organizationId,
    submittedBy: user?.id,

    contact: {
      fullName: sanitized.fullName || undefined,
      email: sanitized.email || undefined,
      phone: sanitized.phone || undefined,

      city: sanitized.city || undefined,
      county: sanitized.county || undefined,
      state: sanitized.state || undefined,
      zip: sanitized.zip || undefined,

      /* Protected voter data fields
         These must NEVER be accepted from tenants */

      precinct: undefined,
      congressionalDistrict: undefined,
      stateHouseDistrict: undefined,
      stateSenateDistrict: undefined,

      category: sanitized.category,
      supportLevel: sanitized.supportLevel,
      bestContactMethod: sanitized.bestContactMethod,

      introducedBy: sanitized.introducedBy || undefined,
      organization: sanitized.organization || undefined,

      metWhere: sanitized.metWhere || undefined,
      metWhereDetails: sanitized.metWhereDetails || undefined,
      eventName: sanitized.eventName || undefined,

      topIssue: sanitized.topIssue || undefined,
      conversationNotes: sanitized.conversationNotes || undefined,

      tags: sanitized.tags,
      teamAssignments: sanitized.teamAssignments,
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