"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Registration } from "@/lib/admin/types";

export default function ReviewActions({ registration: a, backHref }: { registration: Registration; backHref: string }) {
  const router = useRouter();
  const [note, setNote] = useState(a.admin_note ?? "");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = a.registration_status;

  async function run(fn: (db: ReturnType<typeof createClient>) => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    const { error } = await fn(createClient());
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push(backHref);
    router.refresh();
  }

  const now = () => new Date().toISOString();

  const confirm = () =>
    run((db) =>
      db
        .from("registrations")
        .update({
          registration_status: "CONFIRMED",
          payment_status: a.payment_status === "PAYMENT_SUBMITTED" ? "PAID" : a.payment_status,
          confirmed_at: now(),
          admin_note: note || null,
          updated_at: now(),
        })
        .eq("registration_id", a.registration_id),
    );

  const reject = () => {
    if (!reason.trim()) {
      setError("Please enter a reason for rejection.");
      return;
    }
    return run((db) =>
      db
        .from("registrations")
        .update({ registration_status: "REJECTED", reject_reason: reason.trim(), admin_note: note || null, updated_at: now() })
        .eq("registration_id", a.registration_id),
    );
  };

  const release = () =>
    run(async (db) => {
      const r = await db
        .from("registrations")
        .update({ registration_status: "PAYMENT_REQUIRED", payment_status: "PENDING", admin_note: note || null, updated_at: now() })
        .eq("registration_id", a.registration_id);
      if (r.error) return r;
      const {
        data: { user },
      } = await db.auth.getUser();
      return db
        .from("waiting_list_entries")
        .update({ state: "RELEASED", released_at: now(), released_by: user?.id ?? null })
        .eq("registration_id", a.registration_id);
    });

  const canReject = ["SUBMITTED", "PAYMENT_REQUIRED", "PAYMENT_SUBMITTED", "WAITING_LIST"].includes(status);

  return (
    <>
      <div className="card">
        <h2>Actions</h2>
        <div className="actions stack">
          {status === "PAYMENT_SUBMITTED" && (
            <button className="btn" onClick={confirm} disabled={busy}>
              Confirm Payment / Application
            </button>
          )}
          {status === "WAITING_LIST" && (
            <>
              <button className="btn" onClick={release} disabled={busy}>
                Release Slot
              </button>
              <button className="btn ghost" onClick={() => router.push(backHref)} disabled={busy}>
                Keep on Waiting List
              </button>
            </>
          )}
          {canReject && !rejecting && (
            <button className="btn danger" onClick={() => setRejecting(true)} disabled={busy}>
              Reject Application
            </button>
          )}
          {!canReject && status !== "PAYMENT_SUBMITTED" && <p className="muted">No actions for {status.replaceAll("_", " ")}.</p>}
        </div>
        {rejecting && (
          <div style={{ marginTop: 14 }}>
            <label className="field">
              <span>Reason for rejection *</span>
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </label>
            <div className="actions">
              <button className="btn ghost" onClick={() => setRejecting(false)} disabled={busy}>
                Cancel
              </button>
              <button className="btn danger" onClick={reject} disabled={busy}>
                Confirm Reject
              </button>
            </div>
          </div>
        )}
        {error && <div className="notice red">{error}</div>}
      </div>
      <div className="card">
        <h2>Admin Note</h2>
        <textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="muted small">Saved with the next action.</p>
      </div>
    </>
  );
}
