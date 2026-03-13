import fs from "fs"
import path from "path"
import process from "process"
import { createClient } from "@supabase/supabase-js"
import "dotenv/config"

/*
=========================================================
Election Ingest Engine (Upgraded)
=========================================================

Handles multiple JSON formats and safely imports
Arkansas election history into Supabase.

Supported structures:

Normalized format
{
  election:{},
  county_turnout:[],
  contests:[]
}

Legacy format
{
  ElectionInfo:{},
  Turnout:{},
  ContestData:[]
}

=========================================================
*/

const RAW_DATA_PATH = path.join(
  process.cwd(),
  "data",
  "elections",
  "raw"
)

/*
=========================================================
Supabase
=========================================================
*/

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/*
=========================================================
Types
=========================================================
*/

type ElectionMeta = {
  external_id?: number
  name: string
  year: number
  election_date: string
}

type CountyTurnout = {
  county: string
  ballots_cast: number
  registered_voters: number
  turnout_percent: number
}

type Candidate = {
  candidate_name: string
  party?: string
  votes: number
}

type Contest = {
  contest_name: string
  total_votes: number
  candidates: Candidate[]
}

/*
=========================================================
Utilities
=========================================================
*/

function listJsonFiles(dir: string): string[] {

  if (!fs.existsSync(dir)) return []

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dir, f))

}

function extractYear(date: string): number {

  return Number(date?.substring(0, 4))

}

/*
=========================================================
JSON Normalization
=========================================================
*/

function normalizeElection(json: any): ElectionMeta | null {

  if (json.election) {

    return {
      external_id: json.election.external_id,
      name: json.election.name,
      year: json.election.year || extractYear(json.election.election_date),
      election_date: json.election.election_date
    }

  }

  if (json.ElectionInfo) {

    return {
      external_id: json.ElectionInfo.ElectionID,
      name: json.ElectionInfo.ElectionName,
      year: extractYear(json.ElectionInfo.ElectionDate),
      election_date: json.ElectionInfo.ElectionDate
    }

  }

  return null

}

function normalizeTurnout(json: any): CountyTurnout[] {

  if (json.county_turnout) return json.county_turnout

  if (json.Turnout?.CountyTurnout) {

    return json.Turnout.CountyTurnout.map((c: any) => ({
      county: c.CountyName,
      ballots_cast: c.VotesCast,
      registered_voters: c.RegisteredVoters,
      turnout_percent: c.VotePercent
    }))

  }

  return []

}

function normalizeContests(json: any): Contest[] {

  if (json.contests) return json.contests

  if (json.ContestData) {

    return json.ContestData.map((c: any) => ({

      contest_name: c.ContestName,
      total_votes: c.TotalVotes,

      candidates: c.Candidates.map((cand: any) => ({

        candidate_name: cand.Name,
        party: cand.PartyName,
        votes: cand.TotalVotes

      }))

    }))

  }

  return []

}

/*
=========================================================
Database
=========================================================
*/

async function ensureElection(meta: ElectionMeta) {

  const { data: existing } = await supabase
    .from("elections")
    .select("id")
    .eq("name", meta.name)
    .single()

  if (existing) {

    console.log(`✓ Election already exists: ${meta.name}`)
    return existing.id

  }

  const { data, error } = await supabase
    .from("elections")
    .insert(meta)
    .select()
    .single()

  if (error) throw error

  console.log(`✓ Inserted election: ${meta.name}`)

  return data.id

}

async function insertCountyTurnout(
  electionId: string,
  turnout: CountyTurnout[]
) {

  if (!turnout.length) return

  const rows = turnout.map((c) => ({
    election_id: electionId,
    county: c.county,
    ballots_cast: c.ballots_cast,
    registered_voters: c.registered_voters,
    turnout_percent: c.turnout_percent
  }))

  await supabase.from("county_turnout").insert(rows)

  console.log("✓ County turnout inserted")

}

async function insertContests(
  electionId: string,
  contests: Contest[]
) {

  for (const contest of contests) {

    const { data: contestRow, error } = await supabase
      .from("contests")
      .insert({
        election_id: electionId,
        contest_name: contest.contest_name,
        total_votes: contest.total_votes
      })
      .select()
      .single()

    if (error) {
      console.error("Contest insert error:", error)
      continue
    }

    const contestId = contestRow.id

    const candidateRows = contest.candidates.map((cand) => ({
      contest_id: contestId,
      candidate_name: cand.candidate_name,
      party: cand.party,
      votes: cand.votes
    }))

    await supabase.from("candidates").insert(candidateRows)

  }

  console.log("✓ Contests + candidates inserted")

}

/*
=========================================================
File Processor
=========================================================
*/

async function processFile(filePath: string) {

  console.log("")
  console.log("Processing:", filePath)

  try {

    const raw = fs.readFileSync(filePath, "utf8")
    const json = JSON.parse(raw)

    const election = normalizeElection(json)

    if (!election) {
      console.warn("No election metadata, skipping file")
      return
    }

    const turnout = normalizeTurnout(json)
    const contests = normalizeContests(json)

    const electionId = await ensureElection(election)

    await insertCountyTurnout(electionId, turnout)

    await insertContests(electionId, contests)

  } catch (err) {

    console.error("File failed:", filePath)
    console.error(err)

  }

}

/*
=========================================================
Main Import
=========================================================
*/

async function runImport() {

  console.log("")
  console.log("======================================")
  console.log("Election Ingest Starting")
  console.log("======================================")

  const files = listJsonFiles(RAW_DATA_PATH)

  if (!files.length) {
    console.log("No election files found")
    return
  }

  console.log(`Found ${files.length} election files`)

  for (const file of files) {
    await processFile(file)
  }

  console.log("")
  console.log("======================================")
  console.log("Election Ingest Complete")
  console.log("======================================")

}

/*
=========================================================
Run
=========================================================
*/

runImport()