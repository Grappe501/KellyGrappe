import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function normalizePhone(v: unknown) {
  return safeTrim(v).replace(/\D/g, "");
}

function normalizeEmail(v: unknown) {
  return safeTrim(v).toLowerCase();
}

function extractMissingColumn(message: string) {
  const match = message.match(/column ['"]?([a-zA-Z0-9_]+)['"]?/i);
  return match?.[1] ?? null;
}

async function schemaSafeUpsert(
  supabase: ReturnType<typeof createClient>,
  basePayload: Record<string, unknown>,
  conflictTarget: "email" | "phone"
) {
  const payload = { ...basePayload };

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase
      .from("contacts")
      .upsert(payload as any, { onConflict: conflictTarget, ignoreDuplicates: false });

    if (!error) return { ok: true, payload };

    const missingColumn = extractMissingColumn(error.message || "");
    if (!missingColumn || !(missingColumn in payload)) {
      return { ok: false, error: error.message, payload };
    }

    delete payload[missingColumn];
  }

  return { ok: false, error: "Schema safe upsert exceeded retry budget.", payload };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return json(500, { ok: false, error: "Missing Supabase environment variables." });
  }

  let body: any;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON." });
  }

  const contacts = Array.isArray(body?.contacts) ? body.contacts : [];
  if (!contacts.length) {
    return json(400, { ok: false, error: "No contacts supplied." });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    let upserted = 0;
    let missingKey = 0;

    for (const raw of contacts) {
      const email = normalizeEmail(raw?.email ?? raw?.email_address ?? raw?.emailAddress);
      const phone = normalizePhone(raw?.phone ?? raw?.mobile);

      if (!email && !phone) {
        missingKey++;
        continue;
      }

      const payload: Record<string, unknown> = {
        full_name: safeTrim(raw?.full_name || raw?.fullName || raw?.name),
        email: email || null,
        phone: phone || null,
        city: safeTrim(raw?.city) || null,
        county: safeTrim(raw?.county) || null,
        state: safeTrim(raw?.state) || null,
        zip: safeTrim(raw?.zip) || null,
        precinct: safeTrim(raw?.precinct) || null,
        congressional_district:
          safeTrim(raw?.congressional_district || raw?.congressionalDistrict) || null,
        state_house_district:
          safeTrim(raw?.state_house_district || raw?.stateHouseDistrict) || null,
        state_senate_district:
          safeTrim(raw?.state_senate_district || raw?.stateSenateDistrict) || null,
        voter_file_id: safeTrim(raw?.voter_file_id || raw?.voterFileId) || null,
        source: safeTrim(raw?.source || body?.batch?.sourceType || "CONTACT_IMPORT"),
        tags: Array.isArray(raw?.tags)
          ? raw.tags
          : Array.isArray(body?.batch?.tags)
          ? body.batch.tags
          : [],
        permission_to_contact:
          typeof raw?.permission_to_contact === "boolean"
            ? raw.permission_to_contact
            : typeof raw?.permissionToContact === "boolean"
            ? raw.permissionToContact
            : null,
      };

      const conflictTarget = email ? "email" : "phone";
      const result = await schemaSafeUpsert(supabase, payload, conflictTarget);

      if (!result.ok) {
        return json(500, { ok: false, error: result.error, payload: result.payload });
      }

      upserted++;
    }

    return json(200, { ok: true, upserted, missingKey });
  } catch (err: any) {
    return json(500, { ok: false, error: err?.message ?? "contacts-bulk-upsert failed." });
  }
};
