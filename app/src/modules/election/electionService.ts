import { electionDatabaseConfigured, supabase } from "./supabaseClient";
import type { PollingLocation } from "./electionData";

export type ElectionCountySource = {
  county: string;
  sourceUrl: string;
  sourceStatus: "pending" | "published" | "verified";
  lastVerifiedAt: string | null;
};

function mapPollingLocation(row: Record<string, unknown>): PollingLocation {
  return {
    id: String(row.id),
    electionId: String(row.election_id),
    county: String(row.county),
    name: String(row.name),
    address: String(row.address),
    city: String(row.city),
    zip: row.zip ? String(row.zip) : undefined,
    type: row.location_type as PollingLocation["type"],
    earlyVotingDates: Array.isArray(row.early_voting_dates) ? row.early_voting_dates.map(String) : [],
    hours: row.hours ? String(row.hours) : undefined,
    latitude: typeof row.latitude === "number" ? row.latitude : undefined,
    longitude: typeof row.longitude === "number" ? row.longitude : undefined,
    accessibility: row.accessibility_status as PollingLocation["accessibility"],
    officialSourceUrl: String(row.official_source_url),
    sourceVerifiedAt: row.source_verified_at ? String(row.source_verified_at) : undefined,
    verificationStatus: row.verification_status as PollingLocation["verificationStatus"],
  };
}

export async function loadVerifiedPollingLocations(electionId: string): Promise<PollingLocation[]> {
  if (!supabase || !electionDatabaseConfigured) {
    throw new Error("Election database is not configured.");
  }

  const { data, error } = await supabase
    .from("polling_locations")
    .select("id,election_id,county,name,address,city,zip,location_type,hours,early_voting_dates,latitude,longitude,accessibility_status,official_source_url,source_verified_at,verification_status")
    .eq("election_id", electionId)
    .eq("verification_status", "verified")
    .order("county")
    .order("name");

  if (error) throw error;
  return (data ?? []).map(mapPollingLocation);
}

export async function loadCountySources(electionId: string): Promise<ElectionCountySource[]> {
  if (!supabase || !electionDatabaseConfigured) {
    throw new Error("Election database is not configured.");
  }

  const { data, error } = await supabase
    .from("election_county_sources")
    .select("county,source_url,source_status,last_verified_at")
    .eq("election_id", electionId)
    .order("county");

  if (error) throw error;
  return (data ?? []).map((row) => ({
    county: String(row.county),
    sourceUrl: String(row.source_url),
    sourceStatus: row.source_status as ElectionCountySource["sourceStatus"],
    lastVerifiedAt: row.last_verified_at ? String(row.last_verified_at) : null,
  }));
}
