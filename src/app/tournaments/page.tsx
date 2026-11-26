import Link from "next/link";
import { redirect } from "next/navigation";
import PlayerShell from "@/components/PlayerShell";
import { requirePlayer } from "@/lib/current-player";
import { isProfileComplete } from "@/lib/players";
import { fmtDate, isRegistrationOpen, listOpenTournaments } from "@/lib/tournaments";

export default async function TournamentsPage() {
  const { supabase, player } = await requirePlayer();
  if (!isProfileComplete(player)) redirect("/profile");
  const tournaments = await listOpenTournaments(supabase);
  if (tournaments.length === 1) redirect(`/tournaments/${tournaments[0].tournament_id}`);

  return (
    <PlayerShell>
      <div className="eyebrow">TOURNAMENTS</div>
      <h1>Open Tournaments</h1>
      {tournaments.length ? (
        <div className="stack">
          {tournaments.map((t) => (
            <Link key={t.tournament_id} href={`/tournaments/${t.tournament_id}`} className="card card-link">
              <h2 style={{ margin: "0 0 6px" }}>{t.name}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {fmtDate(t.start_at)}–{fmtDate(t.end_at)} · {t.venue || "Backspin Tennis Club"}
              </p>
              <p className="small muted">
                {isRegistrationOpen(t) ? `Registration closes ${fmtDate(t.registration_close_at)}` : "Registration not open"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card center">
          <h2>No tournaments available</h2>
          <p className="muted">There is no open tournament available for registration right now.</p>
        </div>
      )}
    </PlayerShell>
  );
}
