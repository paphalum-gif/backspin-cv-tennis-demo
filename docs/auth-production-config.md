# Backspin Auth / OAuth Production Configuration

## Production player login

- Production app: `https://backspins.netlify.app/`
- Supabase Auth **Site URL**: `https://backspins.netlify.app/`
- Supabase Auth **Redirect URL**: `https://backspins.netlify.app/`
- Custom provider identifier: `custom:line`
- LINE/Supabase provider callback URL: `https://ddnmrbkkrllmxsflkmam.supabase.co/auth/v1/callback`

The LINE provider callback URL is the callback registered in LINE Developers. It is **not** the Netlify app URL.

The browser redirect after Supabase finishes OAuth is the application URL above. The client derives it from `window.location.origin` so production and local development do not hard-code each other.

## Local development

If testing on `http://localhost:3000/`, add:

`http://localhost:3000/**`

to Supabase Auth Redirect URLs. Do not change the production Site URL to localhost.

## Callback handling

Player login uses Supabase PKCE. After LINE returns to the application, the player client checks the existing session and, when necessary, exchanges the returned `code` with `exchangeCodeForSession()`. The callback URL is cleaned after the session is established.

This prevents the previous failure mode where the OAuth code landed on a dead `localhost:3000` URL or the player remained on the login screen.
