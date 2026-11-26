import { listTournaments, pickTournament, requireAdmin } from "@/lib/admin/server";
import TournamentPicker from "../TournamentPicker";

export default async function ExportPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const { supabase } = await requireAdmin();
  const tournaments = await listTournaments(supabase);
  const tournament = pickTournament(tournaments, t);

  return (
    <>
      <div className="top">
        <div>
          <h1>Export</h1>
          <div className="muted">Export registration data for operations and tournament administration.</div>
        </div>
      </div>
      <div className="card">
        <TournamentPicker tournaments={tournaments} value={tournament?.tournament_id} />
      </div>
      <div className="card">
        <h2>Registration Export</h2>
        <p className="muted">Export the selected tournament&apos;s registration records.</p>
        {tournament ? (
          <a className="btn" href={`/admin/export/csv?t=${tournament.tournament_id}`}>
            Export CSV
          </a>
        ) : (
          <p className="muted">No tournament to export.</p>
        )}
      </div>
    </>
  );
}
