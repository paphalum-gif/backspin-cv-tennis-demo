import { listTournaments, loadTournamentData, pickTournament, requireAdmin } from "@/lib/admin/server";
import TournamentPicker from "../TournamentPicker";
import ApplicationTable from "./ApplicationTable";

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const { supabase } = await requireAdmin();
  const tournaments = await listTournaments(supabase);
  const tournament = pickTournament(tournaments, t);
  const data = tournament ? await loadTournamentData(supabase, tournament.tournament_id) : null;

  return (
    <>
      <div className="top">
        <div>
          <h1>Applications</h1>
          <div className="muted">Review applicant, eligibility, history and payment in one place.</div>
        </div>
      </div>
      <div className="card">
        <TournamentPicker tournaments={tournaments} value={tournament?.tournament_id} />
      </div>
      <ApplicationTable registrations={data?.registrations ?? []} tournamentId={tournament?.tournament_id} />
    </>
  );
}
