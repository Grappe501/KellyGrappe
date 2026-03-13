import { createClient } from "@supabase/supabase-js"
import "dotenv/config"

/*
=========================================================
Precinct / County Partisan Index Builder
=========================================================

Calculates baseline partisan lean and turnout reliability
from election results.

Output table:
precinct_partisan_index

=========================================================
*/

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ContestRow = {
  contest_name: string
  id: string
  election_id: string
}

type CandidateRow = {
  contest_id: string
  party: string
  votes: number
}

/*
=========================================================
Fetch All Contests
=========================================================
*/

async function fetchContests() {

  const { data, error } = await supabase
    .from("contests")
    .select("*")

  if (error) throw error

  return data as ContestRow[]
}

/*
=========================================================
Fetch Candidates
=========================================================
*/

async function fetchCandidates() {

  const { data, error } = await supabase
    .from("candidates")
    .select("*")

  if (error) throw error

  return data as CandidateRow[]
}

/*
=========================================================
Build Index
=========================================================
*/

async function buildIndex() {

  console.log("Building partisan index...")

  const contests = await fetchContests()
  const candidates = await fetchCandidates()

  const results: any[] = []

  for (const contest of contests) {

    const rows = candidates.filter(
      (c) => c.contest_id === contest.id
    )

    let demVotes = 0
    let repVotes = 0
    let total = 0

    for (const r of rows) {

      const party = r.party?.toLowerCase() || ""

      total += r.votes

      if (party.includes("dem")) demVotes += r.votes
      if (party.includes("rep")) repVotes += r.votes

    }

    if (!total) continue

    const demShare = demVotes / total
    const repShare = repVotes / total

    const pvi = (repShare - demShare) * 100

    results.push({
      contest_id: contest.id,
      dem_share: demShare,
      rep_share: repShare,
      pvi
    })

  }

  console.log(`Computed ${results.length} contest indices`)

  const { error } = await supabase
    .from("contest_partisan_index")
    .insert(results)

  if (error) throw error

  console.log("✓ Partisan index stored")

}

buildIndex()