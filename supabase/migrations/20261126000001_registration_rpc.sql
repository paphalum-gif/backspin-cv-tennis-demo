-- Registration and payment go through security-definer functions so that
-- capacity, eligibility and status are decided by the database, not the browser.
-- Safe to run while the legacy site is live: it only adds functions.

-- Active (seat-holding) registrations per division, visible to any signed-in user.
create or replace function public.division_availability(p_tournament_id uuid)
returns table (division_id uuid, active_count integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select d.division_id,
         count(r.registration_id)::int as active_count
  from divisions d
  left join registrations r
    on r.division_id = d.division_id
   and r.registration_status in ('SUBMITTED','PAYMENT_REQUIRED','PAYMENT_SUBMITTED','CONFIRMED')
  where d.tournament_id = p_tournament_id
    and auth.uid() is not null
  group by d.division_id;
$$;

-- Eligibility: RED blocks, YELLOW needs admin validation. Mirrors the legacy client rules.
create or replace function public.evaluate_eligibility(p_player_id uuid, p_division_id uuid, p_partner_name text)
returns table (result text, reason text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_discipline text;
  v_level numeric;
  v_red text;
  v_yellow text[] := '{}';
  h record;
  v_prev_partners text[];
begin
  select upper(d.format), d.level into v_discipline, v_level
  from divisions d where d.division_id = p_division_id;

  for h in
    select upper(d.format) as fmt, d.level as lvl
    from champion_history c join divisions d on d.division_id = c.division_id
    where c.champion_player_id = p_player_id
  loop
    if h.fmt = v_discipline and h.lvl > v_level then
      v_red := 'Backspin Champion at a higher level in the same discipline.';
    elsif h.fmt = v_discipline and h.lvl = v_level then
      v_yellow := v_yellow || 'Backspin Champion at the same level requires Admin validation.';
    elsif h.fmt is not null and h.fmt <> v_discipline then
      v_yellow := v_yellow || 'Champion history in another discipline requires Admin validation.';
    end if;
  end loop;

  for h in
    select upper(e.format) as fmt, e.level as lvl
    from external_tournament_history e
    where e.player_id = p_player_id and lower(coalesce(e.result, '')) = 'champion'
  loop
    if h.fmt = v_discipline and h.lvl > v_level then
      v_red := 'External Champion at a higher level in the same discipline.';
    elsif h.fmt = v_discipline and h.lvl = v_level then
      v_yellow := v_yellow || 'External Champion at the same level requires Admin validation.';
    elsif h.fmt is not null and h.fmt <> v_discipline then
      v_yellow := v_yellow || 'Cross-discipline tournament history requires Admin validation.';
    end if;
  end loop;

  if v_discipline = 'DOUBLES' and nullif(trim(p_partner_name), '') is not null then
    select array_agg(distinct r.application_snapshot -> 'partner' ->> 'name')
      into v_prev_partners
    from registrations r
    where r.main_player_id = p_player_id
      and r.division_id = p_division_id
      and r.application_snapshot -> 'partner' ->> 'name' is not null;
    if v_prev_partners is not null and not (trim(p_partner_name) = any (v_prev_partners)) then
      v_yellow := v_yellow || 'Doubles partner change requires Admin validation.';
    end if;
  end if;

  if v_red is not null then
    return query select 'RED'::text, v_red;
  elsif array_length(v_yellow, 1) > 0 then
    return query select 'YELLOW'::text, array_to_string(array(select distinct unnest(v_yellow)), ' ');
  else
    return query select 'YELLOW'::text, 'Eligible to continue; Admin may validate the application.'::text;
  end if;
end;
$$;

create or replace function public.submit_registration(
  p_division_id uuid,
  p_partner jsonb default null,
  p_application jsonb default '{}'::jsonb,
  p_eligibility_answers jsonb default '{}'::jsonb,
  p_skill_assessment jsonb default '{}'::jsonb,
  p_consents jsonb default '{}'::jsonb,
  p_language text default 'EN'
)
returns registrations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player players;
  v_division divisions;
  v_tournament tournaments;
  v_active int;
  v_elig record;
  v_status text;
  v_payment text;
  v_partner jsonb;
  v_reg registrations;
  v_lang text := case when upper(p_language) = 'TH' then 'TH' else 'EN' end;
begin
  select * into v_player from players where auth_user_id = auth.uid();
  if v_player.player_id is null then
    raise exception 'No Backspin player profile for this account.';
  end if;
  if v_player.phone is null or v_player.date_of_birth is null or v_player.gender is null then
    raise exception 'Please complete your profile before registering.';
  end if;

  -- Lock the division so concurrent submits cannot overfill it.
  select * into v_division from divisions where division_id = p_division_id for update;
  if v_division.division_id is null or not v_division.is_open then
    raise exception 'This category is not open for registration.';
  end if;

  select * into v_tournament from tournaments where tournament_id = v_division.tournament_id;
  if v_tournament.status <> 'Open' then
    raise exception 'This tournament is not open for registration.';
  end if;
  if now() < v_tournament.registration_open_at or now() > v_tournament.registration_close_at then
    raise exception 'Registration is closed for this tournament.';
  end if;

  if not coalesce((p_consents ->> 'pdpa')::boolean, false)
     or not coalesce((p_consents ->> 'photo_video')::boolean, false)
     or not coalesce((p_consents ->> 'accuracy')::boolean, false) then
    raise exception 'Please accept the required consents.';
  end if;

  if exists (
    select 1 from registrations r
    where r.main_player_id = v_player.player_id
      and r.division_id = p_division_id
      and r.registration_status <> 'REJECTED'
  ) then
    raise exception 'You already have an application for this category.';
  end if;

  if upper(v_division.format) = 'DOUBLES' then
    if nullif(trim(p_partner ->> 'name'), '') is null then
      raise exception 'Please enter your doubles partner.';
    end if;
    v_partner := jsonb_build_object(
      'name', trim(p_partner ->> 'name'),
      'phone', nullif(trim(p_partner ->> 'phone'), ''),
      'email', nullif(trim(p_partner ->> 'email'), '')
    );
  end if;

  select count(*) into v_active
  from registrations r
  where r.division_id = p_division_id
    and r.registration_status in ('SUBMITTED','PAYMENT_REQUIRED','PAYMENT_SUBMITTED','CONFIRMED');

  select * into v_elig from evaluate_eligibility(v_player.player_id, p_division_id, v_partner ->> 'name');

  if v_elig.result = 'RED' then
    v_status := 'REJECTED';
    v_payment := 'NOT_REQUIRED';
  elsif v_active >= v_division.capacity then
    v_status := 'WAITING_LIST';
    v_payment := 'NOT_REQUIRED';
  else
    v_status := 'PAYMENT_REQUIRED';
    v_payment := 'PENDING';
  end if;

  insert into registrations (
    tournament_id, division_id, main_player_id, registration_status, payment_status,
    eligibility_result, eligibility_reason, profile_snapshot, application_snapshot,
    eligibility_answers, external_history_snapshot, skill_assessment, reject_reason
  ) values (
    v_division.tournament_id, p_division_id, v_player.player_id, v_status, v_payment,
    v_elig.result, v_elig.reason,
    to_jsonb(v_player) - 'auth_user_id' - 'created_at' - 'updated_at',
    coalesce(p_application, '{}'::jsonb) || jsonb_build_object('partner', v_partner),
    coalesce(p_eligibility_answers, '{}'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(e) - 'player_id') from external_tournament_history e
              where e.player_id = v_player.player_id), '[]'::jsonb),
    coalesce(p_skill_assessment, '{}'::jsonb),
    case when v_status = 'REJECTED' then v_elig.reason end
  ) returning * into v_reg;

  if v_status = 'WAITING_LIST' then
    insert into waiting_list_entries (registration_id, division_id) values (v_reg.registration_id, p_division_id);
  end if;

  insert into registration_consents (registration_id, consent_type, accepted, language, consent_version)
  values
    (v_reg.registration_id, 'PDPA', true, v_lang, 'v1'),
    (v_reg.registration_id, 'PHOTO_VIDEO', true, v_lang, 'v1'),
    (v_reg.registration_id, 'MARKETING', coalesce((p_consents ->> 'marketing')::boolean, false), v_lang, 'v1');

  insert into registration_timeline (registration_id, from_status, to_status, event, actor_type, actor_id)
  values (v_reg.registration_id, null, v_status, 'SUBMITTED', 'PLAYER', auth.uid()::text);

  return v_reg;
end;
$$;

create or replace function public.submit_payment_slip(
  p_registration_id uuid,
  p_slip_path text,
  p_reference text default null
)
returns registrations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reg registrations;
begin
  select r.* into v_reg
  from registrations r join players p on p.player_id = r.main_player_id
  where r.registration_id = p_registration_id and p.auth_user_id = auth.uid()
  for update of r;
  if v_reg.registration_id is null then
    raise exception 'Application not found.';
  end if;
  if v_reg.registration_status <> 'PAYMENT_REQUIRED' then
    raise exception 'This application is not waiting for payment.';
  end if;
  if p_slip_path is null or split_part(p_slip_path, '/', 1) <> p_registration_id::text then
    raise exception 'Invalid payment slip path.';
  end if;

  insert into payment_submissions (registration_id, slip_storage_path, slip_reference, payment_status)
  values (p_registration_id, p_slip_path, nullif(trim(p_reference), ''), 'SUBMITTED');

  update registrations
     set registration_status = 'PAYMENT_SUBMITTED', payment_status = 'SUBMITTED', updated_at = now()
   where registration_id = p_registration_id
  returning * into v_reg;

  insert into registration_timeline (registration_id, from_status, to_status, event, actor_type, actor_id)
  values (p_registration_id, 'PAYMENT_REQUIRED', 'PAYMENT_SUBMITTED', 'PAYMENT_SLIP_SUBMITTED', 'PLAYER', auth.uid()::text);

  return v_reg;
end;
$$;

revoke all on function public.division_availability(uuid) from public, anon;
revoke all on function public.evaluate_eligibility(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_registration(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, text) from public, anon;
revoke all on function public.submit_payment_slip(uuid, text, text) from public, anon;
grant execute on function public.division_availability(uuid) to authenticated;
grant execute on function public.submit_registration(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, text) to authenticated;
grant execute on function public.submit_payment_slip(uuid, text, text) to authenticated;
