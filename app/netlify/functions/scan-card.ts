import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(500, { ok: false, error: 'Missing OPENAI_API_KEY' });
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  const frontImage = body?.frontImage;
  const backImage = body?.backImage;

  if (!frontImage) {
    return json(400, { ok: false, error: 'Missing frontImage' });
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are a structured data extractor.

Extract contact details from this business card.

Return ONLY valid JSON in this exact structure:

{
  "fullName": string | null,
  "email": string | null,
  "phone": string | null,
  "company": string | null,
  "title": string | null,
  "website": string | null,
  "address": string | null,
  "facebookHandle": string | null
}

If a field does not exist, return null.
Do not include any explanation text.
    `;

    const images = [
      {
        type: "input_image",
        image_url: frontImage
      }
    ];

    if (backImage) {
      images.push({
        type: "input_image",
        image_url: backImage
      });
    }

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...images
          ]
        }
      ],
      temperature: 0
    });

    const output = response.output_text;

    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch {
      return json(500, {
        ok: false,
        error: 'Model returned invalid JSON',
        raw: output
      });
    }

    return json(200, {
      ok: true,
      data: parsed
    });

  } catch (err: any) {
    console.error('[scan-card] error:', err);
    return json(500, {
      ok: false,
      error: err?.message ?? 'Scan failed'
    });
  }
};