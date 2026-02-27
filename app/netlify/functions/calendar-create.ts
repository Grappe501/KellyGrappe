// app/netlify/functions/calendar-create.ts
import { createClient } from "@supabase/supabase-js";
import { getGoogleAccessToken } from "./_lib/googleAuth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function asString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function asNullableString(v: unknown) {
  const s = asString(v).trim();
  return s ? s : null;
}

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function isoOrThrow(label: string, v: unknown) {
  const s = asNullableString(v);
  if (!s) throw new Error(`Missing required ${label}.`);
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error(`Invalid ${label} datetime.`);
  return d.toISOString();
}

function buildLocation(payload: Record<string, unknown>) {
  const venue = asNullableString(payload["venueName"]);
  const a1 = asNullableString(payload["addressLine1"]);
  const a2 = asNullableString(payload["addressLine2"]);
  const city = asNullableString(payload["city"]);
  const state = asNullableString(payload["state"]);
  const zip = asNullableString(payload["zip"]);

  const parts = [venue, a1, a2, [city, state, zip].filter(Boolean).join(" ")].filter(
    (x) => !!x
  );
  return parts.join(" • ") || null;
}

function summarize(payload: Record<string, unknown>) {
  const title = asNullableString(payload["eventTitle"]) ?? "Event";
  return `HOLD – ${title}`;
}

export const handler = async (event: any) => {
  try {
    const calendarId = mustEnv("GOOGLE_CALENDAR_ID");
    const body = JSON.parse(event.body || "{}");

    // Option A: staff triggers hold from follow-up row (trusted source)
    const followUpId = asNullableString(body?.followUpId);
    if (!followUpId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required field: followUpId" }),
      };
    }

    // Load follow-up from Supabase (global queue)
    const { data: follow, error: followErr } = await supabase
      .from("followups")
      .select("*")
      .eq("id", followUpId)
      .single();

    if (followErr || !follow) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: followErr?.message ?? "Follow-up not found." }),
      };
    }

    // Prevent duplicates
    if (follow.calendar_event_id) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          alreadyCreated: true,
          calendarEventId: follow.calendar_event_id,
          calendarEventLink: follow.calendar_event_link ?? null,
        }),
      };
    }

    const payload = (follow.payload || {}) as Record<string, unknown>;

    // Pull event timing from follow-up payload (trusted)
    const start = isoOrThrow("startDateTime", payload["startDateTime"]);
    const end = isoOrThrow("endDateTime", payload["endDateTime"]);

    const summary = summarize(payload);
    const location = buildLocation(payload);

    const descriptionParts: string[] = [];
    const eventType = asNullableString(payload["eventType"]);
    const eventDescription = asNullableString(payload["eventDescription"]);
    const requestedRole = asNullableString(payload["requestedRole"]);
    const expectedAttendance = asNullableString(payload["expectedAttendance"]);
    const mediaExpected = asNullableString(payload["mediaExpected"]);
    const requestId = asNullableString(payload["requestId"]);

    if (eventType) descriptionParts.push(`Type: ${eventType}`);
    if (requestedRole) descriptionParts.push(`Requested Role: ${requestedRole}`);
    if (expectedAttendance) descriptionParts.push(`Expected Attendance: ${expectedAttendance}`);
    if (mediaExpected) descriptionParts.push(`Media Expected: ${mediaExpected}`);
    if (requestId) descriptionParts.push(`Request ID: ${requestId}`);
    if (eventDescription) descriptionParts.push(`\nNotes:\n${eventDescription}`);

    const description = descriptionParts.join("\n");

    const accessToken = await getGoogleAccessToken();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary,
          description: description || undefined,
          location: location || undefined,
          start: { dateTime: start },
          end: { dateTime: end },
          // Color is optional; keeping your intent but making it easy to change later
          colorId: "5",
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            data?.error?.message ??
            `Google Calendar create failed (${res.status}).`,
          details: data,
        }),
      };
    }

    const calendarEventId = asNullableString(data?.id);
    const calendarEventLink = asNullableString(data?.htmlLink);

    // Write back to follow-ups so the board shows it forever (global)
    const { error: updErr } = await supabase
      .from("followups")
      .update({
        calendar_event_id: calendarEventId,
        calendar_event_link: calendarEventLink,
        status: "IN_PROGRESS",
      })
      .eq("id", followUpId);

    if (updErr) {
      // Event created but writeback failed — still return success with warning
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          calendarEventId,
          calendarEventLink,
          warning: `Calendar event created but follow-up update failed: ${updErr.message}`,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        calendarEventId,
        calendarEventLink,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message ?? "calendar-create failed." }),
    };
  }
};