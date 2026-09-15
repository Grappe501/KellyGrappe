export const GENERAL_ELECTION_2026 = {
  id: "arkansas-general-2026",
  name: "2026 General Election",
  date: "2026-11-03",
  earlyVotingStart: "2026-10-19",
  earlyVotingEnd: "2026-11-02",
  electionDayHours: "7:30 AM–7:30 PM",
  sourceName: "Arkansas Secretary of State",
  sourceUrl: "https://www.sos.arkansas.gov/elections/for-voters",
  voterviewUrl: "https://www.voterview.ar-nova.org/voterview/",
  resultsUrl: "https://www.sos.arkansas.gov/elections/research/election-results",
  status: "published" as const,
};

export const ARKANSAS_COUNTIES = [
  "Arkansas", "Ashley", "Baxter", "Benton", "Boone", "Bradley", "Carroll", "Chicot", "Clark", "Clay", "Cleburne", "Cleveland", "Columbia", "Conway", "Craighead", "Crawford", "Crittenden", "Cross", "Dallas", "Desha", "Drew", "Faulkner", "Franklin", "Fulton", "Garland", "Grant", "Greene", "Hempstead", "Hot Spring", "Howard", "Independence", "Izard", "Jackson", "Jefferson", "Johnson", "Lafayette", "Lawrence", "Lee", "Lincoln", "Little River", "Logan", "Lonoke", "Madison", "Marion", "Miller", "Mississippi", "Monroe", "Montgomery", "Nevada", "Newton", "Ouachita", "Perry", "Phillips", "Pike", "Poinsett", "Polk", "Pope", "Prairie", "Pulaski", "Randolph", "Saline", "Scott", "Searcy", "Sebastian", "Sevier", "Sharp", "St. Francis", "Stone", "Union", "Van Buren", "Washington", "White", "Woodruff", "Yell"
] as const;

export type PollingLocationType = "early_voting" | "election_day" | "vote_center";

export type PollingLocation = {
  id: string;
  electionId: string;
  county: string;
  name: string;
  address: string;
  city: string;
  zip?: string;
  type: PollingLocationType;
  earlyVotingDates?: string[];
  hours?: string;
  latitude?: number;
  longitude?: number;
  accessibility?: "unknown" | "verified";
  officialSourceUrl: string;
  sourceVerifiedAt?: string;
  verificationStatus: "pending" | "verified" | "changed";
};

// Official location records are intentionally loaded separately from the UI.
// This prevents the application from treating campaign-authored location data as official election data.
export const POLLING_LOCATIONS: PollingLocation[] = [];

export const OFFICIAL_ELECTION_LINKS = [
  { label: "Arkansas VoterView", url: GENERAL_ELECTION_2026.voterviewUrl },
  { label: "Secretary of State — For Voters", url: GENERAL_ELECTION_2026.sourceUrl },
  { label: "Secretary of State — Election Results", url: GENERAL_ELECTION_2026.resultsUrl },
  { label: "State Board of Election Commissioners", url: "https://sbec.arkansas.gov/election-information/" },
];
