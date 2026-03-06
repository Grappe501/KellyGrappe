import type { Handler } from "@netlify/functions";
import OpenAI from "openai";

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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(500, { ok: false, error: "Missing OPENAI_API_KEY" });
  }

  let body: any;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const objective = safeTrim(body?.objective);
  const contacts = Array.isArray(body?.contacts) ? body.contacts.slice(0, 200) : [];

  if (!objective) {
    return json(400, { ok: false, error: "Missing objective" });
  }

  if (!contacts.length) {
    return json(400, { ok: false, error: "No contacts supplied" });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are helping a political field organizer triage contacts.

Objective:
${objective}

You will receive a JSON array of contacts. Rank the best matches for the objective.

Return ONLY valid JSON in this exact shape:
{
  "summary": string,
  "suggestedTags": string[],
  "suggestedLocations": string[],
  "recommendedIds": string[],
  "nextStep": string
}

Rules:
- recommendedIds must contain only ids from the provided contacts array.
- Return the strongest 5-15 ids, ordered best first.
- suggestedTags should be concise, practical, and based on actual contact data.
- suggestedLocations should be concise, practical, and based on actual contact data.
- nextStep should be a short operational instruction.
- No markdown. JSON only.`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            {
              type: "input_text",
              text: JSON.stringify(contacts),
            },
          ],
        },
      ],
      temperature: 0.2,
    });

    const output = response.output_text;
    let parsed: any;

    try {
      parsed = JSON.parse(output);
    } catch {
      return json(500, { ok: false, error: "Model returned invalid JSON", raw: output });
    }

    const allowedIds = new Set(contacts.map((contact: any) => String(contact.id)));
    const recommendedIds = Array.isArray(parsed?.recommendedIds)
      ? parsed.recommendedIds
          .map((id: unknown) => String(id))
          .filter((id: string) => allowedIds.has(id))
      : [];

    return json(200, {
      summary: safeTrim(parsed?.summary),
      suggestedTags: Array.isArray(parsed?.suggestedTags)
        ? parsed.suggestedTags.map((v: unknown) => safeTrim(v)).filter(Boolean)
        : [],
      suggestedLocations: Array.isArray(parsed?.suggestedLocations)
        ? parsed.suggestedLocations.map((v: unknown) => safeTrim(v)).filter(Boolean)
        : [],
      recommendedIds,
      nextStep: safeTrim(parsed?.nextStep),
    });
  } catch (err: any) {
    console.error("[contact-ai-assist] error", err);
    return json(500, { ok: false, error: err?.message ?? "AI assist failed" });
  }
};
