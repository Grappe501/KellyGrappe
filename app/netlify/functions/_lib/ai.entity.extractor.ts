/**
 * ai.entity.extractor.ts
 *
 * AI entity extraction service for Civic OS ingestion pipeline.
 *
 * Converts raw text (from spreadsheets, OCR, PDFs, transcripts)
 * into structured civic entities that can later be mapped into the database.
 */

import OpenAI from "openai"

/* -------------------------------------------------------------------------- */
/* OPENAI CLIENT                                                              */
/* -------------------------------------------------------------------------- */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type CivicEntityType =
  | "person"
  | "organization"
  | "candidate"
  | "committee"
  | "donor"
  | "event"
  | "location"
  | "email"
  | "phone"
  | "issue"
  | "policy"
  | "document"

export interface CivicEntity {
  type: CivicEntityType
  name?: string
  value?: string
  role?: string
  organization?: string
  date?: string
  amount?: number
  location?: string
  confidence: number
}

export interface EntityExtractionResult {
  entities: CivicEntity[]
  metadata: {
    chunkCount: number
    model: string
  }
}

/* -------------------------------------------------------------------------- */
/* CONFIG                                                                     */
/* -------------------------------------------------------------------------- */

const MODEL = "gpt-4o"

const MAX_CHUNK_SIZE = 6000

const MAX_RETRIES = 3

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

function chunkText(text: string, maxSize: number): string[] {

  const chunks: string[] = []

  let start = 0

  while (start < text.length) {
    chunks.push(text.slice(start, start + maxSize))
    start += maxSize
  }

  return chunks

}

function safeJsonParse(input: string): unknown {

  try {
    return JSON.parse(input)
  } catch {
    return null
  }

}

/* -------------------------------------------------------------------------- */
/* OPENAI CALL                                                                */
/* -------------------------------------------------------------------------- */

async function callOpenAI(prompt: string, retries = MAX_RETRIES): Promise<any> {

  try {

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `
You are a civic data extraction engine.

Extract structured civic entities from text.

Return JSON in this format:

{
  "entities": [
    {
      "type": "person | organization | candidate | committee | donor | event | location | email | phone | issue | policy | document",
      "name": "Entity name if applicable",
      "value": "Value if applicable",
      "role": "Role or description",
      "organization": "Associated organization",
      "date": "Relevant date",
      "amount": 0,
      "location": "Location if relevant",
      "confidence": 0.0
    }
  ]
}

Rules:
- Only return valid JSON
- Do not include commentary
- Extract as many entities as possible
- Confidence must be between 0 and 1
`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    })

    const content = response.choices?.[0]?.message?.content

    if (!content) return null

    return safeJsonParse(content)

  } catch (error) {

    if (retries > 0) {
      return callOpenAI(prompt, retries - 1)
    }

    console.error("Entity extraction failed:", error)

    return null

  }

}

/* -------------------------------------------------------------------------- */
/* ENTITY NORMALIZATION                                                       */
/* -------------------------------------------------------------------------- */

function normalizeEntity(raw: any): CivicEntity | null {

  if (!raw || typeof raw !== "object") return null

  if (!raw.type) return null

  const confidence =
    typeof raw.confidence === "number"
      ? Math.max(0, Math.min(1, raw.confidence))
      : 0.7

  return {
    type: raw.type,
    name: raw.name,
    value: raw.value,
    role: raw.role,
    organization: raw.organization,
    date: raw.date,
    amount: raw.amount,
    location: raw.location,
    confidence
  }

}

/* -------------------------------------------------------------------------- */
/* MAIN EXTRACTION                                                            */
/* -------------------------------------------------------------------------- */

export async function extractEntities(
  text: string
): Promise<EntityExtractionResult> {

  if (!text || text.length === 0) {

    return {
      entities: [],
      metadata: {
        chunkCount: 0,
        model: MODEL
      }
    }

  }

  const chunks = chunkText(text, MAX_CHUNK_SIZE)

  const allEntities: CivicEntity[] = []

  for (const chunk of chunks) {

    const result = await callOpenAI(chunk)

    if (!result || !Array.isArray(result.entities)) continue

    for (const entity of result.entities) {

      const normalized = normalizeEntity(entity)

      if (normalized) {
        allEntities.push(normalized)
      }

    }

  }

  return {
    entities: allEntities,
    metadata: {
      chunkCount: chunks.length,
      model: MODEL
    }
  }

}
