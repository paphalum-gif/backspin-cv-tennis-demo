-- Run ONLY after the Next.js app is live in production.
-- The legacy static site inserts registrations directly; this blocks that path
-- so players can register only through submit_registration().

drop policy if exists "registrations_insert_own_or_admin" on registrations;
create policy "registrations_insert_admin" on registrations
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "payment_insert_own_or_admin" on payment_submissions;
create policy "payment_insert_admin" on payment_submissions
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "consent_insert_own_or_admin" on registration_consents;
create policy "consent_insert_admin" on registration_consents
  for insert to authenticated
  with check (public.is_admin());
