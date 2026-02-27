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

type FollowUpEnqueueResult =
  | { ok: true; followUpId: string }
  | { ok: false; error: string };

async function tryEnqueueFollowUp(params: {
  source: string;
  moduleId: string;
  title: string;
  notes?: string | null;
  status?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  visitorId?: string | null;
  ipHash: string;
  userAgent?: string | null;
  payload: Record<string, unknown>;
}): Promise<FollowUpEnqueueResult> {
  try {
    // IMPORTANT:
    // This requires a Supabase table named "followups" (we will create next).
    // Until it exists, this will fail — and we must not break submission.
    const { data, error } = await supabase
      .from("followups")
      .insert({
        source: params.source,
        module_id: params.moduleId,
        status: params.status ?? "NEW",
        title: params.title,
        notes: params.notes ?? null,

        contact_name: params.contactName ?? null,
        contact_email: params.contactEmail ?? null,
        contact_phone: params.contactPhone ?? null,

        visitor_id: params.visitorId ?? null,
        ip_hash: params.ipHash,
        user_agent: params.userAgent ?? null,

        payload: params.payload ?? {},
      })
      .select()
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, followUpId: data.id };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Follow-up enqueue failed." };
  }
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

    // Our client submits { moduleId, data, visitorId, ... }
    const moduleId = asString(body?.moduleId).trim();
    const data = (body?.data || {}) as Record<string, unknown>;

    const ip = pickClientIp(headers);
    const ipHash = hashIp(ip);

    // Prefer explicit body.visitorId, else cookie kg_vid, else null
    const cookies = parseCookies(headers["cookie"]);
    const visitorId =
      asNullableString(body?.visitorId) ?? asNullableString(cookies["kg_vid"]);

    const userAgent = asNullableString(headers["user-agent"]);

    // ROUTING (we’ll add more modules next)
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

    const contactName = asNullableString(data["contactName"]);
    const contactEmail = asNullableString(data["contactEmail"]);
    const contactPhone = asNullableString(data["contactPhone"]);

    // 1) Insert event request (typed columns)
    const { data: inserted, error } = await supabase
      .from("event_requests")
      .insert({
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
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
        user_agent: userAgent,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error (event_requests):", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    // 2) Enqueue global follow-up (best-effort until table exists)
    const followUpResult = await tryEnqueueFollowUp({
      source: "Event Request",
      moduleId,
      title: contactName ? `${contactName} — Event Request` : `Event Request`,
      notes: "New event request submitted.",
      status: "NEW",
      contactName,
      contactEmail,
      contactPhone,
      visitorId,
      ipHash,
      userAgent,
      payload: {
        // store the event details for Option A (staff review -> create calendar hold)
        requestId: inserted.id,
        eventTitle,
        eventType: asNullableString(data["eventType"]),
        eventDescription: asNullableString(data["eventDescription"]),
        startDateTime: asNullableString(data["startDateTime"]),
        endDateTime: asNullableString(data["endDateTime"]),
        venueName: asNullableString(data["venueName"]),
        addressLine1: asNullableString(data["addressLine1"]),
        addressLine2: asNullableString(data["addressLine2"]),
        city: asNullableString(data["city"]),
        state: asNullableString(data["state"]),
        zip: asNullableString(data["zip"]),
        requestedRole: asNullableString(data["requestedRole"]),
        expectedAttendance: asNullableString(data["expectedAttendance"]),
        mediaExpected: asNullableString(data["mediaExpected"]),
      },
    });

    if (!followUpResult.ok) {
      // Do NOT fail intake; log so we can fix schema / table creation next.
      console.warn("Follow-up enqueue failed:", followUpResult.error);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        requestId: inserted.id,
        ipHash,
        followUpEnqueued: followUpResult.ok,
        followUpId: followUpResult.ok ? followUpResult.followUpId : null,
        followUpError: followUpResult.ok ? null : followUpResult.error,
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