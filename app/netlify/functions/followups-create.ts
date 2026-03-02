// app/netlify/functions/followups-create.ts
import { createClient } from "@supabase/supabase-js";

type FollowUpStatus = "NEW" | "IN_PROGRESS" | "COMPLETED";

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      // CORS (safe default for Netlify functions used by your SPA)
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function safeJsonParse(raw: unknown): any {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function asString(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function asNullableString(v: unknown): string | null {
  const s = asString(v).trim();
  return s ? s : null;
}

function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = v.toLowerCase().trim();
    if (t === "true") return true;
    if (t === "false") return false;
  }
  return fallback;
}

function isStatus(v: string): v is FollowUpStatus {
  return v === "NEW" || v === "IN_PROGRESS" || v === "COMPLETED";
}

function normalizeInitials(raw: unknown): string | null {
  const v = asString(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const sliced = v.slice(0, 3);
  return sliced ? sliced : null;
}

function nowIso() {
  return new Date().toISOString();
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return String(v);
}

export const handler = async (event: any) => {
  // Netlify preflight
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  try {
    const SUPABASE_URL = requireEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = safeJsonParse(event.body);

    /**
     * We keep this function schema-safe:
     * - Only insert columns we are confident exist on public.followups
     * - Anything extra goes into payload JSON
     *
     * Known/used elsewhere in your project:
     * - status, notes, archived, completed_at, created_at, updated_at
     * - source, title
     * - contact_name, contact_email, contact_phone
     * - payload (json)
     * - calendar_event_id, calendar_event_link (used later via update)
     */

    const rawStatus = asString(body.status, "NEW").trim().toUpperCase();
    const status: FollowUpStatus = isStatus(rawStatus as FollowUpStatus)
      ? (rawStatus as FollowUpStatus)
      : "NEW";

    const archived = asBool(body.archived, false);

    const completed_at =
      status === "COMPLETED"
        ? asNullableString(body.completed_at) ?? nowIso()
        : asNullableString(body.completed_at); // allow null/undefined when not completed

    const insertPayload: Record<string, unknown> = {
      source: asNullableString(body.source) ?? "LIVE_FIELD",
      status,

      title: asNullableString(body.title) ?? asNullableString(body.contact_name) ?? asNullableString(body.name),
      notes: typeof body.notes === "string" ? body.notes : body.notes === null ? null : null,

      contact_name: asNullableString(body.contact_name) ?? asNullableString(body.name),
      contact_email: asNullableString(body.contact_email) ?? asNullableString(body.email),
      contact_phone: asNullableString(body.contact_phone) ?? asNullableString(body.phone),

      archived,
      completed_at: completed_at ?? null,

      // Keep *everything* for audit/debug + future migrations (safe JSON column)
      payload: body && typeof body === "object" ? body : {},

      created_at: nowIso(),
      updated_at: nowIso(),
    };

    // Optional metadata: only store in payload unless/until you add columns.
    // (This avoids "column does not exist" failures like automation_eligible.)
    const entry_initials = normalizeInitials(body.entry_initials ?? body.entryInitials);
    if (entry_initials) {
      (insertPayload.payload as any).entry_initials = entry_initials;
    }

    const { data, error } = await supabase
      .from("followups")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      return jsonResponse(500, { ok: false, error: error.message });
    }

    return jsonResponse(200, { ok: true, item: data });
  } catch (err: any) {
    return jsonResponse(500, {
      ok: false,
      error: err?.message ?? "followups-create failed.",
    });
  }
};