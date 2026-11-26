import Link from "next/link";
import { listTournaments, loadTournamentData, pickTournament, requireAdmin } from "@/lib/admin/server";
import TournamentPicker from "../TournamentPicker";
import { EligibilityBadge, StatusBadge } from "../StatusBadge";

export default async function WaitingPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const { supabase } = await requireAdmin();
  const tournaments = await listTournaments(supabase);
  const tournament = pickTournament(tournaments, t);
  const data = tournament ? await loadTournamentData(supabase, tournament.tournament_id) : null;
  // Oldest first: the order the queue should be worked through.
  const waiting = (data?.registrations ?? [])
    .filter((a) => a.registration_status === "WAITING_LIST")
    .sort((x, y) => x.submitted_at.localeCompare(y.submitted_at));

  return (
    <>
      <div className="top">
        <div>
          <h1>Waiting List</h1>
          <div className="muted">Release slots, keep on list or reject applications. Queue position is never shown to players.</div>
        </div>
      </div>
      <div className="card">
        <TournamentPicker tournaments={tournaments} value={tournament?.tournament_id} />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Player</th><th>Category</th><th>Eligibility</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {waiting.length ? (
                waiting.map((a) => (
                  <tr key={a.registration_id}>
                    <td><b>{a.players?.name || "—"}</b></td>
                    <td>{a.divisions?.name || "—"}</td>
                    <td><EligibilityBadge value={a.eligibility_result} /></td>
                    <td><StatusBadge value={a.registration_status} /></td>
                    <td>
                      <Link className="btn secondary" href={`/admin/applications/${a.registration_id}?t=${a.tournament_id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="empty">No waiting-list applications.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
