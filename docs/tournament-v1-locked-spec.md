# Backspin Tournament V1 — Locked Development Spec

Status: LOCKED for implementation
Repository: paphalum-gif/backspin-cv-tennis-demo
Development branch: feat/tournament-v1-dev
UX/UI baseline: Player v13 / Admin v4

## 1. Authentication
- Player: LINE Login.
- One LINE identity maps to one Backspin Profile.
- New player: create/complete profile after LINE authentication.
- Returning player: existing profile.
- Admin: separate in-app authentication with email/password.
- Player and Admin journeys are separate.

## 2. Profile vs Application Snapshot
- Backspin Profile is persistent and editable.
- Tournament Application stores an immutable snapshot at submission.
- Later profile edits do not mutate historical applications.
- One player can have multiple applications across categories/tournaments.

## 3. Application Lifecycle
Application statuses:
SUBMITTED → PAYMENT_REQUIRED → PAYMENT_SUBMITTED → CONFIRMED
SUBMITTED → WAITING_LIST → PAYMENT_REQUIRED → PAYMENT_SUBMITTED → CONFIRMED
Any review path may end in REJECTED.

There is no Payment Expired state.
After a missed payment deadline, the user must reapply.

Payment statuses:
NOT_REQUIRED, PENDING, SUBMITTED, PAID, REFUNDED.

## 4. Eligibility Engine
Only RED and YELLOW.
- RED: cannot compete at that level; blocks payment.
- YELLOW: can continue/register, but Admin validation is required.
- Higher-level Champion in the same discipline: RED for lower level.
- Champion at the same level: YELLOW.
- Doubles partner change: YELLOW.
- Singles/Doubles are separate disciplines.
- Singles Champion does not automatically count as Doubles Champion.
- Cross-discipline history is flagged for Admin validation.
- External tournament history is optional; players with no history can continue.
- Backspin Champion status is maintained by Admin.

## 5. Categories and Capacity
- Player registers one category at a time.
- A player may register for multiple categories through separate applications.
- Singles capacity counts players.
- Doubles capacity counts pairs.
- Category has configurable name, format, level, fee, capacity, and open/closed state.
- Level supports 0.0–10.0 in 0.5 increments in the data model.
- Capacity must be rechecked at final submission.

## 6. Payment
- One payment QR per tournament.
- Fee is configured per category.
- Each application has its own payment lifecycle.
- Payment slip is uploaded per application.
- Slip is stored in Supabase Storage; DB stores the storage path and verification metadata.
- Admin verifies the applicant, category, eligibility/history, and payment together.
- Waiting List users do not pay until Admin releases a slot.
- Payment deadline uses the tournament default with per-application Admin override.

## 7. Waiting List
- Full category → internal Waiting List.
- User does not see queue position.
- User sees a generic under-review/waiting message.
- Admin can release a slot.
- Release changes the application to PAYMENT_REQUIRED and triggers notification.

## 8. Notifications
Primary channel: LINE Official Account.
In-app notification/status is also maintained as fallback.
Events include registration submitted, payment required, payment confirmed, waiting-list status, slot released, and rejection.

## 9. Legacy Google Form Players
- Match legacy players to Backspin Profiles where possible.
- If ambiguous, request phone/email verification and allow Admin review.
- Never create duplicate profiles for the same person.
- Legacy application/history data remains historical.

## 10. Legal / Consent
Required:
- PDPA
- Photo & Video

Optional:
- Marketing (Accept / Decline)

Consent records store:
- registration
- consent type
- accepted/declined
- language
- consent version
- timestamp

TH and EN content are separate language presentations.

## 11. Auditability
Admin actions are auditable.
Store before/after state, action, entity, Admin, and timestamp.
Registration status changes have a timeline.

## 12. Timezone
All tournament business times use Asia/Bangkok.

## 13. Security
- RLS enabled on exposed public tables.
- Player access is scoped to the authenticated player's own data.
- Admin authorization uses Supabase app_metadata role, not user-editable user_metadata.
- Service-role/secret keys are never exposed to the browser.
