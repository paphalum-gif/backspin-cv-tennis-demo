import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// LINE -> Supabase -> here with ?code=. Exchange once, on the server, then leave.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (oauthError) {
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(oauthError)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
  return NextResponse.redirect(`${origin}${safeNext}`);
}
