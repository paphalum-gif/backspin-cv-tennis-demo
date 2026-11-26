# Backspin Auth Flow (LINE via Supabase Auth)

Backspin uses **Supabase Auth as the OAuth client** and **LINE as the OAuth/OIDC provider**. The app never talks to LINE directly; it only talks to Supabase.

## Overview

```
Your app  ──(PKCE)──►  Supabase Auth  ──(OAuth/OIDC)──►  LINE
   ▲                        │                              │
   │                        ◄──── code + LINE profile ─────┘
   └── ?code=... ───────────┘
/auth/callback exchanges code → Supabase session (JWT cookie)
```

There are two OAuth legs:

1. **App ↔ Supabase** — PKCE flow started by the app.
2. **Supabase ↔ LINE** — standard OAuth/OIDC, handled entirely by Supabase.

## Step by step

1. **App → Supabase.** The LINE button calls
   `signInWithOAuth({ provider: 'custom:line', options: { redirectTo: <origin>/auth/callback } })`.
   This starts a PKCE flow. The code verifier is stored in a cookie by `@supabase/ssr`.
2. **Supabase → LINE.** Supabase redirects the browser to LINE using the LINE Channel ID and secret configured in the Supabase `custom:line` provider. After the user approves, LINE sends the browser back to
   `https://ddnmrbkkrllmxsflkmam.supabase.co/auth/v1/callback`.
3. **Supabase → App.** Supabase creates or updates the user in `auth.users` (with the LINE identity) and redirects to the app's Redirect URL with `?code=...`.
4. **App server.** `src/app/auth/callback/route.ts` calls `exchangeCodeForSession(code)` on the server, which sets the Supabase session cookie, then redirects to `/`.

After this, the app uses the **Supabase session**, not the LINE token. Database access is controlled by RLS through `auth.uid()`, which comes from that session. `ensurePlayer` (`src/lib/players.ts`) links the auth user to a `players` row via `auth_user_id`.

## Where each URL is configured

| Setting | Value | Where |
| --- | --- | --- |
| LINE callback URL | `https://ddnmrbkkrllmxsflkmam.supabase.co/auth/v1/callback` | LINE Developers console |
| Supabase Site URL | `https://backspins.netlify.app/` | Supabase → Auth → URL Configuration |
| Supabase Redirect URLs | `http://localhost:3000/**`, `https://backspins.netlify.app/auth/callback` | Supabase → Auth → URL Configuration |

Dashboard: https://supabase.com/dashboard/project/ddnmrbkkrllmxsflkmam/auth/url-configuration

## Troubleshooting

- **Landed on `https://backspins.netlify.app/?code=...` instead of `/auth/callback`.** The requested `redirectTo` is not in the Supabase Redirect URLs allow list, so Supabase fell back to the Site URL. Add the URL to the allow list.
- **"PKCE code verifier not found in storage".** The login was started on a different origin, browser, or device than the one finishing it (for example, started on localhost and finished on netlify). Start and finish on the same origin.
- **Env changes not applied.** `NEXT_PUBLIC_*` variables are read when `npm run dev` starts. Restart the dev server after editing `.env.local`.
- **`NEXT_PUBLIC_SITE_URL`.** Optional. Overrides the redirect origin. Set it to `http://localhost:3000` locally; leave it unset or set to the production URL on Netlify.
