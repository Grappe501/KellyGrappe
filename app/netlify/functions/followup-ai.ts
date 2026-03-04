// app/netlify/functions/followup-ai.ts

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
      // FUTURE: database enrichment injection
      voterHistory,
      volunteerProfile,
      pastInteractions,
    } = body;

    const systemPrompt = `
You are a senior campaign field director, political strategist, and voter persuasion architect.

This application is a live campaign operations system for a Secretary of State race.

Every follow-up entry represents:
- A voter persuasion opportunity
- A potential volunteer
- A potential donor
- A strategic influencer
- Or a risk scenario

Your job is to think like a campaign war room.

You must provide:

1. CLASSIFICATION
   - What type of contact is this?
   - Likely persuasion tier? (Strong Supporter / Lean Supporter / Persuadable / Opposed / Influencer / Donor Prospect)
   - Volunteer potential assessment
   - Donor potential assessment

2. FIELD OPERATIONS STRATEGY
   - Immediate tactical action
   - Recommended communication channel
   - Suggested sequencing (what happens next after this action)
   - Whether escalation is required

3. MESSAGE STRATEGY
   - Recommended issue framing
   - Trust-building approach
   - Suggested tone
   - Short script

4. CAMPAIGN MANAGEMENT INSIGHT
   - Should this contact move into a pipeline?
     (Volunteer Track / Donor Track / Relational Organizing / Event Recruitment / Data Clean-Up)
   - What data is missing that should be captured next?

5. RISK + URGENCY
   - Risk flags
   - What happens if ignored
   - Strategic consequence

Respond ONLY in valid JSON.
Do not include markdown.
Do not include commentary outside JSON.
`;

    const userPrompt = `
CONTACT DATA
Name: ${name}
Source: ${source}
Status: ${status}
SLA Level: ${slaLevel}
Age (hours): ${ageHours}
Assigned To: ${assignedTo ?? "Unassigned"}

NOTES:
${notes}

DATABASE CONTEXT (if available):
Voter History: ${JSON.stringify(voterHistory ?? {})}
Volunteer Profile: ${JSON.stringify(volunteerProfile ?? {})}
Past Interactions: ${JSON.stringify(pastInteractions ?? [])}

Return JSON structured as:

{
  "classification": {
    "contactType": "",
    "persuasionTier": "",
    "volunteerPotential": "",
    "donorPotential": ""
  },
  "fieldStrategy": {
    "immediateAction": "",
    "channel": "",
    "sequencePlan": "",
    "escalationNeeded": ""
  },
  "messageStrategy": {
    "framing": "",
    "tone": "",
    "script": ""
  },
  "pipelineRecommendation": {
    "moveTo": "",
    "dataToCaptureNext": ""
  },
  "riskAssessment": {
    "riskFlags": "",
    "urgencyExplanation": ""
  }
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = completion.choices[0].message.content || "{}";

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        error: "AI response parsing failed",
        raw: text,
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
        error: "AI processing failed",
        details: error.message,
      }),
    };
  }
};