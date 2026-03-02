// app/netlify/functions/followups-create.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // Fail loudly in logs; handler will also return a clear error.
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

function asString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function asBool(v: unknown, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    if (s === "true") return true;
    if (s === "false") return false;
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

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      // Keep CORS permissive for now (campaign ops + mobile field usage).
      // Tighten later if/when we add auth.
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: any) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed. Use POST." });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(500, {
      error: "Server misconfigured: missing Supabase env vars.",
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");

    if (!isObject(body)) {
      return jsonResponse(400, { error: "Invalid body payload." });
    }

    /**
     * IMPORTANT:
     * Your Supabase `followups` table does NOT include `contact_id` (per your error).
     * So we DO NOT write it as a column.
     * We preserve it inside `payload` for traceability.
     */
    const contact_id = asString(body.contact_id).trim(); // kept for payload audit only
    const module_id = asString(body.module_id).trim() || null;

    const statusRaw = asString(body.status).trim().toUpperCase();
    const status =
      statusRaw === "NEW" || statusRaw === "IN_PROGRESS" || statusRaw === "COMPLETED"
        ? statusRaw
        : "NEW";

    // Optional core fields (columns that are typical in your followups table)
    const notes = asString(body.notes) || null;
    const archived = asBool(body.archived, false);
    const completed_at = body.completed_at ? asString(body.completed_at) : null;

    const title = asString(body.title) || null;
    const source = asString(body.source) || null;

    // Contact identity fields your board uses
    const contact_name = asString(body.contact_name || body.name) || null;
    const contact_phone = asString(body.contact_phone || body.phone) || null;
    const contact_email = asString(body.contact_email || body.email) || null;

    // Map UI field name -> actual DB column name (per your screenshot)
    // UI sometimes sends `automation_eligible`; DB column is `contact_eligible`.
    const contact_eligible =
      typeof body.contact_eligible === "boolean"
        ? body.contact_eligible
        : typeof body.automation_eligible === "boolean"
        ? body.automation_eligible
        : null;

    const permission_to_contact =
      typeof body.permission_to_contact === "boolean" ? body.permission_to_contact : null;

    const entry_initials = normalizeInitials(body.entry_initials);

    const now = new Date().toISOString();

    // Keep a full audit snapshot, but strip anything huge if needed later.
    const payload = {
      ...body,
      contact_id: contact_id || null,
      module_id,
      entry_initials,
      captured_at: now,
    };

    /**
     * Only include columns we are confident exist:
     * - status, notes, archived, completed_at
     * - title, source
     * - contact_* identity fields
     * - payload
     * - contact_eligible (based on your table screenshot)
     * - permission_to_contact (if your table has it; if it doesn't, we keep it in payload anyway)
     * - created_at/updated_at
     */
    const insertPayload: Record<string, unknown> = {
      status,
      notes,
      archived,
      completed_at,

      title,
      source,

      contact_name,
      contact_email,
      contact_phone,

      payload,

      created_at: now,
      updated_at: now,
    };

    // Only add these if present (prevents accidental “column not found” errors if schema changes)
    if (contact_eligible !== null) insertPayload.contact_eligible = contact_eligible;
    if (permission_to_contact !== null) insertPayload.permission_to_contact = permission_to_contact;
    if (entry_initials) insertPayload.entry_initials = entry_initials;

    const { data, error } = await supabase.from("followups").insert(insertPayload).select().single();

    if (error) {
      return jsonResponse(500, { error: error.message });
    }

    return jsonResponse(200, { ok: true, item: data });
  } catch (err: any) {
    return jsonResponse(500, {
      error: err?.message ?? "followups-create failed.",
    });
  }
};