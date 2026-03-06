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

function heuristicAssist(objective: string, contacts: any[]) {
  const q = objective.toLowerCase();
  const scored = contacts
    .map((contact) => {
      let score = 0;
      const corpus = [
        contact.fullName,
        contact.city,
        contact.county,
        contact.organization,
        ...(contact.tags ?? []),
        ...(contact.rolePotential ?? []),
        ...(contact.teamAssignments ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      for (const token of q.split(/[^a-z0-9#]+/i).filter(Boolean)) {
        if (corpus.includes(token)) score += 2;
      }
      score += Number(contact.organizerScore || 0);
      score += Number(contact.turnoutScore || 0) * 0.75;
      score += Number(contact.persuasionScore || 0) * (q.includes("persuad") ? 1 : 0.25);
      return { contact, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  return {
    summary:
      "Heuristic fallback used. Add OPENAI_API_KEY in Netlify to upgrade this panel to model-assisted ranking.",
    suggestedTags: Array.from(
      new Set(scored.flatMap((item) => (item.contact.tags ?? []).slice(0, 2)))
    ).slice(0, 8),
    suggestedLocations: Array.from(
      new Set(scored.map((item) => item.contact.county || item.contact.city).filter(Boolean))
    ).slice(0, 6),
    recommendedIds: scored.map((item) => String(item.contact.id)),
    nextStep: `Review the top ${scored.length} ranked contacts for: ${objective}`,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  let body: any;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const objective = safeTrim(body?.objective);
  const contacts = Array.isArray(body?.contacts) ? body.contacts.slice(0, 250) : [];

  if (!objective) return json(400, { ok: false, error: "Missing objective" });
  if (!contacts.length) return json(400, { ok: false, error: "No contacts supplied" });

  if (!process.env.OPENAI_API_KEY) {
    return json(200, heuristicAssist(objective, contacts));
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are helping a political field organizer triage contacts.

Objective:
${objective}

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
- Use turnout, persuasion, districts, skills, tags, and notes if present.
- Keep nextStep operational and concise.
- No markdown.`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_text", text: JSON.stringify(contacts) },
          ],
        },
      ],
      temperature: 0.2,
    });

    const parsed = JSON.parse(response.output_text);
    const allowedIds = new Set(contacts.map((contact: any) => String(contact.id)));

    return json(200, {
      summary: safeTrim(parsed?.summary),
      suggestedTags: Array.isArray(parsed?.suggestedTags)
        ? parsed.suggestedTags.map((v: unknown) => safeTrim(v)).filter(Boolean)
        : [],
      suggestedLocations: Array.isArray(parsed?.suggestedLocations)
        ? parsed.suggestedLocations.map((v: unknown) => safeTrim(v)).filter(Boolean)
        : [],
      recommendedIds: Array.isArray(parsed?.recommendedIds)
        ? parsed.recommendedIds
            .map((id: unknown) => String(id))
            .filter((id: string) => allowedIds.has(id))
        : [],
      nextStep: safeTrim(parsed?.nextStep),
    });
  } catch (err: any) {
    console.error("[contact-ai-assist] error", err);
    return json(200, heuristicAssist(objective, contacts));
  }
};
