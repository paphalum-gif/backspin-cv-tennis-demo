import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/server";
import type { Registration } from "@/lib/admin/types";
import { EligibilityBadge, StatusBadge } from "../../StatusBadge";
import ReviewActions from "./ReviewActions";

type HistoryItem = { tournament_name?: string; tournament_year?: number; format?: string; level?: number; result?: string; partner_name?: string };

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("registrations")
    .select("*,players(name,email,phone),divisions(name,format,level,fee)")
    .eq("registration_id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const a = data as Registration;

  const slip = await supabase
    .from("payment_submissions")
    .select("slip_storage_path,slip_reference,uploaded_at")
    .eq("registration_id", id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const slipPath = slip.data?.slip_storage_path as string | undefined;
  const slipUrl = slipPath
    ? (await supabase.storage.from("payment-slips").createSignedUrl(slipPath, 600)).data?.signedUrl
    : null;

  const history = (Array.isArray(a.external_history_snapshot) ? a.external_history_snapshot : []) as HistoryItem[];
  const back = a.registration_status === "WAITING_LIST" ? "/admin/waiting" : "/admin/applications";
  const backHref = `${back}?t=${t ?? a.tournament_id}`;

  return (
    <>
      <div className="top">
        <div>
          <h1>Application Review</h1>
          <div className="muted">Applicant, eligibility, history and payment review</div>
        </div>
        <Link className="btn ghost" href={backHref}>
          Back
        </Link>
      </div>
      <div className="detail">
        <div>
          <div className="card">
            <div className="row"><b>Player</b><span>{a.players?.name || "—"}</span></div>
            <div className="row"><b>Phone</b><span>{a.players?.phone || "—"}</span></div>
            <div className="row"><b>Email</b><span>{a.players?.email || "—"}</span></div>
            <div className="row"><b>Category</b><span>{a.divisions?.name || "—"}</span></div>
            <div className="row"><b>Level</b><span>{a.divisions?.level ?? "—"}</span></div>
            <div className="row"><b>Status</b><StatusBadge value={a.registration_status} /></div>
            <div className="row"><b>Payment</b><span>{a.payment_status || "—"}</span></div>
            <div className="row"><b>Partner</b><span>{a.application_snapshot?.partner?.name || "—"}</span></div>
            {a.reject_reason && <div className="row"><b>Reject reason</b><span>{a.reject_reason}</span></div>}
          </div>
          <div className="card">
            <h2>Eligibility</h2>
            <EligibilityBadge value={a.eligibility_result} />
            <p className="muted">{a.eligibility_reason || "—"}</p>
          </div>
          <div className="card">
            <h2>Player History</h2>
            {history.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Tournament</th><th>Year</th><th>Format</th><th>Level</th><th>Result</th><th>Partner</th></tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td>{h.tournament_name || "—"}</td>
                        <td>{h.tournament_year ?? "—"}</td>
                        <td>{h.format || "—"}</td>
                        <td>{h.level ?? "—"}</td>
                        <td>{h.result || "—"}</td>
                        <td>{h.partner_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No external tournament history.</p>
            )}
          </div>
        </div>
        <div>
          <div className="card">
            <h2>Payment</h2>
            <div className="notice">
              {a.payment_status === "PAYMENT_SUBMITTED"
                ? "Payment slip submitted and ready for verification."
                : "No payment slip submitted."}
            </div>
            {slipUrl && (
              <a href={slipUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="slip" src={slipUrl} alt="Payment slip" />
              </a>
            )}
            {slip.data?.slip_reference && <p className="muted small">Reference: {slip.data.slip_reference as string}</p>}
          </div>
          <ReviewActions registration={a} backHref={backHref} />
        </div>
      </div>
    </>
  );
}
