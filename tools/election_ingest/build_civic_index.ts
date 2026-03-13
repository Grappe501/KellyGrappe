import { createClient } from "@supabase/supabase-js"
import "dotenv/config"

/*
=========================================================
Civic Engagement Index Builder (Production Version)
=========================================================

Builds a statewide civic engagement model from voter signals.

Current Signals:
• ballot initiative signatures

Future Signals:
• election turnout
• campaign contacts
• volunteer activity
• donation history

Features:
• Handles unlimited records (pagination)
• Aggregates signatures efficiently
• Batch database writes
• Progress reporting
• Idempotent upserts

=========================================================
*/

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PAGE_SIZE = 1000
const UPSERT_BATCH = 500

/*
=========================================================
Fetch Signatures With Pagination
=========================================================
*/

async function fetchAllSignatures() {

  console.log("Fetching initiative signatures...")

  let from = 0
  let allRows: any[] = []

  while (true) {

    const { data, error } = await supabase
      .from("initiative_signatures")
      .select("voter_id")
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error("Signature fetch error:", error)
      throw error
    }

    if (!data || data.length === 0) break

    allRows = allRows.concat(data)

    console.log(`Fetched ${allRows.length} rows`)

    if (data.length < PAGE_SIZE) break

    from += PAGE_SIZE

  }

  console.log(`Total signatures fetched: ${allRows.length}`)

  return allRows

}

/*
=========================================================
Aggregate Signature Counts
=========================================================
*/

function aggregateSignatures(rows: any[]) {

  console.log("Aggregating signatures by voter...")

  const map: Record<string, number> = {}

  for (const row of rows) {

    const voterId = row.voter_id

    if (!voterId) continue

    if (!map[voterId]) map[voterId] = 0

    map[voterId]++

  }

  console.log(`Unique voters detected: ${Object.keys(map).length}`)

  return map

}

/*
=========================================================
Compute Civic Score
=========================================================
*/

function computeScore(signatureCount: number) {

  /*
  Current model

  1 signature = civic participant
  2 signatures = issue activist
  3+ signatures = movement activist

  This scoring will evolve once turnout
  and campaign interaction signals exist.
  */

  if (signatureCount >= 3) return 100
  if (signatureCount === 2) return 70
  if (signatureCount === 1) return 40

  return 0

}

/*
=========================================================
Build Civic Index Rows
=========================================================
*/

function buildIndexRows(map: Record<string, number>) {

  const rows: any[] = []

  for (const voterId of Object.keys(map)) {

    const signatures = map[voterId]

    const activismScore = computeScore(signatures)

    rows.push({

      voter_id: voterId,
      initiative_signatures: signatures,
      activism_score: activismScore

    })

  }

  console.log(`Computed civic index for ${rows.length} voters`)

  return rows

}

/*
=========================================================
Store Civic Index (Batch Upserts)
=========================================================
*/

async function storeIndex(rows: any[]) {

  console.log("Writing civic index to database...")

  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {

    const batch = rows.slice(i, i + UPSERT_BATCH)

    const { error } = await supabase
      .from("civic_engagement_index")
      .upsert(batch, { onConflict: "voter_id" })

    if (error) {
      console.error("Batch upsert error:", error)
    }

    if ((i / UPSERT_BATCH) % 10 === 0) {
      console.log(`Inserted ${i + batch.length} rows`)
    }

  }

  console.log("Database write complete")

}

/*
=========================================================
Main Builder
=========================================================
*/

async function run() {

  console.log("")
  console.log("======================================")
  console.log("Building Civic Engagement Index")
  console.log("======================================")

  const signatures = await fetchAllSignatures()

  const aggregated = aggregateSignatures(signatures)

  const rows = buildIndexRows(aggregated)

  await storeIndex(rows)

  console.log("")
  console.log("======================================")
  console.log("Civic Index Complete")
  console.log("======================================")

}

/*
=========================================================
Run
=========================================================
*/

run()