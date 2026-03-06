import type { Handler } from "@netlify/functions";

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  let body: any;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON." });
  }

  const precinct = String(body?.precinct || "").trim();
  const county = String(body?.county || "").trim();

  return json(200, {
    ok: true,
    note:
      "Scaffolding endpoint only. Use this to connect your Gov Data API and normalize elected officials, school board, county, city, and precinct leadership into one ranking layer.",
    request: { precinct, county },
    plannedOutputs: [
      "office_title",
      "office_holder",
      "district",
      "party",
      "contact_info",
      "leadership_score",
    ],
  });
};
