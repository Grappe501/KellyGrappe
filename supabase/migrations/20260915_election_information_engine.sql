-- Arkansas Election Information Engine
-- Source-of-truth schema for election infrastructure.
-- Public election data and private campaign polling operations are intentionally separated.

create table if not exists public.elections (
  id text primary key,
  name text not null,
  election_date date not null,
  early_voting_start date,
  early_voting_end date,
  status text not null default 'published' check (status in ('draft','published','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.polling_locations (
  id text primary key,
  election_id text not null references public.elections(id) on delete cascade,
  county text not null,
  name text not null,
  address text not null,
  city text not null,
  zip text,
  location_type text not null check (location_type in ('early_voting','election_day','vote_center')),
  hours text,
  early_voting_dates jsonb not null default '[]'::jsonb,
  latitude numeric,
  longitude numeric,
  accessibility_status text not null default 'unknown' check (accessibility_status in ('unknown','verified')),
  official_source_url text not null,
  source_verified_at date,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','changed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists polling_locations_election_county_idx on public.polling_locations(election_id, county);
create index if not exists polling_locations_verification_idx on public.polling_locations(verification_status);

create table if not exists public.polling_location_leads (
  id uuid primary key default gen_random_uuid(),
  polling_location_id text not null references public.polling_locations(id) on delete cascade,
  person_id uuid,
  lead_status text not null default 'No Lead' check (lead_status in ('No Lead','Lead Pending','Lead Assigned','Confirmed','Needs Attention')),
  assigned_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (polling_location_id)
);

create table if not exists public.polling_lead_intake (
  id uuid primary key default gen_random_uuid(),
  polling_location_id text references public.polling_locations(id) on delete set null,
  county text,
  submitted_name text not null,
  submitted_email text,
  submitted_phone text,
  preferred_location text,
  availability text,
  notes text,
  status text not null default 'Submitted' check (status in ('Submitted','Under Review','Contacted','Approved','Needs Follow-up','Declined','Withdrawn')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

alter table public.elections enable row level security;
alter table public.polling_locations enable row level security;
alter table public.polling_location_leads enable row level security;
alter table public.polling_lead_intake enable row level security;

-- Public voter-information data is safe to expose only when the election/location is published.
drop policy if exists elections_public_read on public.elections;
create policy elections_public_read on public.elections for select using (status = 'published');

drop policy if exists polling_locations_public_read on public.polling_locations;
create policy polling_locations_public_read on public.polling_locations for select using (
  verification_status = 'verified'
  and exists (select 1 from public.elections e where e.id = election_id and e.status = 'published')
);

-- Private campaign tables deliberately have no public policies. Existing authenticated/admin
-- authorization should be added through the campaign's established identity/RLS layer.
