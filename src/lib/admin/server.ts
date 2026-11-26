import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Division, Registration, Tournament } from "./types";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") redirect("/admin/login");
  return { supabase, user };
}

type Db = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export async function listTournaments(db: Db): Promise<Tournament[]> {
  const { data, error } = await db.from("tournaments").select("*").order("start_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Tournament[];
}

/** Picks the tournament from ?t=, falling back to the most recent one. */
export function pickTournament(tournaments: Tournament[], t?: string) {
  return tournaments.find((x) => x.tournament_id === t) ?? tournaments[0] ?? null;
}

export async function loadTournamentData(db: Db, tournamentId: string) {
  const [d, r] = await Promise.all([
    db.from("divisions").select("*").eq("tournament_id", tournamentId).order("sort_order"),
    db
      .from("registrations")
      .select("*,players(name,email,phone),divisions(name,format,level,fee)")
      .eq("tournament_id", tournamentId)
      .order("submitted_at", { ascending: false }),
  ]);
  if (d.error) throw d.error;
  if (r.error) throw r.error;
  return { divisions: (d.data || []) as Division[], registrations: (r.data || []) as Registration[] };
}
