import { createClient } from "@supabase/supabase-js"
import "dotenv/config"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {

  console.log("")
  console.log("======================================")
  console.log("Universal Geographic Target Engine v1")
  console.log("======================================")

  const { data: geographies } = await supabase
    .from("runoff_fracture_index")
    .select("*")

  if (!geographies) throw new Error("No fracture data")

  const results: any[] = []

  for (const row of geographies) {

    const primaryVotes = row.total_votes

    /*
    Estimate general turnout
    */

    const estimatedGeneralTurnout =
      Math.round(primaryVotes * 2.1)

    /*
    Persuasion target
    */

    const persuasionTarget =
      Math.round(
        primaryVotes *
        (row.fracture_risk_score / 100) *
        0.25
      )

    /*
    Turnout target
    */

    const turnoutTarget =
      Math.round(
        primaryVotes *
        (row.calm_middle_opportunity_score / 100) *
        0.20
      )

    /*
    Contact target
    */

    const contactTarget =
      persuasionTarget +
      turnoutTarget

    /*
    Strategic priority score
    */

    const priorityScore =
      (row.fracture_risk_score * 0.5) +
      (row.libertarian_leakage_score * 0.3) +
      (row.calm_middle_opportunity_score * 0.2)

    results.push({

      geography_id: row.county,
      geography_name: row.county,
      geography_type: "county",

      total_primary_votes: primaryVotes,

      estimated_general_turnout: estimatedGeneralTurnout,

      persuasion_target: persuasionTarget,

      turnout_target: turnoutTarget,

      contact_target: contactTarget,

      strategic_priority_score: priorityScore

    })
  }

  results.sort(
    (a,b)=>b.strategic_priority_score-a.strategic_priority_score
  )

  results.forEach((r,i)=>{
    r.priority_rank = i+1
  })

  const { error } = await supabase
    .from("geographic_targets")
    .upsert(results)

  if (error) throw error

  console.log(`Inserted ${results.length} geographic targets`)
}

run()