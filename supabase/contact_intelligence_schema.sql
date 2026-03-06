-- Contact intelligence + statewide voter architecture

alter table if exists contacts
  add column if not exists precinct text,
  add column if not exists congressional_district text,
  add column if not exists state_house_district text,
  add column if not exists state_senate_district text,
  add column if not exists voter_file_id text,
  add column if not exists permission_to_contact boolean default true,
  add column if not exists organization text,
  add column if not exists role_potential text[],
  add column if not exists team_assignments text[],
  add column if not exists ballot_initiatives text[],
  add column if not exists ballot_initiative_count integer default 0,
  add column if not exists voting_history_2018 boolean,
  add column if not exists voting_history_2020 boolean,
  add column if not exists voting_history_2022 boolean,
  add column if not exists turnout_score numeric,
  add column if not exists persuasion_score numeric,
  add column if not exists demographic_score numeric,
  add column if not exists organizer_score numeric,
  add column if not exists government_leader_roles text[];

create table if not exists voters (
  voter_id text primary key,
  first_name text,
  last_name text,
  county text,
  precinct text,
  congressional_district text,
  state_house_district text,
  state_senate_district text,
  voting_history_2018 boolean,
  voting_history_2020 boolean,
  voting_history_2022 boolean,
  turnout_score numeric,
  persuasion_score numeric,
  attributes jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists contact_voter_matches (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  voter_id text references voters(voter_id) on delete cascade,
  match_method text,
  confidence numeric,
  created_at timestamp with time zone default now()
);

create table if not exists voter_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  source_type text,
  row_count integer,
  notes text,
  created_at timestamp with time zone default now()
);

create index if not exists voters_precinct_idx on voters(precinct);
create index if not exists voters_county_idx on voters(county);
create index if not exists voters_cd_idx on voters(congressional_district);
create index if not exists voters_house_idx on voters(state_house_district);
create index if not exists voters_senate_idx on voters(state_senate_district);
create index if not exists voters_turnout_idx on voters(turnout_score);
create index if not exists voters_persuasion_idx on voters(persuasion_score);

-- optional helper after voter load
update voters
set turnout_score = (
  (case when voting_history_2022 is true then 0.5 else 0 end) +
  (case when voting_history_2020 is true then 0.3 else 0 end) +
  (case when voting_history_2018 is true then 0.2 else 0 end)
)
where turnout_score is null;

update voters
set persuasion_score = (1 - turnout_score)
where persuasion_score is null and turnout_score is not null;
