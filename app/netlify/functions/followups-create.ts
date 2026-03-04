// app/netlify/functions/followups-create.ts
import { createClient } from "@supabase/supabase-js";

/**
 * ENV VALIDATION
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

/**
 * UTILITIES
 */
function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function asNullableString(v: unknown): string | null {
  const s = asString(v).trim();
  return s.length ? s : null;
}

function asBoolOrNull(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return null;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeInitials(raw: unknown): string {
  const v = asString(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return v.slice(0, 3) || "UNK";
}

function normalizeStatus(raw: unknown): string {
  const s = asString(raw).trim().toUpperCase();
  if (s === "NEW" || s === "IN_PROGRESS" || s === "COMPLETED") return s;
  return "NEW";
}

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

/**
 * HANDLER
 */
export const handler = async (event: any) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed. Use POST." });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      error: "Server misconfigured: Supabase environment variables missing.",
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");

    if (!isObject(body)) return jsonResponse(400, { error: "Invalid request body." });

    /**
     * REQUIRED RELATIONAL FIELD
     */
    const contact_id = asNullableString(body.contact_id);
    if (!contact_id) return jsonResponse(400, { error: "Missing required field: contact_id" });

    /**
     * CORE FIELDS
     */
    const status = normalizeStatus(body.status);
    const notes = asNullableString(body.notes);
    const archived = body.archived === true;
    const completed_at = asNullableString(body.completed_at);

    // NEW: follow-up target time (optional)
    const target_at = asNullableString(body.target_at);

    /**
     * CONTACT SNAPSHOT FIELDS
     */
    const contact_name = asNullableString(body.contact_name || body.name);
    const contact_email = asNullableString(body.contact_email || body.email);
    const contact_phone = asNullableString(body.contact_phone || body.phone);
    const location = asNullableString(body.location);

    /**
     * ELIGIBILITY + PERMISSION
     */
    const contact_eligible =
      asBoolOrNull(body.contact_eligible) ?? asBoolOrNull(body.automation_eligible);

    const permission_to_contact = asBoolOrNull(body.permission_to_contact);

    /**
     * TRACKING
     */
    const entry_initials = normalizeInitials(body.entry_initials);
    const source = asNullableString(body.source);
    const title = asNullableString(body.title);

    const now = new Date().toISOString();

    /**
     * FULL AUDIT SNAPSHOT
     */
    const payload = { ...body, captured_at: now };

    /**
     * FINAL INSERT OBJECT
     *
     * NOTE:
     * - This function assumes your Supabase 'followups' table contains these columns:
     *   contact_id, status, notes, archived, completed_at, target_at,
     *   contact_name, contact_email, contact_phone, location,
     *   source, title, payload, entry_initials, contact_eligible, permission_to_contact,
     *   created_at, updated_at
     */
    const insertPayload: Record<string, unknown> = {
      contact_id,
      status,
      notes,
      archived,
      completed_at,
      target_at,

      contact_name,
      contact_email,
      contact_phone,
      location,

      source,
      title,

      payload,

      created_at: now,
      updated_at: now,
    };

    if (contact_eligible !== null) insertPayload.contact_eligible = contact_eligible;
    if (permission_to_contact !== null) insertPayload.permission_to_contact = permission_to_contact;
    if (entry_initials) insertPayload.entry_initials = entry_initials;

    const { data, error } = await supabase.from("followups").insert(insertPayload).select().single();

    if (error) return jsonResponse(500, { error: error.message });

    return jsonResponse(200, { ok: true, item: data });
  } catch (err: any) {
    return jsonResponse(500, { error: err?.message ?? "followups-create failed." });
  }
};
