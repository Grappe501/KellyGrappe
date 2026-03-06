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
  if (!precinct && !county) {
    return json(400, { ok: false, error: "Provide at least a precinct or county." });
  }

  return json(200, {
    ok: true,
    note:
      "Scaffolding endpoint only. Wire your Census API key, BLS series list, and local precinct crosswalk in the next phase.",
    request: { precinct, county },
    plannedSignals: [
      "median_income",
      "unemployment_rate",
      "education_index",
      "rent_burden",
      "population_change",
      "labor_force_participation",
    ],
  });
};
