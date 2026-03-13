-- ============================================================
-- TRAINING LEARNING RECORD STORE
-- CivicOS / Platform Training Engine
-- ============================================================

-- ------------------------------------------------------------
-- COURSES
-- ------------------------------------------------------------

create table if not exists training_courses (

  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text,

  circle text,
  difficulty_level text,

  estimated_duration_minutes integer,

  status text default 'active',

  created_at timestamptz default now(),
  updated_at timestamptz default now()

);


-- ------------------------------------------------------------
-- MODULES
-- ------------------------------------------------------------

create table if not exists training_modules (

  id uuid primary key default gen_random_uuid(),

  course_id uuid references training_courses(id) on delete cascade,

  title text not null,
  description text,

  module_order integer,

  content_type text,

  content_url text,

  estimated_minutes integer,

  created_at timestamptz default now(),
  updated_at timestamptz default now()

);


-- ------------------------------------------------------------
-- LEARNING PATHS
-- ------------------------------------------------------------

create table if not exists training_paths (

  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text,

  system_mode text,

  role text,
  difficulty_level text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()

);


-- ------------------------------------------------------------
-- PATH MODULES
-- ------------------------------------------------------------

create table if not exists training_path_modules (

  id uuid primary key default gen_random_uuid(),

  path_id uuid references training_paths(id) on delete cascade,
  module_id uuid references training_modules(id) on delete cascade,

  sequence integer,
  required boolean default true,

  created_at timestamptz default now()

);


-- ------------------------------------------------------------
-- USER ENROLLMENTS
-- ------------------------------------------------------------

create table if not exists training_enrollments (

  id uuid primary key default gen_random_uuid(),

  user_id uuid,

  path_id uuid references training_paths(id),

  status text default 'enrolled',

  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz default now()

);


-- ------------------------------------------------------------
-- MODULE PROGRESS
-- ------------------------------------------------------------

create table if not exists training_progress (

  id uuid primary key default gen_random_uuid(),

  user_id uuid,

  module_id uuid references training_modules(id),

  status text default 'not_started',

  progress_percent integer default 0,

  last_activity_at timestamptz,

  completed_at timestamptz,

  created_at timestamptz default now()

);


-- ------------------------------------------------------------
-- CERTIFICATIONS
-- ------------------------------------------------------------

create table if not exists training_certifications (

  id uuid primary key default gen_random_uuid(),

  user_id uuid,

  path_id uuid references training_paths(id),

  certificate_number text,

  issued_at timestamptz,
  expires_at timestamptz,

  created_at timestamptz default now()

);


-- ------------------------------------------------------------
-- TRAINING EVENTS (Learning Record Store)
-- ------------------------------------------------------------

create table if not exists training_events (

  id uuid primary key default gen_random_uuid(),

  user_id uuid,

  module_id uuid references training_modules(id),

  event_type text,

  event_data jsonb,

  created_at timestamptz default now()

);


-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index if not exists idx_training_progress_user
on training_progress(user_id);

create index if not exists idx_training_events_user
on training_events(user_id);

create index if not exists idx_training_modules_course
on training_modules(course_id);

create index if not exists idx_training_path_modules_path
on training_path_modules(path_id);
