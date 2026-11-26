"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "").trim();
    const password = String(f.get("password") || "");
    setBusy(true);
    setError(null);
    const db = createClient();
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (data.user?.app_metadata?.role !== "admin") {
      await db.auth.signOut();
      setError("This account is not authorized for Backspin Admin. Set app_metadata.role to admin.");
      setBusy(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ textAlign: "left" }}>
      <label className="field" style={{ marginTop: 14 }}>
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field" style={{ marginTop: 14 }}>
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && <div className="notice red">{error}</div>}
      <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 18 }}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
