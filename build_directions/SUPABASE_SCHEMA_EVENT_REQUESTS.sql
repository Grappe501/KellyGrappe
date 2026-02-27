-- Enable required extension
create extension if not exists "pgcrypto";

-- ===============================
-- Event Requests
-- ===============================

create table if not exists public.event_requests (
  id uuid primary key default gen_random_uuid(),

  -- Core contact info (indexed for lookup)
  contact_name text,
  contact_email text,
  contact_phone text,

  organization text,

  event_title text not null,
  event_type text,
  event_description text,

  start_time timestamptz,
  end_time timestamptz,
  timezone text default 'America/Chicago',

  venue_name text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,

  requested_role text,
  expected_attendance text,
  media_expected text,

  status text default 'PENDING_REVIEW',

  -- Calendar tracking
  calendar_event_id text,
  hold_event_id text,
  travel_block_ids text[],

  -- AI
  ai_priority_score numeric,
  ai_notes jsonb,

  -- Security / telemetry
  ip_hash text,
  visitor_id text,
  user_agent text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_event_requests_email
  on public.event_requests (contact_email);

create index if not exists idx_event_requests_status
  on public.event_requests (status);

create index if not exists idx_event_requests_start_time
  on public.event_requests (start_time);

-- ===============================
-- Telemetry Events
-- ===============================

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text,
  ip_hash text,
  event_type text,
  path text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_telemetry_visitor
  on public.telemetry_events (visitor_id);

create index if not exists idx_telemetry_event_type
  on public.telemetry_events (event_type);