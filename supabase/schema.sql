-- Backspin Tournament V1
-- Locked against approved Player/Admin UX and business rules.
-- Target: Supabase / PostgreSQL 17, Asia/Bangkok
create extension if not exists pgcrypto;

create table if not exists players (
  player_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  nickname text,
  phone text,
  email text,
  date_of_birth date,
  gender text,
  occupation text,
  medical_condition text,
  emergency_contact_name text,
  emergency_contact_phone text,
  line_id text,
  instagram_id text,
  regular_tennis_court text,
  tennis_experience_years numeric(4,1),
  profile_photo_path text,
  verification_status text not null default 'Unverified'
    check (verification_status in ('Verified','Unverified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_players_phone on players(phone) where phone is not null;
create unique index if not exists uq_players_email on players(lower(email)) where email is not null;

create table if not exists player_identities (
  player_identity_id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(player_id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  linked_at timestamptz not null default now(),
  unique(provider, provider_subject)
);

create table if not exists tournaments (
  tournament_id uuid primary key default gen_random_uuid(),
  name text not null,
  description_th text,
  description_en text,
  venue text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  registration_open_at timestamptz not null,
  registration_close_at timestamptz not null,
  payment_deadline_at timestamptz,
  payment_qr_path text,
  payment_account_name text,
  rules_th text,
  rules_en text,
  status text not null default 'Draft'
    check (status in ('Draft','Open','Closed','Completed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (registration_open_at <= registration_close_at),
  check (start_at <= end_at)
);

create table if not exists divisions (
  division_id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(tournament_id) on delete cascade,
  name text not null,
  gender_category text not null
    check (gender_category in ('MEN','WOMEN','MIXED','OPEN')),
  format text not null
    check (format in ('SINGLES','DOUBLES')),
  level numeric(3,1) not null
    check (level >= 0 and level <= 10 and level * 2 = trunc(level * 2)),
  fee numeric(10,2) not null check (fee >= 0),
  capacity integer not null check (capacity > 0),
  is_open boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tournament_id, name, level)
);

create index if not exists idx_divisions_tournament on divisions(tournament_id, sort_order);

create table if not exists registrations (
  registration_id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(tournament_id),
  division_id uuid not null references divisions(division_id),
  main_player_id uuid not null references players(player_id),
  registration_status text not null default 'SUBMITTED'
    check (registration_status in (
      'SUBMITTED','PAYMENT_REQUIRED','WAITING_LIST',
      'PAYMENT_SUBMITTED','CONFIRMED','REJECTED'
    )),
  eligibility_result text
    check (eligibility_result in ('RED','YELLOW')),
  eligibility_reason text,
  payment_status text not null default 'NOT_REQUIRED'
    check (payment_status in ('NOT_REQUIRED','PENDING','SUBMITTED','PAID','REFUNDED')),
  payment_deadline_override_at timestamptz,
  profile_snapshot jsonb not null default '{}'::jsonb,
  application_snapshot jsonb not null default '{}'::jsonb,
  eligibility_answers jsonb not null default '{}'::jsonb,
  external_history_snapshot jsonb not null default '[]'::jsonb,
  skill_assessment jsonb not null default '{}'::jsonb,
  admin_note text,
  reject_reason text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique(tournament_id, division_id, main_player_id)
);

create index if not exists idx_registrations_tournament on registrations(tournament_id, created_at desc);
create index if not exists idx_registrations_division on registrations(division_id, registration_status);
create index if not exists idx_registrations_player on registrations(main_player_id, created_at desc);

create table if not exists registration_partners (
  registration_partner_id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references registrations(registration_id) on delete cascade,
  player_id uuid references players(player_id) on delete set null,
  name text not null,
  phone text,
  email text,
  profile_linked boolean not null default false,
  verification_status text not null default 'Unverified'
    check (verification_status in ('Verified','Unverified'))
);

create table if not exists external_tournament_history (
  external_history_id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(player_id) on delete cascade,
  tournament_name text not null,
  tournament_year integer,
  format text not null check (format in ('SINGLES','DOUBLES')),
  category_name text,
  level numeric(3,1)
    check (level is null or (level >= 0 and level <= 10 and level * 2 = trunc(level * 2))),
  result text,
  partner_name text,
  source_note text,
  created_at timestamptz not null default now()
);

create table if not exists payment_submissions (
  payment_submission_id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(registration_id) on delete cascade,
  slip_storage_path text not null,
  slip_reference text,
  uploaded_at timestamptz not null default now(),
  payment_status text not null
    check (payment_status in ('SUBMITTED','PAID','REJECTED','REFUNDED')),
  reject_reason text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_payment_registration on payment_submissions(registration_id, uploaded_at desc);

create table if not exists waiting_list_entries (
  waiting_entry_id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references registrations(registration_id) on delete cascade,
  division_id uuid not null references divisions(division_id),
  queued_at timestamptz not null default now(),
  released_at timestamptz,
  released_by uuid references auth.users(id) on delete set null,
  state text not null default 'WAITING'
    check (state in ('WAITING','RELEASED','REMOVED'))
);

create index if not exists idx_waiting_division on waiting_list_entries(division_id, queued_at);

create table if not exists champion_history (
  champion_history_id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(tournament_id),
  division_id uuid not null references divisions(division_id),
  champion_player_id uuid references players(player_id) on delete set null,
  champion_team jsonb,
  result_status text not null,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_champion_player on champion_history(champion_player_id);
create index if not exists idx_champion_division on champion_history(division_id);

create table if not exists eligibility_restrictions (
  restriction_id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(player_id) on delete cascade,
  discipline text not null check (discipline in ('SINGLES','DOUBLES')),
  level numeric(3,1) not null
    check (level >= 0 and level <= 10 and level * 2 = trunc(level * 2)),
  reason text not null,
  source_champion_history_id uuid references champion_history(champion_history_id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists registration_consents (
  consent_id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(registration_id) on delete cascade,
  consent_type text not null
    check (consent_type in ('PDPA','PHOTO_VIDEO','MARKETING')),
  accepted boolean not null,
  language text not null check (language in ('TH','EN')),
  consent_version text not null,
  accepted_at timestamptz not null default now(),
  unique(registration_id, consent_type)
);

create table if not exists registration_timeline (
  timeline_id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(registration_id) on delete cascade,
  from_status text,
  to_status text,
  event text not null,
  actor_type text not null check (actor_type in ('PLAYER','ADMIN','SYSTEM')),
  actor_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_registration_timeline on registration_timeline(registration_id, created_at desc);

create table if not exists notifications (
  notification_id uuid primary key default gen_random_uuid(),
  recipient_player_id uuid references players(player_id) on delete cascade,
  recipient_admin_id uuid references auth.users(id) on delete cascade,
  channel text not null default 'IN_APP'
    check (channel in ('IN_APP','LINE')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_player on notifications(recipient_player_id, created_at desc);

create table if not exists audit_log (
  audit_id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id text,
  before_json jsonb,
  after_json jsonb,
  admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_created on audit_log(created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

alter table players enable row level security;
alter table player_identities enable row level security;
alter table tournaments enable row level security;
alter table divisions enable row level security;
alter table registrations enable row level security;
alter table registration_partners enable row level security;
alter table external_tournament_history enable row level security;
alter table payment_submissions enable row level security;
alter table waiting_list_entries enable row level security;
alter table champion_history enable row level security;
alter table eligibility_restrictions enable row level security;
alter table registration_consents enable row level security;
alter table registration_timeline enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;

create policy "players_select_own_or_admin" on players
  for select to authenticated
  using (auth.uid() = auth_user_id or public.is_admin());

create policy "players_insert_self" on players
  for insert to authenticated
  with check (auth.uid() = auth_user_id or public.is_admin());

create policy "players_update_own_or_admin" on players
  for update to authenticated
  using (auth.uid() = auth_user_id or public.is_admin())
  with check (auth.uid() = auth_user_id or public.is_admin());

create policy "identities_own_or_admin" on player_identities
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from players p
      where p.player_id = player_identities.player_id
        and p.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from players p
      where p.player_id = player_identities.player_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "tournaments_read_authenticated" on tournaments
  for select to authenticated using (true);

create policy "tournaments_admin_write" on tournaments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "divisions_read_authenticated" on divisions
  for select to authenticated using (true);

create policy "divisions_admin_write" on divisions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "registrations_read_own_or_admin" on registrations
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from players p
      where p.player_id = registrations.main_player_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "registrations_insert_own_or_admin" on registrations
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from players p
      where p.player_id = registrations.main_player_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "registrations_update_admin" on registrations
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "partners_own_or_admin" on registration_partners
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from registrations r
      join players p on p.player_id = r.main_player_id
      where r.registration_id = registration_partners.registration_id
        and p.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from registrations r
      join players p on p.player_id = r.main_player_id
      where r.registration_id = registration_partners.registration_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "external_history_own_or_admin" on external_tournament_history
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from players p
      where p.player_id = external_tournament_history.player_id
        and p.auth_user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from players p
      where p.player_id = external_tournament_history.player_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "payment_read_own_or_admin" on payment_submissions
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from registrations r
      join players p on p.player_id = r.main_player_id
      where r.registration_id = payment_submissions.registration_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "payment_insert_own_or_admin" on payment_submissions
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from registrations r
      join players p on p.player_id = r.main_player_id
      where r.registration_id = payment_submissions.registration_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "payment_admin_update" on payment_submissions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "waiting_read_own_or_admin" on waiting_list_entries
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from registrations r
      join players p on p.player_id = r.main_player_id
      where r.registration_id = waiting_list_entries.registration_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "waiting_admin_write" on waiting_list_entries
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "champion_admin_only" on champion_history
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "restriction_read_own_or_admin" on eligibility_restrictions
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from players p
      where p.player_id = eligibility_restrictions.player_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "consent_read_own_or_admin" on registration_consents
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from registrations r
      join players p on p.player_id = r.main_player_id
      where r.registration_id = registration_consents.registration_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "consent_insert_own_or_admin" on registration_consents
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from registrations r
      join players p on p.player_id = r.main_player_id
      where r.registration_id = registration_consents.registration_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "timeline_read_own_or_admin" on registration_timeline
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from registrations r
      join players p on p.player_id = r.main_player_id
      where r.registration_id = registration_timeline.registration_id
        and p.auth_user_id = auth.uid()
    )
  );

create policy "notifications_read_own_or_admin" on notifications
  for select to authenticated
  using (
    public.is_admin()
    or recipient_player_id = (
      select p.player_id from players p where p.auth_user_id = auth.uid()
    )
    or recipient_admin_id = auth.uid()
  );

create policy "audit_admin_only" on audit_log
  for select to authenticated
  using (public.is_admin());
