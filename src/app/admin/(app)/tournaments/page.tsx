import Link from "next/link";
import { listTournaments, requireAdmin } from "@/lib/admin/server";

export default async function TournamentsPage() {
  const { supabase } = await requireAdmin();
  const tournaments = await listTournaments(supabase);
  return (
    <>
      <div className="top">
        <div>
          <h1>Tournaments</h1>
          <div className="muted">Create and manage reusable tournaments.</div>
        </div>
        <Link className="btn" href="/admin/tournaments/new">
          + Create Tournament
        </Link>
      </div>
      {tournaments.length ? (
        tournaments.map((x) => (
          <div className="card" key={x.tournament_id}>
            <div className="top">
              <div>
                <h2 style={{ margin: 0 }}>{x.name}</h2>
                <div className="muted">{x.venue || "—"}</div>
              </div>
              <span className="badge blue">{x.status}</span>
            </div>
            <div className="actions" style={{ justifyContent: "flex-start" }}>
              <Link className="btn secondary" href={`/admin?t=${x.tournament_id}`}>
                Open Dashboard
              </Link>
              <Link className="btn ghost" href={`/admin/tournaments/${x.tournament_id}/edit`}>
                Edit
              </Link>
            </div>
          </div>
        ))
      ) : (
        <div className="card empty muted">No tournaments yet. Create your first tournament to start registration management.</div>
      )}
    </>
  );
}
