-- Backspin Tournament V1 schema baseline
-- Source: BRD v1.0 + Data Model / ERD v0.1
create extension if not exists pgcrypto;

create table if not exists players (
  player_id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  email text,
  verification_status text not null default 'Unverified' check (verification_status in ('Verified','Unverified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists player_identities (
  player_identity_id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(player_id),
  line_user_id text not null unique,
  linked_at timestamptz not null default now()
);

create table if not exists tournaments (
  tournament_id uuid primary key default gen_random_uuid(),
  name text not null,
  description_th text,
  description_en text,
  venue text,
  registration_open_at timestamptz not null,
  registration_close_at timestamptz not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'Draft' check (status in ('Draft','Open','Closed','Completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists divisions (
  division_id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(tournament_id) on delete cascade,
  category text not null check (category in ('Men Singles','Women Singles','Men Doubles','Women Doubles','Mixed Doubles')),
  level numeric(2,1) not null check (level in (3.0,3.5,4.0,4.5)),
  fee numeric(10,2) not null check (fee >= 0),
  capacity integer not null check (capacity > 0),
  unique(tournament_id, category, level)
);

create table if not exists registrations (
  registration_id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(tournament_id),
  division_id uuid not null references divisions(division_id),
  main_player_id uuid not null references players(player_id),
  registration_status text not null default 'Pending Payment Verification',
  payment_status text not null default 'Pending Payment Verification',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists registration_partners (
  registration_partner_id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(registration_id) on delete cascade,
  player_id uuid references players(player_id),
  name text not null,
  phone text not null,
  email text,
  verification_status text not null default 'Unverified'
);

create table if not exists payment_submissions (
  payment_submission_id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(registration_id) on delete cascade,
  slip_reference text not null,
  uploaded_at timestamptz not null default now(),
  payment_status text not null,
  reject_reason text,
  verified_at timestamptz
);

create table if not exists waiting_list_entries (
  waiting_entry_id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(registration_id) on delete cascade,
  division_id uuid not null references divisions(division_id),
  queue_timestamp timestamptz not null default now(),
  state text not null default 'Queued',
  skip_reason text
);

create table if not exists waiting_list_offers (
  offer_id uuid primary key default gen_random_uuid(),
  waiting_entry_id uuid not null references waiting_list_entries(waiting_entry_id) on delete cascade,
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  response text,
  responded_at timestamptz
);

create table if not exists registration_timeline (
  timeline_id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(registration_id) on delete cascade,
  from_status text,
  to_status text,
  event text not null,
  actor_type text not null,
  actor_id text,
  created_at timestamptz not null default now()
);

create table if not exists champion_history (
  champion_history_id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(tournament_id),
  division_id uuid not null references divisions(division_id),
  champion_player_id uuid references players(player_id),
  champion_team jsonb,
  result_status text not null,
  recorded_at timestamptz not null default now()
);

create table if not exists eligibility_restrictions (
  restriction_id uuid primary key default gen_random_uuid(),
  player_id uuid references players(player_id),
  category text not null,
  level numeric(2,1) not null,
  reason text not null default 'Previous Champion',
  source_champion_history_id uuid references champion_history(champion_history_id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  notification_id uuid primary key default gen_random_uuid(),
  recipient_player_id uuid references players(player_id),
  recipient_admin_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists recent_activity (
  activity_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_type text not null,
  actor_id text,
  registration_id uuid references registrations(registration_id),
  tournament_id uuid references tournaments(tournament_id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  audit_id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id text,
  before_json jsonb,
  after_json jsonb,
  admin_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_registrations_division on registrations(division_id);
create index if not exists idx_registrations_player on registrations(main_player_id);
create index if not exists idx_payment_registration on payment_submissions(registration_id, uploaded_at desc);
create index if not exists idx_waiting_division on waiting_list_entries(division_id, queue_timestamp);
create index if not exists idx_notifications_player on notifications(recipient_player_id, created_at desc);
create index if not exists idx_activity_created on recent_activity(created_at desc);
create index if not exists idx_audit_created on audit_log(created_at desc);
