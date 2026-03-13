import { createClient } from "@supabase/supabase-js"
import "dotenv/config"

/*
=========================================================
Voter Party Model Builder (Arkansas v1)
=========================================================

Purpose
-------
Estimate likely Democratic support, Republican support,
and persuasion potential in a non-party-registration state.

Current inputs
--------------
• initiative_signatures
• civic_engagement_index

Future inputs
-------------
• precinct_partisan_index
• turnout history
• contact outcomes
• volunteer behavior
• demographic overlays

Model notes
-----------
This v1 model is intentionally simple and explainable.

Heuristics:
• Democracy / reform oriented ballot initiatives push a voter
  modestly toward Democratic persuasion universes.
• Broader civic activism increases confidence and reduces
  pure "unknown voter" status.
• Persuasion is highest when dem/rep support are close.

This is a foundation model, not a final one.
=========================================================
*/

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PAGE_SIZE = 1000
const UPSERT_BATCH = 500
const MODEL_VERSION = "v1"

/*
=========================================================
Types
=========================================================
*/

type CivicIndexRow = {
  voter_id: string
  initiative_signatures: number | null
  activism_score: number | null
}

type InitiativeRow = {
  initiative_id: string
  voter_id: string
}

type InitiativeMetaRow = {
  id: string
  name: string | null
}

type InitiativeCategory =
  | "democracy_reform"
  | "ethics_reform"
  | "progressive_issue"
  | "unknown"

/*
=========================================================
Pagination Helpers
=========================================================
*/

async function fetchAllRows<T>(
  table: string,
  selectClause: string
): Promise<T[]> {
  let from = 0
  let allRows: T[] = []

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(selectClause)
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error(`Fetch error from ${table}:`, error)
      throw error
    }

    if (!data || data.length === 0) break

    allRows = allRows.concat(data as T[])

    console.log(`Fetched ${allRows.length} rows from ${table}`)

    if (data.length < PAGE_SIZE) break

    from += PAGE_SIZE
  }

  return allRows
}

/*
=========================================================
Initiative Classification
=========================================================
*/

function classifyInitiative(name: string | null): InitiativeCategory {
  const value = (name || "").toLowerCase()

  if (
    value.includes("rank choice") ||
    value.includes("redistrict") ||
    value.includes("fair play")
  ) {
    return "democracy_reform"
  }

  if (
    value.includes("ethics") ||
    value.includes("fair play")
  ) {
    return "ethics_reform"
  }

  if (
    value.includes("responsible growth") ||
    value.includes("cannabis") ||
    value.includes("marijuana")
  ) {
    return "progressive_issue"
  }

  return "unknown"
}

/*
=========================================================
Fetch Inputs
=========================================================
*/

async function fetchCivicIndex(): Promise<CivicIndexRow[]> {
  return fetchAllRows<CivicIndexRow>(
    "civic_engagement_index",
    "voter_id, initiative_signatures, activism_score"
  )
}

async function fetchInitiativeSignatures(): Promise<InitiativeRow[]> {
  return fetchAllRows<InitiativeRow>(
    "initiative_signatures",
    "initiative_id, voter_id"
  )
}

async function fetchInitiatives(): Promise<InitiativeMetaRow[]> {
  return fetchAllRows<InitiativeMetaRow>(
    "ballot_initiatives",
    "id, name"
  )
}

/*
=========================================================
Build Voter Issue Signals
=========================================================
*/

function buildInitiativeMap(
  initiatives: InitiativeMetaRow[]
): Record<string, InitiativeCategory> {
  const map: Record<string, InitiativeCategory> = {}

  for (const row of initiatives) {
    map[row.id] = classifyInitiative(row.name)
  }

  return map
}

function buildVoterIssueSignals(
  signatures: InitiativeRow[],
  initiativeMap: Record<string, InitiativeCategory>
) {
  const voterSignals: Record<
    string,
    {
      democracy_reform_count: number
      ethics_reform_count: number
      progressive_issue_count: number
      unknown_count: number
    }
  > = {}

  for (const row of signatures) {
    if (!row.voter_id) continue

    if (!voterSignals[row.voter_id]) {
      voterSignals[row.voter_id] = {
        democracy_reform_count: 0,
        ethics_reform_count: 0,
        progressive_issue_count: 0,
        unknown_count: 0
      }
    }

    const category = initiativeMap[row.initiative_id] || "unknown"

    if (category === "democracy_reform") {
      voterSignals[row.voter_id].democracy_reform_count += 1
    } else if (category === "ethics_reform") {
      voterSignals[row.voter_id].ethics_reform_count += 1
    } else if (category === "progressive_issue") {
      voterSignals[row.voter_id].progressive_issue_count += 1
    } else {
      voterSignals[row.voter_id].unknown_count += 1
    }
  }

  return voterSignals
}

/*
=========================================================
Scoring Model
=========================================================
*/

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function computeModelRow(
  civic: CivicIndexRow,
  issueSignals?: {
    democracy_reform_count: number
    ethics_reform_count: number
    progressive_issue_count: number
    unknown_count: number
  }
) {
  const signatures = civic.initiative_signatures ?? 0
  const activism = civic.activism_score ?? 0

  const democracyCount = issueSignals?.democracy_reform_count ?? 0
  const ethicsCount = issueSignals?.ethics_reform_count ?? 0
  const progressiveCount = issueSignals?.progressive_issue_count ?? 0
  const unknownCount = issueSignals?.unknown_count ?? 0

  /*
    Baseline assumptions:
    - Unknown Arkansas voter starts center-right.
    - Democracy reform and progressive issue signers shift left.
    - Higher activism increases confidence in alignment.
  */

  let demSupport = 35
  let repSupport = 45

  demSupport += democracyCount * 12
  demSupport += ethicsCount * 8
  demSupport += progressiveCount * 10

  repSupport += unknownCount * 2

  /*
    Activism amplifies ideological signal.
  */
  if (activism >= 100) {
    demSupport += 8
  } else if (activism >= 70) {
    demSupport += 5
  } else if (activism >= 40) {
    demSupport += 2
  }

  /*
    Signature breadth reduces pure uncertainty.
  */
  if (signatures >= 3) {
    repSupport -= 4
  } else if (signatures >= 2) {
    repSupport -= 2
  }

  demSupport = clamp(demSupport, 0, 100)
  repSupport = clamp(repSupport, 0, 100)

  /*
    Persuasion highest when close.
    100 = highly persuadable
    0 = strongly locked in either way
  */
  const gap = Math.abs(demSupport - repSupport)
  const persuasion = clamp(100 - gap * 2, 0, 100)

  return {
    voter_id: civic.voter_id,
    initiative_signatures: signatures,
    activism_score: activism,
    dem_support_score: demSupport,
    rep_support_score: repSupport,
    persuasion_score: persuasion,
    model_version: MODEL_VERSION,
    updated_at: new Date().toISOString()
  }
}

/*
=========================================================
Store Model
=========================================================
*/

async function upsertModelRows(rows: any[]) {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH)

    const { error } = await supabase
      .from("voter_party_model")
      .upsert(batch, { onConflict: "voter_id" })

    if (error) {
      console.error("Batch upsert error:", error)
      throw error
    }

    if ((i / UPSERT_BATCH) % 10 === 0) {
      console.log(`Upserted ${i + batch.length} voter model rows`)
    }
  }
}

/*
=========================================================
Run Builder
=========================================================
*/

async function run() {
  console.log("")
  console.log("======================================")
  console.log("Building Arkansas Voter Party Model")
  console.log("======================================")

  const [civicRows, signatureRows, initiativeRows] = await Promise.all([
    fetchCivicIndex(),
    fetchInitiativeSignatures(),
    fetchInitiatives()
  ])

  const initiativeMap = buildInitiativeMap(initiativeRows)
  const voterIssueSignals = buildVoterIssueSignals(signatureRows, initiativeMap)

  const modelRows = civicRows.map((civic) =>
    computeModelRow(civic, voterIssueSignals[civic.voter_id])
  )

  console.log(`Computed voter party model for ${modelRows.length} voters`)

  await upsertModelRows(modelRows)

  console.log("")
  console.log("======================================")
  console.log("Voter Party Model Complete")
  console.log("======================================")
}

run().catch((error) => {
  console.error("Fatal model build error:", error)
  process.exit(1)
})