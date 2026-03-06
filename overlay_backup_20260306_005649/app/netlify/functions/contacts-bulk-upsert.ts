import { createClient } from "@supabase/supabase-js";

import { logError, logInfo, logWarn } from "./_shared/logger";

type IncomingContact = {
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  tags?: string[];
  permissionToContact?: boolean | null;
};

type BulkUpsertBody = {
  batch?: {
    sourceType?: string;
    fileName?: string;
    tag?: string;
  };
  contacts?: IncomingContact[];
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeEmail(v: unknown) {
  const s = safeTrim(v).toLowerCase();
  return s || null;
}

function normalizePhone(v: unknown) {
  const s = safeTrim(v).replace(/\D/g, "");
  return s || null;
}

function uniqStrings(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    const s = safeTrim(v);
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export const handler = async (event: any) => {
  try {
    const supabase = createClient(mustEnv("SUPABASE_URL"), mustEnv("SUPABASE_SERVICE_ROLE_KEY"));

    const body = (JSON.parse(event.body || "{}") || {}) as BulkUpsertBody;
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];

    if (!contacts.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "No contacts provided." }),
      };
    }

    const sourceType = safeTrim(body.batch?.sourceType) || "CONTACT_IMPORT";
    const fileName = safeTrim(body.batch?.fileName) || null;
    const batchTag = safeTrim(body.batch?.tag) || null;

    let batchId: string | null = null;

    // Best-effort batch record for auditing.
    try {
      const { data, error } = await supabase
        .from("import_batches")
        .insert({ source_type: sourceType, file_name: fileName, tag: batchTag, row_count: contacts.length })
        .select()
        .single();

      if (error) {
        logWarn({ event: "contacts_bulk_upsert.batch_create_failed", function: "contacts-bulk-upsert", details: error });
      } else {
        batchId = data?.id ?? null;
      }
    } catch (e: any) {
      logWarn({ event: "contacts_bulk_upsert.batch_create_exception", function: "contacts-bulk-upsert", details: e?.message ?? e });
    }

    const normalized = contacts.map((c) => {
      const email = normalizeEmail(c.email);
      const phone = normalizePhone(c.phone);

      return {
        full_name: safeTrim(c.fullName) || null,
        email,
        phone,
        city: safeTrim(c.city) || null,
        county: safeTrim(c.county) || null,
        state: safeTrim(c.state) || "AR",
        zip: safeTrim(c.zip) || null,
        tags: uniqStrings(c.tags),
        permission_to_contact:
          typeof c.permissionToContact === "boolean" ? c.permissionToContact : null,
        source: sourceType,
      };
    });

    const withEmail = normalized.filter((r) => !!r.email);
    const phoneOnly = normalized.filter((r) => !r.email && !!r.phone);
    const missingKey = normalized.filter((r) => !r.email && !r.phone);

    let inserted = 0;
    let upserted = 0;

    async function runUpsert(rows: any[], onConflict: string) {
      if (!rows.length) return;
      const { data, error } = await supabase
        .from("contacts")
        .upsert(rows, { onConflict, ignoreDuplicates: false })
        .select();

      if (error) throw error;
      upserted += Array.isArray(data) ? data.length : 0;
    }

    // Best effort upserts. These assume you add unique indexes on contacts.email and contacts.phone.
    try {
      await runUpsert(withEmail, "email");
      await runUpsert(phoneOnly, "phone");
    } catch (e: any) {
      logError({ event: "contacts_bulk_upsert.upsert_failed", function: "contacts-bulk-upsert", details: e?.message ?? e });
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: e?.message ?? "Upsert failed." }),
      };
    }

    // Best-effort origins (if you create contact_origins).
    try {
      if (batchId) {
        const originRows = normalized
          .filter((r) => r.email || r.phone)
          .map((r) => ({
            batch_id: batchId,
            origin_type: sourceType,
            origin_label: fileName,
            // store the raw normalized payload for audits
            raw_payload: r,
          }));

        // This is intentionally not linked to a contact_id because we can't reliably know it
        // without more complex lookups; you can evolve the schema later.
        await supabase.from("import_rows").insert(originRows);
      }
    } catch (e: any) {
      // Don't fail the import if audit tables aren't set up yet.
      logWarn({ event: "contacts_bulk_upsert.audit_write_failed", function: "contacts-bulk-upsert", details: e?.message ?? e });
    }

    logInfo({
      event: "contacts_bulk_upsert.completed",
      function: "contacts-bulk-upsert",
      details: {
        total: contacts.length,
        upserted,
        missingKey: missingKey.length,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        total: contacts.length,
        upserted,
        missingKey: missingKey.length,
        batchId,
      }),
    };
  } catch (e: any) {
    logError({ event: "contacts_bulk_upsert.unhandled", function: "contacts-bulk-upsert", details: e?.message ?? e });
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e?.message ?? "Server error." }),
    };
  }
};
