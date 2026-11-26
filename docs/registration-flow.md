# Player Registration Flow (Next.js)

## Pages

| Path | Purpose |
| --- | --- |
| `/tournaments` | Open tournaments (redirects straight to the tournament when only one is open) |
| `/tournaments/[id]` | Tournament details, rules, categories with live capacity |
| `/tournaments/[id]/register/[divisionId]` | Wizard: details & acknowledgements → partner (doubles) → eligibility → external history → skills → review & consent |
| `/applications` | My applications |
| `/applications/[id]` | Status page; payment QR + slip upload when `PAYMENT_REQUIRED` |
| `/history` | Backspin applications and external tournament history |

## Database functions

Submit and payment run in Postgres (`supabase/migrations/20261126000001_registration_rpc.sql`):

- `division_availability(tournament_id)` — seat-holding registration counts per category. Players cannot read other players' registrations, so counts must come from here.
- `submit_registration(...)` — checks profile, tournament window, category open, consents, duplicate application; locks the category row, evaluates eligibility (Backspin + external champion history, doubles partner change), decides `PAYMENT_REQUIRED` / `WAITING_LIST` / `REJECTED`, stores snapshots, consents, waiting-list entry and timeline.
- `submit_payment_slip(registration_id, path, reference)` — only for the owner's `PAYMENT_REQUIRED` application; records the slip and moves it to `PAYMENT_SUBMITTED`.

## Applying the migrations

1. Run `20261126000001_registration_rpc.sql` in the Supabase SQL editor. It only adds functions, so the legacy site keeps working.
2. After the Next.js app replaces the legacy site in production, run `20261126000002_lock_player_registration_insert.sql`. It removes players' direct insert access to `registrations`, `payment_submissions` and `registration_consents`, so status and eligibility can no longer be set from the browser.

## Storage

- Payment slips: bucket `payment-slips`, path `<registration_id>/<timestamp>-<file>`.
- Tournament QR: bucket `payment-slips`, path `tournaments/<tournament_id>/...`. Players need read access to this prefix (signed URL) to see the QR.
