"use client";

import { useState } from "react";
import Link from "next/link";
import { REGISTRATION_STATUSES, type Registration } from "@/lib/admin/types";
import { EligibilityBadge, StatusBadge } from "../StatusBadge";

export default function ApplicationTable({
  registrations,
  tournamentId,
}: {
  registrations: Registration[];
  tournamentId?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const q = query.toLowerCase();
  const rows = registrations.filter(
    (a) =>
      (!status || a.registration_status === status) &&
      (!q || `${a.players?.name ?? ""} ${a.divisions?.name ?? ""}`.toLowerCase().includes(q)),
  );

  return (
    <>
      <div className="toolbar">
        <input placeholder="Search player or category" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {REGISTRATION_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Category</th>
                <th>Eligibility</th>
                <th>Payment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((a) => (
                  <tr key={a.registration_id}>
                    <td>
                      <b>{a.players?.name || "—"}</b>
                      <div className="muted small">{a.players?.phone || ""}</div>
                    </td>
                    <td>{a.divisions?.name || "—"}</td>
                    <td>
                      <EligibilityBadge value={a.eligibility_result} />
                    </td>
                    <td>{a.payment_status || "—"}</td>
                    <td>
                      <StatusBadge value={a.registration_status} />
                    </td>
                    <td>
                      <Link
                        className="btn secondary"
                        href={`/admin/applications/${a.registration_id}${tournamentId ? `?t=${tournamentId}` : ""}`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty">
                    No applications.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
