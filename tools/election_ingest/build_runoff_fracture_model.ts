import fs from "fs"
import path from "path"
import XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"
import "dotenv/config"

/*
=========================================================
Runoff Fracture Model Builder
Arkansas Secretary of State 2026
County-Level Version
=========================================================

Why this version
----------------
The uploaded 2026 Preferential Primary statewide file is a
county-level CSV with these key headers:

• Contest ID
• Contest Name
• Location
• Candidate Name
• Candidate Votes

It is NOT precinct-level raw results, so this model computes
county fracture scores and stores them using:

precinct = "county_total"

This avoids relying on incomplete normalized contest tables
and lets the campaign model the race immediately.

=========================================================
*/

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FILE_PATH = path.join(
  process.cwd(),
  "data",
  "elections",
  "raw",
  "2026_Preferential_Primary_Statewide.csv"
)

const UPSERT_BATCH = 500
const MODEL_VERSION = "v2_county_csv"
const SYNTHETIC_PRECINCT = "county_total"

/*
=========================================================
Statewide baseline
=========================================================
*/

const STATE_BASELINE = {
  NORRIS: 34.3,
  HAMMER: 33.5,
  HARRISON: 32.1
}

/*
=========================================================
Types
=========================================================
*/

type RawRow = {
  "Contest ID"?: string
  "Contest Name"?: string
  "Location"?: string
  "Total Precincts"?: string | number
  "Precincts Reporting"?: string | number
  "Precincts Partially Reporting"?: string | number
  "Total Votes"?: string | number
  "Candidate ID"?: string
  "Candidate Name"?: string
  "Candidate Votes"?: string | number
  "Candidate Vote Percentage"?: string | number
}

type CountyAggregate = {
  county: string
  precinct: string
  norris: number
  hammer: number
  harrison: number
  totalVotesReported: number
  totalPrecincts: number
  precinctsReporting: number
  precinctsPartiallyReporting: number
}

type OutputRow = {
  county: string
  precinct: string
  norris_votes: number
  hammer_votes: number
  harrison_votes: number
  total_votes: number
  norris_share: number
  hammer_share: number
  harrison_share: number
  harrison_overperformance: number
  fracture_risk_score: number
  libertarian_leakage_score: number
  calm_middle_opportunity_score: number
  total_precincts: number
  precincts_reporting: number
  precincts_partially_reporting: number
  reporting_completeness_score: number
  model_version: string
  updated_at: string
}

/*
=========================================================
Helpers
=========================================================
*/

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v))
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim()
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .trim()

  if (!cleaned) return 0

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function isSOSContest(contestName: string): boolean {
  const name = normalizeText(contestName).toLowerCase()

  return (
    name.includes("secretary") &&
    name.includes("state")
  )
}

function classifyCandidate(candidateName: string): "norris" | "hammer" | "harrison" | null {
  const name = normalizeText(candidateName).toLowerCase()

  if (name.includes("norris")) return "norris"
  if (name.includes("hammer")) return "hammer"
  if (name.includes("harrison")) return "harrison"

  return null
}

/*
=========================================================
Load CSV through XLSX
=========================================================
*/

function loadCsvRows(): RawRow[] {
  if (!fs.existsSync(FILE_PATH)) {
    throw new Error(`CSV file not found: ${FILE_PATH}`)
  }

  const workbook = XLSX.readFile(FILE_PATH, {
    raw: false
  })

  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
    defval: ""
  })

  if (!rows.length) {
    throw new Error("No rows found in statewide CSV")
  }

  return rows
}

/*
=========================================================
Aggregate county results from statewide CSV
=========================================================
*/

function aggregateCountyResults(rows: RawRow[]): CountyAggregate[] {
  const map: Record<string, CountyAggregate> = {}

  for (const row of rows) {
    const contestName = normalizeText(row["Contest Name"])

    if (!isSOSContest(contestName)) {
      continue
    }

    const county = normalizeText(row["Location"])
    if (!county) continue

    const candidateBucket = classifyCandidate(
      normalizeText(row["Candidate Name"])
    )

    if (!candidateBucket) {
      continue
    }

    if (!map[county]) {
      map[county] = {
        county,
        precinct: SYNTHETIC_PRECINCT,
        norris: 0,
        hammer: 0,
        harrison: 0,
        totalVotesReported: parseNumber(row["Total Votes"]),
        totalPrecincts: parseNumber(row["Total Precincts"]),
        precinctsReporting: parseNumber(row["Precincts Reporting"]),
        precinctsPartiallyReporting: parseNumber(row["Precincts Partially Reporting"])
      }
    }

    map[county][candidateBucket] += parseNumber(row["Candidate Votes"])

    /*
      Refresh these in case repeated rows differ or first row was blank.
    */
    map[county].totalVotesReported = Math.max(
      map[county].totalVotesReported,
      parseNumber(row["Total Votes"])
    )

    map[county].totalPrecincts = Math.max(
      map[county].totalPrecincts,
      parseNumber(row["Total Precincts"])
    )

    map[county].precinctsReporting = Math.max(
      map[county].precinctsReporting,
      parseNumber(row["Precincts Reporting"])
    )

    map[county].precinctsPartiallyReporting = Math.max(
      map[county].precinctsPartiallyReporting,
      parseNumber(row["Precincts Partially Reporting"])
    )
  }

  return Object.values(map)
}

/*
=========================================================
Compute fracture metrics
=========================================================
*/

function computeMetrics(row: CountyAggregate): OutputRow | null {
  const total = row.norris + row.hammer + row.harrison

  if (total <= 0) return null

  const nShare = (row.norris / total) * 100
  const hShare = (row.hammer / total) * 100
  const haShare = (row.harrison / total) * 100

  const harrisonOverperf = haShare - STATE_BASELINE.HARRISON
  const topGap = Math.abs(nShare - hShare)

  let fractureRisk = 0

  if (harrisonOverperf > 8) fractureRisk += 50
  else if (harrisonOverperf > 5) fractureRisk += 40
  else if (harrisonOverperf > 2) fractureRisk += 25

  if (topGap < 2) fractureRisk += 35
  else if (topGap < 3) fractureRisk += 30
  else if (topGap < 6) fractureRisk += 15

  /*
    Extra risk if Harrison is simply very strong.
  */
  if (haShare >= 38) fractureRisk += 15
  else if (haShare >= 35) fractureRisk += 10

  fractureRisk = clamp(fractureRisk)

  let libertarianLeakage = 0
  libertarianLeakage += harrisonOverperf * 4

  if (haShare > 35) libertarianLeakage += 20
  if (fractureRisk > 60) libertarianLeakage += 10

  libertarianLeakage = clamp(libertarianLeakage)

  let calmMiddle = 0

  if (fractureRisk > 50) calmMiddle += 40
  if (topGap < 5) calmMiddle += 20
  if (haShare > 30) calmMiddle += 15

  /*
    Kelly benefits when the runoff is ugly and the anti-top-two lane is real.
  */
  if (haShare >= 35) calmMiddle += 10

  calmMiddle = clamp(calmMiddle)

  const totalReportingUnits =
    row.totalPrecincts > 0 ? row.totalPrecincts : 0

  const countedReportingUnits =
    row.precinctsReporting + row.precinctsPartiallyReporting

  const reportingCompleteness =
    totalReportingUnits > 0
      ? (countedReportingUnits / totalReportingUnits) * 100
      : 100

  return {
    county: row.county,
    precinct: row.precinct,

    norris_votes: row.norris,
    hammer_votes: row.hammer,
    harrison_votes: row.harrison,
    total_votes: total,

    norris_share: nShare,
    hammer_share: hShare,
    harrison_share: haShare,

    harrison_overperformance: harrisonOverperf,

    fracture_risk_score: fractureRisk,
    libertarian_leakage_score: libertarianLeakage,
    calm_middle_opportunity_score: calmMiddle,

    total_precincts: row.totalPrecincts,
    precincts_reporting: row.precinctsReporting,
    precincts_partially_reporting: row.precinctsPartiallyReporting,
    reporting_completeness_score: clamp(reportingCompleteness),

    model_version: MODEL_VERSION,
    updated_at: new Date().toISOString()
  }
}

/*
=========================================================
Store results
=========================================================
*/

async function clearCurrentModelVersion() {
  const { error } = await supabase
    .from("runoff_fracture_index")
    .delete()
    .eq("model_version", MODEL_VERSION)

  if (error) {
    console.error("Failed clearing previous model rows:", error)
    throw error
  }
}

async function storeRows(rows: OutputRow[]) {
  await clearCurrentModelVersion()

  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH)

    const { error } = await supabase
      .from("runoff_fracture_index")
      .insert(batch)

    if (error) {
      console.error("Insert error:", error)
      throw error
    }

    console.log(`Inserted ${i + batch.length} rows`)
  }
}

/*
=========================================================
Run model
=========================================================
*/

async function run() {
  console.log("")
  console.log("======================================")
  console.log("Runoff Fracture Model")
  console.log("======================================")
  console.log(`Source file: ${FILE_PATH}`)

  const rawRows = loadCsvRows()
  console.log(`Loaded ${rawRows.length} CSV rows`)

  const countyRows = aggregateCountyResults(rawRows)
  console.log(`Aggregated ${countyRows.length} counties`)

  const results = countyRows
    .map(computeMetrics)
    .filter((row): row is OutputRow => row !== null)

  console.log(`Computed ${results.length} county fracture scores`)

  await storeRows(results)

  console.log("")
  console.log("======================================")
  console.log("Runoff Fracture Model Complete")
  console.log("======================================")
}

run().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})