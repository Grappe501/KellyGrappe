import { supabase } from "../supabase"

export async function getVoterStats() {

  const { count: voters } = await supabase
    .from("voters")
    .select("*", { count: "exact", head: true })

  const { count: matched } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .not("voter_id", "is", null)

  const { count: precincts } = await supabase
    .from("voters")
    .select("precinct", { count: "exact", head: true })

  return {
    voters,
    matched,
    precincts
  }
}