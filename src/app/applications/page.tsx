import Link from "next/link";
import PlayerShell from "@/components/PlayerShell";
import { requirePlayer } from "@/lib/current-player";
import { money } from "@/lib/admin/types";
import { MY_REGISTRATION_SELECT, type MyRegistration } from "@/lib/my-registrations";
import { STATUS_LABEL, fmtDate, statusColor } from "@/lib/tournaments";

const CTA: Record<string, string> = {
  PAYMENT_REQUIRED: "Pay Now",
  WAITING_LIST: "View Waiting List",
};

export default async function ApplicationsPage() {
  const { supabase, player } = await requirePlayer();
  const { data, error } = await supabase
    .from("registrations")
    .select(MY_REGISTRATION_SELECT)
    .eq("main_player_id", player.player_id)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  const apps = (data || []) as unknown as MyRegistration[];

  return (
    <PlayerShell>
      <div className="eyebrow">MY APPLICATIONS</div>
      <h1>My Applications</h1>
      <p className="muted">Each category is tracked independently.</p>
      <div className="stack">
        {apps.length ? (
          apps.map((a) => (
            <Link key={a.registration_id} href={`/applications/${a.registration_id}`} className="card card-link">
              <div className="category-foot">
                <div>
                  <h2 style={{ margin: "0 0 4px" }}>{a.divisions?.name ?? "Registration"}</h2>
                  <div className="muted small">
                    {a.tournaments?.name} · {money(a.divisions?.fee)} · Submitted {fmtDate(a.submitted_at)}
                  </div>
                </div>
                <span className={`badge ${statusColor(a.registration_status)}`}>
                  {STATUS_LABEL[a.registration_status] ?? a.registration_status}
                </span>
              </div>
              {CTA[a.registration_status] && <div className="btn" style={{ marginTop: 14 }}>{CTA[a.registration_status]}</div>}
            </Link>
          ))
        ) : (
          <div className="card center">
            <h2>No applications yet</h2>
            <Link className="btn" href="/tournaments">View Tournaments</Link>
          </div>
        )}
      </div>
      <div className="notice">
        Waiting List applications do not require payment. If a slot opens, Admin releases the application and you will be asked to
        pay. Queue position is not displayed.
      </div>
    </PlayerShell>
  );
}
