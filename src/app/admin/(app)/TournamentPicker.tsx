"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Tournament } from "@/lib/admin/types";

export default function TournamentPicker({ tournaments, value }: { tournaments: Tournament[]; value?: string }) {
  const router = useRouter();
  const path = usePathname();
  if (!tournaments.length) return <p className="muted">No tournaments yet.</p>;
  return (
    <label className="field" style={{ maxWidth: 420 }}>
      <span>View By Tournament</span>
      <select value={value} onChange={(e) => router.push(`${path}?t=${e.target.value}`)}>
        {tournaments.map((x) => (
          <option key={x.tournament_id} value={x.tournament_id}>
            {x.name} · {x.status}
          </option>
        ))}
      </select>
    </label>
  );
}
