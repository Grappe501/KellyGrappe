import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function asString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function pickAllowedPatch(patch: Record<string, unknown>) {
  // Only allow safe fields to be updated from the UI.
  // (Prevents the UI from altering contact identity fields or payload arbitrarily.)
  const out: Record<string, unknown> = {};

  if (typeof patch.status === "string") out.status = patch.status;
  if (typeof patch.notes === "string" || patch.notes === null) out.notes = patch.notes;

  if (typeof patch.archived === "boolean") out.archived = patch.archived;

  // completed_at should be ISO string or null
  if (typeof patch.completed_at === "string" || patch.completed_at === null) {
    out.completed_at = patch.completed_at;
  }

  // Calendar writeback fields (used by calendar-create.ts)
  if (typeof patch.calendar_event_id === "string" || patch.calendar_event_id === null) {
    out.calendar_event_id = patch.calendar_event_id;
  }
  if (typeof patch.calendar_event_link === "string" || patch.calendar_event_link === null) {
    out.calendar_event_link = patch.calendar_event_link;
  }

  // Always track updated time
  out.updated_at = new Date().toISOString();

  return out;
}

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const id = asString(body?.id).trim();

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required field: id" }),
      };
    }

    if (!isObject(body?.patch)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required field: patch" }),
      };
    }

    const patch = pickAllowedPatch(body.patch);

    const { data, error } = await supabase
      .from("followups")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, item: data }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err?.message ?? "followups-update failed.",
      }),
    };
  }
};