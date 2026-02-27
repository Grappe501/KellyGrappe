import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashIp(ip: string) {
  return crypto
    .createHash("sha256")
    .update(ip + (process.env.TELEMETRY_SALT ?? ""))
    .digest("hex");
}

function parseCookies(cookieHeader: string | undefined) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    out[rawKey] = decodeURIComponent(rest.join("=") || "");
  }
  return out;
}

function pickClientIp(headers: Record<string, string | undefined>) {
  const xff = headers["x-forwarded-for"];
  if (xff) return xff.split(",")[0].trim();
  return headers["client-ip"] || "unknown";
}

function asString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function asNullableString(v: unknown) {
  const s = asString(v).trim();
  return s ? s : null;
}

export const handler = async (event: any) => {
  try {
    const headers = (event.headers || {}) as Record<string, string | undefined>;
    const body = JSON.parse(event.body || "{}");

    // Anti-spam honeypot: if it's filled, pretend success but do nothing.
    if (asString(body?.honeypot).trim()) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, requestId: "spam_ignored" }),
      };
    }

    // Our client submits { moduleId, data, ... }
    const moduleId = asString(body?.moduleId).trim();
    const data = (body?.data || {}) as Record<string, unknown>;

    const ip = pickClientIp(headers);
    const ipHash = hashIp(ip);

    // Prefer explicit body.visitorId, else cookie kg_vid, else null
    const cookies = parseCookies(headers["cookie"]);
    const visitorId =
      asNullableString(body?.visitorId) ?? asNullableString(cookies["kg_vid"]);

    // Only Event Requests are supported by this function right now
    if (moduleId !== "MODULE_001_EVENT_REQUEST") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Unsupported moduleId: ${moduleId || "(missing)"}`,
        }),
      };
    }

    // Required field (matches DB NOT NULL constraint)
    const eventTitle = asNullableString(data["eventTitle"]);
    if (!eventTitle) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required field: eventTitle" }),
      };
    }

    const { data: inserted, error } = await supabase
      .from("event_requests")
      .insert({
        contact_name: asNullableString(data["contactName"]),
        contact_email: asNullableString(data["contactEmail"]),
        contact_phone: asNullableString(data["contactPhone"]),
        organization: asNullableString(data["organization"]),

        event_title: eventTitle,
        event_type: asNullableString(data["eventType"]),
        event_description: asNullableString(data["eventDescription"]),

        start_time: asNullableString(data["startDateTime"]),
        end_time: asNullableString(data["endDateTime"]),

        venue_name: asNullableString(data["venueName"]),
        address_line1: asNullableString(data["addressLine1"]),
        address_line2: asNullableString(data["addressLine2"]),
        city: asNullableString(data["city"]),
        state: asNullableString(data["state"]),
        zip: asNullableString(data["zip"]),

        requested_role: asNullableString(data["requestedRole"]),
        expected_attendance: asNullableString(data["expectedAttendance"]),
        media_expected: asNullableString(data["mediaExpected"]),

        visitor_id: visitorId,
        ip_hash: ipHash,
        user_agent: asNullableString(headers["user-agent"]),
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        requestId: inserted.id,
        ipHash,
      }),
    };
  } catch (err: any) {
    console.error("submit.ts handler error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};