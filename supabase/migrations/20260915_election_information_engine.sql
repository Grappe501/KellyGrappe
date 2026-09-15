create table if not exists public.elections (id text primary key, name text not null, election_date date not null, early_voting_start date, early_voting_end date, status text not null default 'published' check (status in ('draft','published','closed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.polling_locations (id text primary key, election_id text not null references public.elections(id) on delete cascade, county text not null, name text not null, address text not null, city text not null, zip text, location_type text not null check (location_type in ('early_voting','election_day','vote_center')), hours text, early_voting_dates jsonb not null default '[]'::jsonb, latitude numeric, longitude numeric, accessibility_status text not null default 'unknown' check (accessibility_status in ('unknown','verified')), official_source_url text not null, source_verified_at date, verification_status text not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (verification_status in ('pending','verified','changed')));
create index if not exists polling_locations_election_county_idx on public.polling_locations(election_id, county);
create index if not exists polling_locations_verification_idx on public.polling_locations(verification_status);

create table if not exists public.election_county_sources (election_id text not null references public.elections(id) on delete cascade, county text not null, source_url text not null, source_status text not null default 'pending' check (source_status in ('pending','published','verified')), last_verified_at date, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (election_id, county));
create index if not exists election_county_sources_status_idx on public.election_county_sources(election_id, source_status);

create table if not exists public.polling_location_leads (id uuid primary key default gen_random_uuid(), polling_location_id text not null references public.polling_locations(id) on delete cascade, person_id uuid, lead_status text not null default 'No Lead' check (lead_status in ('No Lead','Lead Pending','Lead Assigned','Confirmed','Needs Attention')), assigned_at timestamptz, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (polling_location_id));
create table if not exists public.polling_lead_intake (id uuid primary key default gen_random_uuid(), polling_location_id text references public.polling_locations(id) on delete set null, county text, submitted_name text not null, submitted_email text, submitted_phone text, preferred_location text, availability text, notes text, status text not null default 'Submitted' check (status in ('Submitted','Under Review','Contacted','Approved','Needs Follow-up','Declined','Withdrawn')), submitted_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid);

insert into public.elections (id, name, election_date, early_voting_start, early_voting_end, status)
values ('arkansas-general-2026', '2026 General Election', '2026-11-03', '2026-10-19', '2026-11-02', 'published')
on conflict (id) do update set name = excluded.name, election_date = excluded.election_date, early_voting_start = excluded.early_voting_start, early_voting_end = excluded.early_voting_end, status = excluded.status, updated_at = now();

insert into public.polling_locations (id, election_id, county, name, address, city, zip, location_type, hours, early_voting_dates, official_source_url, source_verified_at, verification_status)
values
('arkansas-general-2026-logan-early-paris-oem', 'arkansas-general-2026', 'Logan', 'Logan County Office of Emergency Management', '205 E. Maple', 'Paris', '72855', 'early_voting', 'Mon–Fri 8:00 AM–6:00 PM; Sat 10:00 AM–4:00 PM; Nov. 2 8:00 AM–5:00 PM', '["2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24","2026-10-26","2026-10-27","2026-10-28","2026-10-29","2026-10-30","2026-10-31","2026-11-02"]'::jsonb, 'https://www.logancoarcbec.gov/calendar/early-voting', '2026-09-15', 'verified'),
('arkansas-general-2026-logan-early-booneville', 'arkansas-general-2026', 'Logan', 'Jeral Hampton Meeting Place', '114 W. Main', 'Booneville', '72927', 'early_voting', 'Mon–Fri 8:00 AM–6:00 PM; Sat 10:00 AM–4:00 PM; Nov. 2 8:00 AM–5:00 PM', '["2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24","2026-10-26","2026-10-27","2026-10-28","2026-10-29","2026-10-30","2026-10-31","2026-11-02"]'::jsonb, 'https://www.logancoarcbec.gov/calendar/early-voting', '2026-09-15', 'verified')
on conflict (id) do update set name = excluded.name, address = excluded.address, city = excluded.city, zip = excluded.zip, hours = excluded.hours, early_voting_dates = excluded.early_voting_dates, official_source_url = excluded.official_source_url, source_verified_at = excluded.source_verified_at, verification_status = excluded.verification_status, updated_at = now();

insert into public.election_county_sources (election_id, county, source_url, source_status, last_verified_at, notes)
select 'arkansas-general-2026', county, 'https://sbec.arkansas.gov/election-information/', case when county = 'Logan' then 'verified' else 'pending' end, case when county = 'Logan' then '2026-09-15'::date else null end, case when county = 'Logan' then 'Official county early-voting page harvested and verified.' else 'County-specific 2026 location publication not yet harvested; use the official county election commission and VoterView as authoritative until published.' end
from unnest(array['Arkansas','Ashley','Baxter','Benton','Boone','Bradley','Carroll','Chicot','Clark','Clay','Cleburne','Cleveland','Columbia','Conway','Craighead','Crawford','Crittenden','Cross','Dallas','Desha','Drew','Faulkner','Franklin','Fulton','Garland','Grant','Greene','Hempstead','Hot Spring','Howard','Independence','Izard','Jackson','Jefferson','Johnson','Lafayette','Lawrence','Lee','Lincoln','Little River','Logan','Lonoke','Madison','Marion','Miller','Mississippi','Monroe','Montgomery','Nevada','Newton','Ouachita','Perry','Phillips','Pike','Poinsett','Polk','Pope','Prairie','Pulaski','Randolph','Saline','Scott','Searcy','Sebastian','Sevier','Sharp','St. Francis','Stone','Union','Van Buren','Washington','White','Woodruff','Yell']) as counties(county)
on conflict (election_id, county) do update set source_url = excluded.source_url, source_status = excluded.source_status, last_verified_at = excluded.last_verified_at, notes = excluded.notes, updated_at = now();

alter table public.elections enable row level security;
alter table public.polling_locations enable row level security;
alter table public.election_county_sources enable row level security;
alter table public.polling_location_leads enable row level security;
alter table public.polling_lead_intake enable row level security;

drop policy if exists elections_public_read on public.elections;
create policy elections_public_read on public.elections for select using (status = 'published');
drop policy if exists polling_locations_public_read on public.polling_locations;
create policy polling_locations_public_read on public.polling_locations for select using (verification_status = 'verified' and exists (select 1 from public.elections e where e.id = election_id and e.status = 'published'));
drop policy if exists election_county_sources_public_read on public.election_county_sources;
create policy election_county_sources_public_read on public.election_county_sources for select using (exists (select 1 from public.elections e where e.id = election_id and e.status = 'published'));

-- Private campaign tables intentionally have no public policies. Bind them to the campaign's established authenticated/RLS authorization layer before production writes are enabled.
