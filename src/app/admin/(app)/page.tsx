import Link from "next/link";
import { listTournaments, loadTournamentData, pickTournament, requireAdmin } from "@/lib/admin/server";
import { money } from "@/lib/admin/types";
import TournamentPicker from "./TournamentPicker";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const { supabase } = await requireAdmin();
  const tournaments = await listTournaments(supabase);
  const tournament = pickTournament(tournaments, t);
  const data = tournament ? await loadTournamentData(supabase, tournament.tournament_id) : null;
  const apps = data?.registrations ?? [];
  const count = (s: string) => apps.filter((a) => a.registration_status === s).length;

  return (
    <>
      <div className="top">
        <div>
          <h1>Tournament Dashboard</h1>
          <div className="muted">Overview of registrations, payments, capacity and waiting list</div>
        </div>
        <Link className="btn" href="/admin/tournaments/new">
          + Create Tournament
        </Link>
      </div>
      <div className="card">
        <TournamentPicker tournaments={tournaments} value={tournament?.tournament_id} />
      </div>
      {tournament && data ? (
        <>
          <div className="stats">
            {[
              ["Applications", apps.length],
              ["Confirmed", count("CONFIRMED")],
              ["Payment Review", count("PAYMENT_SUBMITTED")],
              ["Waiting List", count("WAITING_LIST")],
            ].map(([label, n]) => (
              <div className="card" key={label}>
                <div className="muted">{label}</div>
                <div className="stat-num">{n}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="top">
              <div>
                <h2 style={{ margin: 0 }}>Category Overview</h2>
                <div className="muted">Capacity and registration status for this tournament</div>
              </div>
              <Link className="btn secondary" href={`/admin/applications?t=${tournament.tournament_id}`}>
                View Applications
              </Link>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Capacity</th>
                    <th>Applications</th>
                    <th>Payment Review</th>
                    <th>Waiting</th>
                    <th>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {data.divisions.length ? (
                    data.divisions.map((d) => {
                      const rows = apps.filter((x) => x.division_id === d.division_id);
                      const used = rows.filter((x) => x.registration_status !== "WAITING_LIST").length;
                      const available = Math.max(0, Number(d.capacity || 0) - used);
                      return (
                        <tr key={d.division_id}>
                          <td>
                            <b>{d.name}</b>
                            <div className="muted small">
                              {d.format} · Level {d.level} · {money(d.fee)}
                            </div>
                          </td>
                          <td>{d.capacity}</td>
                          <td>{used}</td>
                          <td>{rows.filter((x) => x.registration_status === "PAYMENT_SUBMITTED").length}</td>
                          <td>{rows.filter((x) => x.registration_status === "WAITING_LIST").length}</td>
                          <td>
                            <span className={`badge ${available ? "green" : "red"}`}>{available || "Full"}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="empty">
                        No categories.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card empty muted">No tournaments yet. Create your first tournament to start registration management.</div>
      )}
    </>
  );
}
