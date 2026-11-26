import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PlayerShell from "@/components/PlayerShell";
import { requirePlayer } from "@/lib/current-player";
import { isProfileComplete } from "@/lib/players";
import { money } from "@/lib/admin/types";
import { DEFAULT_RULES, fmtDate, fmtDateTime, getTournament, isRegistrationOpen } from "@/lib/tournaments";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, player } = await requirePlayer();
  if (!isProfileComplete(player)) redirect("/profile");
  const data = await getTournament(supabase, id);
  if (!data || data.tournament.status !== "Open") notFound();
  const { tournament: t, divisions } = data;
  const open = isRegistrationOpen(t);

  const { data: mine } = await supabase
    .from("registrations")
    .select("registration_id,division_id,registration_status")
    .eq("main_player_id", player.player_id)
    .eq("tournament_id", id)
    .neq("registration_status", "REJECTED");
  const mineByDivision = new Map((mine || []).map((r) => [r.division_id as string, r.registration_id as string]));

  return (
    <PlayerShell>
      <div className="eyebrow">TOURNAMENT</div>
      <h1>{t.name}</h1>
      <p className="muted">
        {fmtDate(t.start_at)}–{fmtDate(t.end_at)} · {t.venue || "Backspin Tennis Club"}
      </p>

      <div className="card wide">
        <div className="meta3">
          <div><b>Registration</b><div className="muted">{fmtDateTime(t.registration_open_at)} – {fmtDateTime(t.registration_close_at)}</div></div>
          <div><b>Payment deadline</b><div className="muted">{fmtDateTime(t.payment_deadline_at)}</div></div>
          <div><b>Format</b><div className="muted">Round Robin · 1 set / 6 games</div></div>
        </div>
        {t.description_en && <p className="muted" style={{ whiteSpace: "pre-line" }}>{t.description_en}</p>}
        <h2>Rules</h2>
        <div className="legal">{t.rules_en || DEFAULT_RULES}</div>
        <div className="notice">Waiting-list applicants do not pay until a slot is released.</div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div className="eyebrow">AVAILABLE CATEGORIES</div>
        <h2 style={{ margin: "4px 0" }}>Choose what you want to play</h2>
        <p className="muted">Register one category at a time. After submitting, return here to register for another category.</p>
      </div>
      {!open && <div className="notice yellow">Registration is not open right now.</div>}

      <div className="stack">
        {divisions.length ? (
          divisions.map((d) => {
            const doubles = d.format === "DOUBLES";
            const unit = doubles ? "pairs" : "players";
            const full = d.active_count >= d.capacity;
            const pct = d.capacity ? Math.min(100, (d.active_count / d.capacity) * 100) : 0;
            const existing = mineByDivision.get(d.division_id);
            return (
              <div className="card category" key={d.division_id}>
                <div className="category-head">
                  <div>
                    <span className="badge blue">{d.format}</span>
                    <h2>{d.name}</h2>
                    <div className="muted">Level {Number(d.level).toFixed(1)} · {money(d.fee)}{doubles ? " / pair" : ""}</div>
                  </div>
                  <div className="capacity">
                    <div><b>{d.active_count} / {d.capacity}</b> {unit}</div>
                    <div className="capacity-bar"><span style={{ width: `${pct}%` }} /></div>
                    <div className="small muted">{full ? "Currently full" : `${d.capacity - d.active_count} ${unit} remaining`}</div>
                  </div>
                </div>
                <div className="category-foot">
                  <span className={`badge ${!d.is_open ? "red" : full ? "yellow" : "green"}`}>
                    {!d.is_open ? "CLOSED" : full ? "FULL" : "OPEN"}
                  </span>
                  {existing ? (
                    <Link className="btn secondary" href={`/applications/${existing}`}>View Application</Link>
                  ) : open && d.is_open ? (
                    <Link className={`btn ${full ? "secondary" : ""}`} href={`/tournaments/${t.tournament_id}/register/${d.division_id}`}>
                      {full ? "Join Waiting List" : "Register"}
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="card center muted">No categories yet.</div>
        )}
      </div>
      <div className="notice">
        Capacity is shown as registered players for Singles and registered pairs for Doubles. A category can fill while you are
        completing your registration; capacity is checked again when you submit.
      </div>
    </PlayerShell>
  );
}
