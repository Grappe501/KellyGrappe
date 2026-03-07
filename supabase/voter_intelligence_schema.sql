
create table if not exists voter_registrants_raw (voter_id text, raw jsonb);
create table if not exists voter_vote_history_raw (voter_id text, raw jsonb);
create table if not exists voters (
 voter_id text primary key,
 county text,
 first_name text,
 last_name text,
 precinct_code text,
 congressional_district text,
 state_house_district text,
 state_senate_district text,
 date_last_voted date,
 raw_attributes jsonb
);
create table if not exists voter_vote_history (
 voter_id text,
 election_year int,
 election_type text,
 party_voted text,
 vote_method text
);
create table if not exists voter_scores (
 voter_id text,
 turnout_score numeric,
 persuasion_score numeric
);
create table if not exists contact_voter_matches (
 contact_id uuid,
 voter_id text,
 match_method text,
 confidence numeric
);
create index if not exists voters_precinct_idx on voters(precinct_code);
create index if not exists voters_cd_idx on voters(congressional_district);
