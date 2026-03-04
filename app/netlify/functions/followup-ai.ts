// netlify/functions/followup-ai.ts

import type { Handler } from "@netlify/functions";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    const {
      name,
      notes,
      status,
      slaLevel,
      ageHours,
      source,
      assignedTo,
    } = body;

    const prompt = `
You are an elite political campaign operations advisor.

Analyze this follow-up entry and return structured operational guidance.

Contact Name: ${name}
Source: ${source}
Status: ${status}
SLA Level: ${slaLevel}
Age (hours): ${ageHours}
Assigned To: ${assignedTo ?? "Unassigned"}

Notes:
${notes}

Respond ONLY in JSON format with this structure:

{
  "nextAction": "Clear recommended next operational action.",
  "riskFlags": "Any risks, urgency indicators, or warning signs.",
  "script": "Short suggested follow-up script (human tone)."
}

Be practical, operational, and concise.
Do not include markdown.
Do not include commentary outside JSON.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You provide structured operational campaign intelligence.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0].message.content || "{}";

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        nextAction: "AI response parsing failed.",
        riskFlags: "Response was not valid JSON.",
        script: text,
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(parsed),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "AI processing failed.",
        details: error.message,
      }),
    };
  }
};