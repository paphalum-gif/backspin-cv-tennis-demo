"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SKILLS } from "@/lib/profile-options";

export default function SkillForm({ playerId, saved }: { playerId: string; saved: Record<string, string> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const skill = Object.fromEntries(SKILLS.map((x) => [x.key, String(f.get(x.key) ?? x.default)]));
    const { error } = await createClient()
      .from("players")
      .update({ skill_profile: skill, updated_at: new Date().toISOString() })
      .eq("player_id", playerId);
    if (error) {
      setError(`Could not save your skill profile. ${error.message}`);
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid">
        {SKILLS.map((x) => (
          <label className="field" key={x.key}>
            <span>{x.key}</span>
            <select name={x.key} defaultValue={x.options.includes(saved[x.key]) ? saved[x.key] : x.default}>
              {x.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="notice">
        You can edit your profile and skill information later. Submitted tournament applications remain
        unchanged as snapshots.
      </div>
      {error && <div className="notice red">{error}</div>}
      <div className="actions">
        <Link className="btn secondary" href="/profile">
          Back
        </Link>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save Profile & View Tournaments"}
        </button>
      </div>
    </form>
  );
}
