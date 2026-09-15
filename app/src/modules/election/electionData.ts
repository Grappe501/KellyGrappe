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

export const ARKANSAS_COUNTIES = ["Arkansas", "Ashley", "Baxter", "Benton", "Boone", "Bradley", "Carroll", "Chicot", "Clark", "Clay", "Cleburne", "Cleveland", "Columbia", "Conway", "Craighead", "Crawford", "Crittenden", "Cross", "Dallas", "Desha", "Drew", "Faulkner", "Franklin", "Fulton", "Garland", "Grant", "Greene", "Hempstead", "Hot Spring", "Howard", "Independence", "Izard", "Jackson", "Jefferson", "Johnson", "Lafayette", "Lawrence", "Lee", "Lincoln", "Little River", "Logan", "Lonoke", "Madison", "Marion", "Miller", "Mississippi", "Monroe", "Montgomery", "Nevada", "Newton", "Ouachita", "Perry", "Phillips", "Pike", "Poinsett", "Polk", "Pope", "Prairie", "Pulaski", "Randolph", "Saline", "Scott", "Searcy", "Sebastian", "Sevier", "Sharp", "St. Francis", "Stone", "Union", "Van Buren", "Washington", "White", "Woodruff", "Yell"] as const;

export type PollingLocationType = "early_voting" | "election_day" | "vote_center";
export type VerificationStatus = "pending" | "verified" | "changed";

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
  verificationStatus: VerificationStatus;
};

// Only locations published by an authoritative election source are placed here.
export const POLLING_LOCATIONS: PollingLocation[] = [
  {
    id: "arkansas-general-2026-logan-early-paris-oem",
    electionId: GENERAL_ELECTION_2026.id,
    county: "Logan",
    name: "Logan County Office of Emergency Management",
    address: "205 E. Maple",
    city: "Paris",
    zip: "72855",
    type: "early_voting",
    earlyVotingDates: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-02"],
    hours: "Mon–Fri 8:00 AM–6:00 PM; Sat 10:00 AM–4:00 PM; Nov. 2 8:00 AM–5:00 PM",
    officialSourceUrl: "https://www.logancoarcbec.gov/calendar/early-voting",
    sourceVerifiedAt: "2026-09-15",
    verificationStatus: "verified",
  },
  {
    id: "arkansas-general-2026-logan-early-booneville",
    electionId: GENERAL_ELECTION_2026.id,
    county: "Logan",
    name: "Jeral Hampton Meeting Place",
    address: "114 W. Main",
    city: "Booneville",
    zip: "72927",
    type: "early_voting",
    earlyVotingDates: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-02"],
    hours: "Mon–Fri 8:00 AM–6:00 PM; Sat 10:00 AM–4:00 PM; Nov. 2 8:00 AM–5:00 PM",
    officialSourceUrl: "https://www.logancoarcbec.gov/calendar/early-voting",
    sourceVerifiedAt: "2026-09-15",
    verificationStatus: "verified",
  },
];

export const COUNTY_DATA_STATUS: Record<string, "published" | "pending"> = Object.fromEntries(
  ARKANSAS_COUNTIES.map((county) => [county, POLLING_LOCATIONS.some((location) => location.county === county) ? "published" : "pending"]),
);

export const OFFICIAL_ELECTION_LINKS = [
  { label: "Arkansas VoterView", url: GENERAL_ELECTION_2026.voterviewUrl },
  { label: "Secretary of State — For Voters", url: GENERAL_ELECTION_2026.sourceUrl },
  { label: "Secretary of State — Election Results", url: GENERAL_ELECTION_2026.resultsUrl },
  { label: "State Board of Election Commissioners", url: "https://sbec.arkansas.gov/election-information/" },
];
