# Backspin LINE Login + Supabase Auth (Development)

## Architecture

Player browser
→ Supabase Auth custom OAuth provider `custom:line`
→ LINE Login v2.1
→ Supabase Auth callback
→ Backspin Player Profile
→ Tournament registration

The LINE Channel Secret is never stored in the browser or committed to GitHub.

## Supabase project

Project ref: `ddnmrbkkrllmxsflkmam`

Supabase Auth callback URL for the LINE provider:

`https://ddnmrbkkrllmxsflkmam.supabase.co/auth/v1/callback`

## Configure Supabase Auth

In Supabase Dashboard → Authentication → Providers → Custom OAuth Providers, create a manual OAuth2 provider:

- Identifier: `custom:line`
- Name: `LINE`
- Client ID: LINE Login **Developing Channel ID**
- Client Secret: LINE Login **Developing Channel Secret**
- Authorization URL: `https://access.line.me/oauth2/v2.1/authorize`
- Token URL: `https://api.line.me/oauth2/v2.1/token`
- UserInfo URL: `https://api.line.me/oauth2/v2.1/userinfo`
- Scopes: `profile openid email`
- Email optional: enable if the LINE email permission has not been approved yet
- PKCE: keep enabled

Do not commit the Channel Secret.

## Configure LINE Developers

In LINE Developers Console → LINE Login → Developing:

Add this callback URL exactly:

`https://ddnmrbkkrllmxsflkmam.supabase.co/auth/v1/callback`

The Developing Channel ID is the Client ID used above.

The Channel Secret shown in the LINE console should be rotated before production because it was previously exposed in a screenshot/chat. Use the newly issued secret in Supabase only.

## Email and phone

LINE Login v2.1 can return profile/openid information and email only after the required email permission is approved by LINE.

Standard LINE Login does **not** provide a user's phone number through the normal `profile`/`openid`/`email` scopes. Backspin should therefore keep phone as a profile field to be completed/verified separately.

## Backspin player code

The player uses:

`supabase.auth.signInWithOAuth({ provider: 'custom:line', options: { redirectTo: window.location.origin + '/' } })`

The browser only contains the Supabase publishable key. The LINE Channel Secret remains in Supabase Auth configuration.

## Development test

1. Configure the custom provider in Supabase.
2. Add the callback URL to the LINE Developing channel.
3. Open the Backspin Player site.
4. Click **Continue with LINE**.
5. Complete LINE authentication/consent.
6. LINE redirects to Supabase Auth.
7. Supabase redirects back to the Backspin Player.
8. Backspin creates/loads the Player profile and loads the tournament data.

## Production

Before production:
- Create/use the Published LINE channel credentials.
- Register the production callback URL in the Published channel.
- Replace the Supabase custom provider Client ID/Secret with the Published credentials.
- Never put the LINE Channel Secret in frontend code, Netlify static files, or Git.
