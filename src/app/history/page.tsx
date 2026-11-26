import Link from "next/link";
import PlayerShell from "@/components/PlayerShell";
import { requirePlayer } from "@/lib/current-player";
import { MY_REGISTRATION_SELECT, type MyRegistration } from "@/lib/my-registrations";
import { STATUS_LABEL, fmtDate, statusColor } from "@/lib/tournaments";

type External = {
  external_history_id: string;
  tournament_name: string;
  tournament_year: number | null;
  format: string;
  level: number | null;
  result: string | null;
  partner_name: string | null;
};

export default async function HistoryPage() {
  const { supabase, player } = await requirePlayer();
  const [regs, ext] = await Promise.all([
    supabase.from("registrations").select(MY_REGISTRATION_SELECT).eq("main_player_id", player.player_id).order("submitted_at", { ascending: false }),
    supabase.from("external_tournament_history").select("*").eq("player_id", player.player_id).order("tournament_year", { ascending: false }),
  ]);
  if (regs.error) throw regs.error;
  if (ext.error) throw ext.error;
  const backspin = (regs.data || []) as unknown as MyRegistration[];
  const external = (ext.data || []) as External[];

  return (
    <PlayerShell>
      <div className="eyebrow">TOURNAMENT HISTORY</div>
      <h1>My Tournament History</h1>
      <p className="muted">Backspin applications and external tournament results.</p>

      <div className="card wide">
        <h2 style={{ marginTop: 0 }}>Backspin Tournaments</h2>
        {backspin.length ? (
          <table className="table-simple">
            <thead><tr><th>Tournament</th><th>Category</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {backspin.map((r) => (
                <tr key={r.registration_id}>
                  <td><Link href={`/applications/${r.registration_id}`}>{r.tournaments?.name}</Link></td>
                  <td>{r.divisions?.name}</td>
                  <td>{fmtDate(r.tournaments?.start_at)}</td>
                  <td><span className={`badge ${statusColor(r.registration_status)}`}>{STATUS_LABEL[r.registration_status] ?? r.registration_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No Backspin tournaments yet.</p>
        )}
      </div>

      <div className="card wide">
        <h2 style={{ marginTop: 0 }}>External Tournaments</h2>
        {external.length ? (
          <table className="table-simple">
            <thead><tr><th>Tournament</th><th>Year</th><th>Format</th><th>Level</th><th>Result</th></tr></thead>
            <tbody>
              {external.map((h) => (
                <tr key={h.external_history_id}>
                  <td>{h.tournament_name}{h.partner_name ? <div className="small muted">with {h.partner_name}</div> : null}</td>
                  <td>{h.tournament_year ?? "—"}</td>
                  <td>{h.format}</td>
                  <td>{h.level ?? "—"}</td>
                  <td>{h.result ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No external tournament history. You can add it when registering for a tournament.</p>
        )}
      </div>
    </PlayerShell>
  );
}
