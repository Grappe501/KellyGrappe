// app/netlify/functions/event-assist.ts
import type { Handler } from '@netlify/functions';

type Mode = 'extract' | 'drafts';

function json(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(500, { error: 'Missing OPENAI_API_KEY env var.' });
  }

  try {
    const parsed = JSON.parse(event.body || '{}');
    const mode = (parsed.mode || 'extract') as Mode;
    const text = safeTrim(parsed.text);
    const formContext = parsed.formContext || {};

    if (!text) {
      return json(400, { error: 'Missing text.' });
    }

    const system = `
You are an expert campaign operations intake assistant.
Your job: turn messy event text into clean structured scheduling data + helpful drafts.

Rules:
- Be conservative. If unsure, leave fields blank and add a note.
- Never invent addresses or dates.
- If the text implies a location but not a full address, put venueName and city/state if present.
- Output MUST be valid JSON matching the schema requested.
`;

    const extractSchema = `
Return JSON with:
{
  "extracted": {
    "eventTitle": string?,
    "eventType": one of:
      "Candidate Forum / Debate" | "Church Service / Faith Event" | "Community Town Hall" |
      "School / Sports Event" | "Festival / Fair / Parade" | "Union / Workplace Gathering" |
      "Civic Club Meeting" | "House Meetup" | "Fundraiser" | "Small Business Visit" | "Other",
    "eventTypeOther": string?,
    "eventDescription": string?,
    "expectedAttendance": "1–10"|"11–25"|"26–50"|"51–100"|"100+” ?,
    "startDateTime": string? (datetime-local format if possible, else blank),
    "endDateTime": string? (datetime-local format if possible, else blank),
    "isTimeFlexible": boolean?,
    "venueName": string?,
    "addressLine1": string?,
    "addressLine2": string?,
    "city": string?,
    "state": string?,
    "zip": string?,
    "organization": string?,
    "mediaExpected": "No"|"Yes"|"Not sure"?
  },
  "confidence": "low"|"medium"|"high",
  "notes": string[]
}
`;

    const draftsSchema = `
Return JSON with:
{
  "drafts": {
    "internalBrief": string,
    "confirmationEmail": string,
    "confirmationText": string,
    "followUpChecklist": string
  },
  "confidence": "low"|"medium"|"high",
  "notes": string[]
}
`;

    const userPrompt =
      mode === 'extract'
        ? `Extract structured event fields from this text. Context: ${JSON.stringify(formContext)}.\n\nTEXT:\n${text}\n\n${extractSchema}`
        : `Generate operational drafts for campaign follow-up using this text. Context: ${JSON.stringify(formContext)}.\n\nTEXT:\n${text}\n\n${draftsSchema}`;

    // Use Responses API with JSON-only instruction.
    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        text: {
          format: { type: 'json_object' },
        },
      }),
    });

    if (!resp.ok) {
      const raw = await resp.text().catch(() => '');
      return json(resp.status, { error: 'OpenAI request failed', details: raw });
    }

    const data = await resp.json();

    // Responses API: try common paths
    const content =
      data?.output_text ||
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output?.[0]?.content?.[0]?.value ||
      '';

    if (!content) {
      return json(500, { error: 'No output from model.' });
    }

    let parsedOut: any = null;
    try {
      parsedOut = JSON.parse(content);
    } catch {
      return json(500, { error: 'Model output was not valid JSON.', raw: content });
    }

    return json(200, parsedOut);
  } catch (e: any) {
    return json(500, { error: e?.message ?? 'Unexpected error' });
  }
};