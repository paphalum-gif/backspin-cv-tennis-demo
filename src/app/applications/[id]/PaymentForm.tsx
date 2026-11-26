"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;

export default function PaymentForm({ registrationId }: { registrationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const file = f.get("slip");
    if (!(file instanceof File) || file.size === 0) return setError("Please upload a payment slip.");
    if (file.size > MAX_BYTES) return setError("The file is larger than 10 MB.");
    setBusy(true);
    setError(null);
    const db = createClient();
    const path = `${registrationId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await db.storage.from("payment-slips").upload(path, file, { upsert: false });
    if (up.error) {
      setError(`Could not upload payment slip. ${up.error.message}`);
      setBusy(false);
      return;
    }
    const { error } = await db.rpc("submit_payment_slip", {
      p_registration_id: registrationId,
      p_slip_path: path,
      p_reference: String(f.get("reference") || ""),
    });
    if (error) {
      setError(`Could not submit payment slip. ${error.message}`);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <label className="field">
        <span>Payment Slip *</span>
        <input type="file" name="slip" accept="image/*,.pdf" required />
      </label>
      <label className="field" style={{ marginTop: 12 }}>
        <span>Reference (optional)</span>
        <input name="reference" placeholder="Transfer reference or note" />
      </label>
      <div className="notice">Admin will review your player details, eligibility, history, category and payment slip together.</div>
      {error && <div className="notice red">{error}</div>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit Payment Slip"}</button>
    </form>
  );
}
