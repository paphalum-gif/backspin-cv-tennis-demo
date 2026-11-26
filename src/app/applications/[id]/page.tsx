import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerShell from "@/components/PlayerShell";
import { requirePlayer } from "@/lib/current-player";
import { money } from "@/lib/admin/types";
import { MY_REGISTRATION_SELECT, type MyRegistration } from "@/lib/my-registrations";
import { STATUS_LABEL, fmtDateTime, statusColor } from "@/lib/tournaments";
import PaymentForm from "./PaymentForm";

const STEPS = [
  { key: "submitted", title: "Application submitted", sub: "Registration details received" },
  { key: "payment", title: "Payment slip submitted", sub: "Payment is ready for verification" },
  { key: "review", title: "Admin review", sub: "Admin reviews your application and payment" },
  { key: "confirmed", title: "Confirmed", sub: "You'll be notified after approval" },
];
const PROGRESS: Record<string, number> = { PAYMENT_REQUIRED: 1, PAYMENT_SUBMITTED: 2, CONFIRMED: 4 };

export default async function ApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const [{ id }, { new: isNew }] = await Promise.all([params, searchParams]);
  const { supabase, player } = await requirePlayer();
  const { data, error } = await supabase
    .from("registrations")
    .select(MY_REGISTRATION_SELECT)
    .eq("registration_id", id)
    .eq("main_player_id", player.player_id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const a = data as unknown as MyRegistration;
  const s = a.registration_status;

  let qrUrl: string | null = null;
  if (s === "PAYMENT_REQUIRED" && a.tournaments?.payment_qr_path) {
    const signed = await supabase.storage.from("payment-slips").createSignedUrl(a.tournaments.payment_qr_path, 3600);
    qrUrl = signed.data?.signedUrl ?? null;
  }

  const done = PROGRESS[s] ?? 0;

  return (
    <PlayerShell>
      {isNew && (
        <div className="notice green" style={{ marginTop: 0 }}>
          Your application is in. This category has its own eligibility, capacity, payment and application status.
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <span className={`badge ${statusColor(s)}`}>{(STATUS_LABEL[s] ?? s).toUpperCase()}</span>
        <h1>{a.divisions?.name}</h1>
        <p className="muted">{a.tournaments?.name} · {money(a.divisions?.fee)}{a.divisions?.format === "DOUBLES" ? " / pair" : ""}</p>
      </div>

      {s === "PAYMENT_REQUIRED" && (
        <div className="cards2">
          <div className="card center">
            <h2 style={{ marginTop: 0 }}>Tournament Payment QR</h2>
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="qr" src={qrUrl} alt="Payment QR code" />
            ) : (
              <p className="muted">QR code not available. Please contact the organizer.</p>
            )}
            <b>{a.tournaments?.payment_account_name || "Backspin Tennis Club"}</b>
            <p className="muted">Amount: {money(a.divisions?.fee)}</p>
            <div className="notice yellow">Payment deadline: {fmtDateTime(a.tournaments?.payment_deadline_at)}</div>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Upload Payment Slip</h2>
            <PaymentForm registrationId={a.registration_id} />
          </div>
        </div>
      )}

      {s === "WAITING_LIST" && (
        <div className="card wide">
          <h2 style={{ marginTop: 0 }}>Your application is on the waiting list.</h2>
          <p className="muted">
            This category is currently full. You do not need to pay or upload a payment slip. Admin will notify you if a place becomes
            available.
          </p>
          <div className="notice">Queue position is not displayed.</div>
        </div>
      )}

      {s === "REJECTED" && (
        <div className="card wide">
          <h2 style={{ marginTop: 0 }}>Application not accepted</h2>
          <div className="notice red">{a.reject_reason || a.eligibility_reason || "Please contact the organizer for details."}</div>
        </div>
      )}

      {s === "CONFIRMED" && (
        <div className="card wide">
          <h2 style={{ marginTop: 0 }}>You&apos;re in.</h2>
          <div className="notice green">Payment verified and application confirmed by Admin.</div>
        </div>
      )}

      {["PAYMENT_REQUIRED", "PAYMENT_SUBMITTED", "CONFIRMED"].includes(s) && (
        <div className="card wide">
          <div className="steps">
            {STEPS.map((st, i) => (
              <div key={st.key} className={i < done ? "done" : i === done ? "current" : ""}>
                <i>{i < done ? "✓" : i + 1}</i>
                <div><b>{st.title}</b><small className="muted">{st.sub}</small></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card wide">
        <h2 style={{ marginTop: 0 }}>Details</h2>
        <div className="kv"><span>Eligibility</span><span>{a.eligibility_result ?? "—"}</span></div>
        <div className="kv"><span>Payment</span><span>{a.payment_status ?? "—"}</span></div>
        <div className="kv"><span>Partner</span><span>{a.application_snapshot?.partner?.name || "Not applicable"}</span></div>
        <div className="kv"><span>Preferred date</span><span>{a.application_snapshot?.preferred_competition_date || "—"}</span></div>
        <div className="kv"><span>Submitted</span><span>{fmtDateTime(a.submitted_at)}</span></div>
      </div>

      <div className="inline-actions">
        <Link className="btn secondary" href="/applications">My Applications</Link>
        <Link className="btn secondary" href={`/tournaments/${a.tournament_id}`}>Register another category</Link>
      </div>
    </PlayerShell>
  );
}
