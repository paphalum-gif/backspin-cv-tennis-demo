import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadTournamentData } from "@/lib/admin/server";

const cell = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const t = new URL(request.url).searchParams.get("t");
  if (!t) return NextResponse.json({ error: "Missing tournament" }, { status: 400 });

  const { registrations } = await loadTournamentData(supabase, t);
  const header = ["registration_id", "player", "phone", "email", "category", "eligibility", "payment", "status", "submitted_at"];
  const lines = [header.join(",")].concat(
    registrations.map((a) =>
      [
        a.registration_id,
        a.players?.name,
        a.players?.phone,
        a.players?.email,
        a.divisions?.name,
        a.eligibility_result,
        a.payment_status,
        a.registration_status,
        a.submitted_at,
      ]
        .map(cell)
        .join(","),
    ),
  );
  // BOM so Excel opens Thai names correctly.
  return new NextResponse("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="backspin-registrations-${t}.csv"`,
    },
  });
}
