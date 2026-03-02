// app/netlify/functions/followups-create.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(statusCode: number, payload: any) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      // Basic CORS (safe for internal app calls; tighten later if needed)
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
    body: JSON.stringify(payload),
  };
}

function asString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function asNullableString(v: unknown): string | null {
  const s = asString(v).trim();
  return s ? s : null;
}

function asBoolOrNull(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = v.toLowerCase().trim();
    if (t === "true") return true;
    if (t === "false") return false;
  }
  return null;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeInitials(raw: unknown): string {
  const v = asString(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (v.slice(0, 3) || "UNK").padEnd(3, "X").slice(0, 3);
}

function allowedStatus(raw: unknown) {
  const s = asString(raw).trim().toUpperCase();
  if (s === "NEW" || s === "IN_PROGRESS" || s === "COMPLETED") return s;
  return "NEW";
}

export const handler = async (event: any) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    // This is the *functions* environment, not VITE_ env
    return json(500, {
      error:
        "Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in Netlify env vars.",
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = JSON.parse(event.body || "{}");

    if (!isObject(body)) {
      return json(400, { error: "Invalid body payload." });
    }

    // Required
    const contact_id = asString(body.contact_id).trim();
    if (!contact_id) {
      return json(400, { error: "Missing required field: contact_id" });
    }

    // Status + timestamps
    const status = allowedStatus(body.status);
    const now = new Date().toISOString();

    // Optional (keep conservative: only use columns we expect to exist)
    const notes = asNullableString(body.notes);
    const archived = asBoolOrNull(body.archived) ?? false;
    const completed_at =
      body.completed_at === null || body.completed_at === undefined
        ? null
        : asNullableString(body.completed_at);

    const name = asNullableString(body.name);
    const phone = asNullableString(body.phone);
    const email = asNullableString(body.email);
    const location = asNullableString(body.location);
    const source = asNullableString(body.source);

    // Client sends: permission_to_contact
    const permission_to_contact = asBoolOrNull(body.permission_to_contact);

    // IMPORTANT:
    // Your table shows `contact_eligible` (NOT `automation_eligible`).
    // We map eligibility to that column to avoid schema mismatch.
    const contact_eligible =
      typeof permission_to_contact === "boolean" ? permission_to_contact : null;

    const entry_initials = normalizeInitials(body.entry_initials);

    const insertPayload: Record<string, any> = {
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

      // schema-safe write:
      contact_eligible,
      permission_to_contact,

      entry_initials,
      created_at: now,
      updated_at: now,
    };

    // Remove null/undefined keys that can be noisy (keeps payload clean)
    Object.keys(insertPayload).forEach((k) => {
      if (insertPayload[k] === undefined) delete insertPayload[k];
    });

    const { data, error } = await supabase
      .from("followups")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return json(500, { error: error.message });
    }

    return json(200, { ok: true, item: data });
  } catch (err: any) {
    return json(500, {
      error: err?.message ?? "followups-create failed.",
    });
  }
};