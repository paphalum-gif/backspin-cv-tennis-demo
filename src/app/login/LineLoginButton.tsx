"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LineLoginButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "custom:line",
      options: {
        scopes: "openid profile",
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
    // On success the browser is redirected to LINE.
  }

  return (
    <>
      <button className="btn line" onClick={login} disabled={busy}>
        {busy ? "Opening LINE…" : "Continue with LINE"}
      </button>
      {error && <div className="notice red">LINE Login could not start. {error}</div>}
    </>
  );
}
