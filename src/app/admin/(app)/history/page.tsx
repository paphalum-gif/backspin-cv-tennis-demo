import { requireAdmin } from "@/lib/admin/server";

type Row = {
  external_history_id: string;
  tournament_name: string | null;
  tournament_year: number | null;
  format: string | null;
  level: number | null;
  result: string | null;
  partner_name: string | null;
  players: { name: string | null } | null;
};

export default async function HistoryPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("external_tournament_history")
    .select("*,players(name)")
    .order("tournament_year", { ascending: false });
  if (error) throw error;
  const rows = (data || []) as Row[];

  return (
    <>
      <div className="top">
        <div>
          <h1>Player History</h1>
          <div className="muted">External tournament history and Backspin Champion records.</div>
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Player</th><th>Tournament</th><th>Year</th><th>Format</th><th>Level</th><th>Result</th><th>Partner</th></tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((h) => (
                  <tr key={h.external_history_id}>
                    <td>{h.players?.name || "—"}</td>
                    <td>{h.tournament_name || "—"}</td>
                    <td>{h.tournament_year ?? "—"}</td>
                    <td>{h.format || "—"}</td>
                    <td>{h.level ?? "—"}</td>
                    <td>{h.result || "—"}</td>
                    <td>{h.partner_name || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="empty">No external tournament history.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
