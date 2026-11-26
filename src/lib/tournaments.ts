import type { SupabaseClient } from "@supabase/supabase-js";
import type { Division, Tournament } from "@/lib/admin/types";

export type DivisionWithCount = Division & { active_count: number };

export const ACTIVE_STATUSES = ["SUBMITTED", "PAYMENT_REQUIRED", "PAYMENT_SUBMITTED", "CONFIRMED"];

export async function listOpenTournaments(db: SupabaseClient): Promise<Tournament[]> {
  const { data, error } = await db
    .from("tournaments")
    .select("*")
    .eq("status", "Open")
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data || []) as Tournament[];
}

export async function getTournament(db: SupabaseClient, id: string) {
  const [t, d, c] = await Promise.all([
    db.from("tournaments").select("*").eq("tournament_id", id).maybeSingle(),
    db.from("divisions").select("*").eq("tournament_id", id).order("sort_order"),
    db.rpc("division_availability", { p_tournament_id: id }),
  ]);
  if (t.error) throw t.error;
  if (d.error) throw d.error;
  if (c.error) throw c.error;
  if (!t.data) return null;
  const counts = new Map<string, number>(
    ((c.data || []) as { division_id: string; active_count: number }[]).map((x) => [x.division_id, x.active_count]),
  );
  const divisions = ((d.data || []) as Division[]).map((x) => ({ ...x, active_count: counts.get(x.division_id) ?? 0 }));
  return { tournament: t.data as Tournament, divisions };
}

export function isRegistrationOpen(t: Tournament, now = new Date()) {
  return t.status === "Open" && now >= new Date(t.registration_open_at) && now <= new Date(t.registration_close_at);
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }) : "—";

export const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      })
    : "—";

export const DEFAULT_RULES =
  "Round Robin · 1 set / 6 games. At 5–5, play a 7-point tiebreak. Deuce is Sudden Death / No-Ad. Check in at least 1 hour before your match. A 15-minute late arrival is a forfeit. Organizer / umpire decision is final.";

export const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  PAYMENT_REQUIRED: "Payment Required",
  PAYMENT_SUBMITTED: "Payment Under Review",
  WAITING_LIST: "Waiting List",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
};

export const statusColor = (s: string) =>
  s === "CONFIRMED" ? "green" : s === "REJECTED" ? "red" : s === "WAITING_LIST" || s === "PAYMENT_REQUIRED" ? "yellow" : "blue";
