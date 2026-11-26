"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Division, Tournament } from "@/lib/admin/types";

const LEVELS = ["3.0", "3.5", "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5", "10.0"];
const STATUSES = ["Draft", "Open", "Closed", "Completed"];

type CategoryRow = {
  key: string;
  division_id?: string;
  name: string;
  format: "SINGLES" | "DOUBLES";
  level: string;
  fee: number;
  capacity: number;
  is_open: boolean;
};

let keySeq = 0;
const newKey = () => `row-${++keySeq}`;

/** datetime-local wants local time "YYYY-MM-DDTHH:mm", not UTC ISO. */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDivision(d: Division): CategoryRow {
  return {
    key: newKey(),
    division_id: d.division_id,
    name: d.name,
    format: d.format,
    level: Number(d.level).toFixed(1),
    fee: Number(d.fee),
    capacity: Number(d.capacity),
    is_open: d.is_open !== false,
  };
}

const defaultRow = (name = "Men's Singles 3.5", level = "3.5"): CategoryRow => ({
  key: newKey(),
  name,
  format: "SINGLES",
  level,
  fee: 1490,
  capacity: 32,
  is_open: true,
});

export default function TournamentForm({ tournament, divisions }: { tournament?: Tournament; divisions?: Division[] }) {
  const router = useRouter();
  const editing = Boolean(tournament);
  const [rows, setRows] = useState<CategoryRow[]>(
    divisions && divisions.length ? divisions.map(fromDivision) : [defaultRow()],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, patch: Partial<CategoryRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function addCategory() {
    const used = rows.map((r) => r.name.trim());
    let n = 1;
    let name = "New Category";
    while (used.includes(name)) name = `New Category ${++n}`;
    setRows((rs) => [...rs, defaultRow(name, "3.0")]);
  }

  function readTournament(f: FormData) {
    const val = (k: string) => String(f.get(k) ?? "").trim();
    if (!val("name")) throw new Error("Tournament name is required.");
    const dateKeys = ["start_at", "end_at", "registration_open_at", "registration_close_at", "payment_deadline_at"];
    const dates: Record<string, Date> = {};
    for (const k of dateKeys) {
      if (!val(k)) throw new Error("Please complete all tournament dates and deadlines.");
      dates[k] = new Date(val(k));
      if (Number.isNaN(dates[k].getTime())) throw new Error("Please enter valid tournament dates.");
    }
    if (dates.start_at > dates.end_at) throw new Error("Tournament start must be before end.");
    if (dates.registration_open_at > dates.registration_close_at) {
      throw new Error("Registration open must be before close.");
    }
    return {
      name: val("name"),
      venue: val("venue") || null,
      ...Object.fromEntries(dateKeys.map((k) => [k, dates[k].toISOString()])),
      status: val("status") || "Draft",
      description_th: val("description_th") || null,
      description_en: val("description_en") || null,
      payment_account_name: val("payment_account_name") || null,
      rules_th: val("rules_th") || null,
      rules_en: val("rules_en") || null,
    };
  }

  function validRows() {
    const clean = rows
      .map((r, i) => ({ ...r, name: r.name.trim(), sort_order: i }))
      .filter((r) => r.name);
    if (!clean.length) throw new Error("Add at least one category.");
    const seen = new Set<string>();
    for (const r of clean) {
      if (!Number.isFinite(r.fee) || !Number.isFinite(r.capacity) || r.capacity < 1) {
        throw new Error("Each category needs a name, valid level, fee and capacity.");
      }
      const k = `${r.name.toLowerCase()}|${r.level}`;
      if (seen.has(k)) throw new Error("Duplicate category name + level. Please rename one of the categories.");
      seen.add(k);
    }
    return clean;
  }

  const divisionPayload = (r: CategoryRow & { sort_order: number }) => ({
    name: r.name,
    gender_category: "OPEN",
    format: r.format,
    level: Number(r.level),
    fee: r.fee,
    capacity: r.capacity,
    is_open: r.is_open,
    sort_order: r.sort_order,
    updated_at: new Date().toISOString(),
  });

  async function uploadQr(db: ReturnType<typeof createClient>, tournamentId: string, file: File | null) {
    if (!file) return;
    const path = `tournaments/${tournamentId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await db.storage.from("payment-slips").upload(path, file, { upsert: true });
    if (up.error) throw up.error;
    const ur = await db.from("tournaments").update({ payment_qr_path: path }).eq("tournament_id", tournamentId);
    if (ur.error) throw ur.error;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const qr = f.get("payment_qr");
    const qrFile = qr instanceof File && qr.size > 0 ? qr : null;
    const db = createClient();
    let createdId: string | null = null;

    try {
      const t = readTournament(f);
      const cats = validRows();

      if (tournament) {
        const id = tournament.tournament_id;
        const up = await db.from("tournaments").update({ ...t, updated_at: new Date().toISOString() }).eq("tournament_id", id);
        if (up.error) throw up.error;

        const existing = await db.from("divisions").select("division_id").eq("tournament_id", id);
        if (existing.error) throw existing.error;
        const keptIds = cats.filter((r) => r.division_id).map((r) => r.division_id);

        // Rename first so the (tournament, name, level) unique key does not block swaps.
        for (const old of existing.data || []) {
          const rr = await db
            .from("divisions")
            .update({ name: `__editing__${old.division_id}` })
            .eq("division_id", old.division_id);
          if (rr.error) throw rr.error;
        }
        for (const r of cats) {
          const rr = r.division_id
            ? await db.from("divisions").update(divisionPayload(r)).eq("division_id", r.division_id).eq("tournament_id", id)
            : await db.from("divisions").insert({ ...divisionPayload(r), tournament_id: id });
          if (rr.error) throw rr.error;
        }
        // Removed categories: close them if anyone registered, otherwise delete.
        for (const old of existing.data || []) {
          if (keptIds.includes(old.division_id)) continue;
          const cnt = await db
            .from("registrations")
            .select("registration_id", { count: "exact", head: true })
            .eq("division_id", old.division_id);
          if (cnt.error) throw cnt.error;
          const rr =
            (cnt.count || 0) > 0
              ? await db.from("divisions").update({ is_open: false, updated_at: new Date().toISOString() }).eq("division_id", old.division_id)
              : await db.from("divisions").delete().eq("division_id", old.division_id);
          if (rr.error) throw rr.error;
        }
        await uploadQr(db, id, qrFile);
      } else {
        const {
          data: { user },
        } = await db.auth.getUser();
        const cr = await db.from("tournaments").insert({ ...t, created_by: user?.id ?? null }).select("tournament_id").single();
        if (cr.error) throw cr.error;
        createdId = cr.data.tournament_id as string;
        const dr = await db.from("divisions").insert(
          cats.map((r) => ({ ...divisionPayload(r), tournament_id: createdId })),
        );
        if (dr.error) throw dr.error;
        await uploadQr(db, createdId, qrFile);
      }
      router.push("/admin/tournaments");
      router.refresh();
    } catch (err) {
      if (createdId) await db.from("tournaments").delete().eq("tournament_id", createdId);
      setError(err instanceof Error ? err.message : "Could not save tournament.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="top">
        <div>
          <h1>{editing ? "Edit Tournament" : "Create Tournament"}</h1>
          <div className="muted">Create a reusable tournament and configure each category independently.</div>
        </div>
        <Link className="btn ghost" href="/admin/tournaments">
          Cancel
        </Link>
      </div>

      <div className="card">
        <div className="eyebrow">STEP 1 OF 3</div>
        <h2>Tournament Details</h2>
        <div className="grid2">
          <Input label="Tournament Name" name="name" defaultValue={tournament?.name ?? "Backspin Tennis Tournament"} />
          <Input label="Venue" name="venue" defaultValue={tournament?.venue ?? "CV Tennis Sport"} />
          <Input label="Start Date & Time" name="start_at" type="datetime-local" defaultValue={toLocalInput(tournament?.start_at)} />
          <Input label="End Date & Time" name="end_at" type="datetime-local" defaultValue={toLocalInput(tournament?.end_at)} />
          <Input label="Registration Open" name="registration_open_at" type="datetime-local" defaultValue={toLocalInput(tournament?.registration_open_at)} />
          <Input label="Registration Close" name="registration_close_at" type="datetime-local" defaultValue={toLocalInput(tournament?.registration_close_at)} />
          <Input label="Payment Deadline" name="payment_deadline_at" type="datetime-local" defaultValue={toLocalInput(tournament?.payment_deadline_at)} />
          <label className="field">
            <span>Tournament Status</span>
            <select name="status" defaultValue={tournament?.status ?? "Draft"}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <Area label="Description (Thai)" name="description_th" defaultValue={tournament?.description_th} />
          <Area label="Description (English)" name="description_en" defaultValue={tournament?.description_en} />
        </div>
      </div>

      <div className="card">
        <div className="eyebrow">STEP 2 OF 3</div>
        <div className="top">
          <div>
            <h2>Categories &amp; Capacity</h2>
            <div className="notice">Singles = players · Doubles = pairs. Each category has its own fee and capacity.</div>
          </div>
          <button className="btn secondary" type="button" onClick={addCategory}>
            + Add Category
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Format</th>
                <th>Level</th>
                <th>Fee</th>
                <th>Max</th>
                <th>Open</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>
                    <input value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} />
                  </td>
                  <td>
                    <select value={r.format} onChange={(e) => update(r.key, { format: e.target.value as CategoryRow["format"] })}>
                      <option value="SINGLES">Singles</option>
                      <option value="DOUBLES">Doubles</option>
                    </select>
                  </td>
                  <td>
                    <select value={r.level} onChange={(e) => update(r.key, { level: e.target.value })}>
                      {LEVELS.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="number" min={0} value={r.fee} onChange={(e) => update(r.key, { fee: Number(e.target.value) })} />
                  </td>
                  <td>
                    <input type="number" min={1} value={r.capacity} onChange={(e) => update(r.key, { capacity: Number(e.target.value) })} />
                  </td>
                  <td>
                    <input type="checkbox" checked={r.is_open} onChange={(e) => update(r.key, { is_open: e.target.checked })} />
                  </td>
                  <td>
                    <button className="btn ghost" type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="eyebrow">STEP 3 OF 3</div>
        <h2>Payment, Rules &amp; Registration</h2>
        <div className="grid2">
          <Input label="Payment Account Name" name="payment_account_name" defaultValue={tournament?.payment_account_name ?? "Backspin Tennis Club"} />
          <label className="field">
            <span>Tournament Payment QR</span>
            <input name="payment_qr" type="file" accept="image/*,.pdf" />
            {tournament?.payment_qr_path && <small className="muted">QR on file. Choose a new one to replace it.</small>}
          </label>
          <Area label="Rules (Thai)" name="rules_th" rows={6} defaultValue={tournament?.rules_th} />
          <Area label="Rules (English)" name="rules_en" rows={6} defaultValue={tournament?.rules_en} />
        </div>
        {error && <div className="notice red">{error}</div>}
        <div className="actions">
          <Link className="btn ghost" href="/admin/tournaments">
            Cancel
          </Link>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save Changes" : "Create Tournament"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

function Area({
  label,
  defaultValue,
  ...props
}: { label: string; defaultValue?: string | null } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "defaultValue">) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={4} defaultValue={defaultValue ?? ""} {...props} />
    </label>
  );
}
