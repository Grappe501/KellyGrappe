import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function asString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function asBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v.toLowerCase() === "true") return true;
    if (v.toLowerCase() === "false") return false;
  }
  return fallback;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeInitials(raw: unknown): string {
  const v = asString(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return v.slice(0, 3) || "UNK";
}

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || "{}");

    if (!isObject(body)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid body payload." }),
      };
    }

    // Required minimal identity
    const contact_id = asString(body.contact_id).trim();
    const status = asString(body.status).trim() || "NEW";

    if (!contact_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required field: contact_id" }),
      };
    }

    // Optional fields
    const notes = asString(body.notes) || null;
    const archived = asBool(body.archived, false);
    const completed_at = body.completed_at
      ? asString(body.completed_at)
      : null;

    const name = asString(body.name) || null;
    const phone = asString(body.phone) || null;
    const email = asString(body.email) || null;
    const location = asString(body.location) || null;
    const source = asString(body.source) || null;

    const automation_eligible =
      typeof body.automation_eligible === "boolean"
        ? body.automation_eligible
        : null;

    const permission_to_contact =
      typeof body.permission_to_contact === "boolean"
        ? body.permission_to_contact
        : null;

    const facebook_connected =
      typeof body.facebook_connected === "boolean"
        ? body.facebook_connected
        : null;

    const facebook_profile_name =
      asString(body.facebook_profile_name) || null;

    const facebook_handle =
      asString(body.facebook_handle) || null;

    const entry_initials = normalizeInitials(body.entry_initials);

    const now = new Date().toISOString();

    const insertPayload = {
      contact_id,
      status,
      notes,
      archived,
      completed_at,
      name,
      phone,
      email,
      location,
      source,
      automation_eligible,
      permission_to_contact,
      facebook_connected,
      facebook_profile_name,
      facebook_handle,
      entry_initials,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("followups")
      .insert(insertPayload)
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
      body: JSON.stringify({
        ok: true,
        item: data,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err?.message ?? "followups-create failed.",
      }),
    };
  }
};