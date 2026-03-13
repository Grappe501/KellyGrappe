/**
 * relational.recommendation.engine.ts
 *
 * AI engine that recommends people, organizations,
 * and civic opportunities based on relational signals.
 */

import { supabase } from "@shared/lib/supabase"

export type Recommendation = {
  type: "person" | "organization" | "event"
  id: string
  score: number
  reason: string
}

type RecommendationContext = {
  userId: string
  city?: string
  state?: string
  interests?: string[]
}

/* -------------------------------------------------------------------------- */
/* MAIN ENGINE                                                                */
/* -------------------------------------------------------------------------- */

export async function getRelationalRecommendations(
  context: RecommendationContext
): Promise<Recommendation[]> {

  const recommendations: Recommendation[] = []

  const interestMatches = await matchByInterest(context)
  const geographicMatches = await matchByGeography(context)
  const organizerMatches = await matchByOrganizerNetwork(context)

  recommendations.push(...interestMatches)
  recommendations.push(...geographicMatches)
  recommendations.push(...organizerMatches)

  return sortRecommendations(recommendations)

}

/* -------------------------------------------------------------------------- */
/* MATCH BY CIVIC INTERESTS                                                   */
/* -------------------------------------------------------------------------- */

async function matchByInterest(
  context: RecommendationContext
): Promise<Recommendation[]> {

  if (!context.interests?.length) return []

  const { data, error } = await supabase
    .from("civic_interests")
    .select("user_id, interest_tag")
    .in("interest_tag", context.interests)

  if (error || !data) return []

  return data.map((row: any) => ({
    type: "person",
    id: row.user_id,
    score: 0.6,
    reason: "Shared civic interests"
  }))

}

/* -------------------------------------------------------------------------- */
/* MATCH BY GEOGRAPHY                                                         */
/* -------------------------------------------------------------------------- */

async function matchByGeography(
  context: RecommendationContext
): Promise<Recommendation[]> {

  if (!context.city || !context.state) return []

  const { data, error } = await supabase
    .from("civic_profiles")
    .select("user_id")
    .eq("city", context.city)
    .eq("state", context.state)
    .limit(20)

  if (error || !data) return []

  return data.map((row: any) => ({
    type: "person",
    id: row.user_id,
    score: 0.8,
    reason: "Nearby community member"
  }))

}

/* -------------------------------------------------------------------------- */
/* MATCH BY ORGANIZER NETWORK                                                 */
/* -------------------------------------------------------------------------- */

async function matchByOrganizerNetwork(
  context: RecommendationContext
): Promise<Recommendation[]> {

  const { data, error } = await supabase
    .from("organizer_tree")
    .select("user_id, leader_id")
    .eq("leader_id", context.userId)

  if (error || !data) return []

  return data.map((row: any) => ({
    type: "person",
    id: row.user_id,
    score: 0.9,
    reason: "Organizer network connection"
  }))

}

/* -------------------------------------------------------------------------- */
/* SORTING                                                                    */
/* -------------------------------------------------------------------------- */

function sortRecommendations(
  recs: Recommendation[]
): Recommendation[] {

  return recs.sort((a, b) => b.score - a.score)

}
