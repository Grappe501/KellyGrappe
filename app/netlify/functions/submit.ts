import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashIp(ip: string) {
  return crypto
    .createHash("sha256")
    .update(ip + process.env.TELEMETRY_SALT)
    .digest("hex");
}

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const ip =
      event.headers["x-forwarded-for"] ||
      event.headers["client-ip"] ||
      "unknown";

    const visitorId = body.visitorId || null;

    const ipHash = hashIp(ip);

    const { data, error } = await supabase
      .from("event_requests")
      .insert({
        contact_name: body.contactName,
        contact_email: body.contactEmail,
        contact_phone: body.contactPhone,
        organization: body.organization,

        event_title: body.eventTitle,
        event_type: body.eventType,
        event_description: body.eventDescription,

        start_time: body.startDateTime,
        end_time: body.endDateTime,

        venue_name: body.venueName,
        address_line1: body.addressLine1,
        address_line2: body.addressLine2,
        city: body.city,
        state: body.state,
        zip: body.zip,

        requested_role: body.requestedRole,
        expected_attendance: body.expectedAttendance,
        media_expected: body.mediaExpected,

        visitor_id: visitorId,
        ip_hash: ipHash,
        user_agent: event.headers["user-agent"],
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        requestId: data.id,
        ipHash,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};