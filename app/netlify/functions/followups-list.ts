import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function asString(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function asInt(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const handler = async (event: any) => {
  try {
    const qs = event.queryStringParameters || {};
    const limit = Math.min(Math.max(asInt(qs.limit, 100), 1), 500);

    // Optional filters
    const status = asString(qs.status).trim(); // NEW | IN_PROGRESS | COMPLETED
    const archivedRaw = asString(qs.archived).trim(); // "true" / "false" / ""

    let query = supabase
      .from("followups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    if (archivedRaw === "true") query = query.eq("archived", true);
    if (archivedRaw === "false") query = query.eq("archived", false);

    const { data, error } = await query;

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, items: data ?? [] }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message ?? "followups-list failed." }),
    };
  }
};