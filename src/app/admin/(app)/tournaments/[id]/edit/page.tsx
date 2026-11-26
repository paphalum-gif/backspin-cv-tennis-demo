import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/server";
import type { Division, Tournament } from "@/lib/admin/types";
import TournamentForm from "../../TournamentForm";

export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [t, d] = await Promise.all([
    supabase.from("tournaments").select("*").eq("tournament_id", id).maybeSingle(),
    supabase.from("divisions").select("*").eq("tournament_id", id).order("sort_order"),
  ]);
  if (t.error) throw t.error;
  if (d.error) throw d.error;
  if (!t.data) notFound();
  return <TournamentForm tournament={t.data as Tournament} divisions={(d.data || []) as Division[]} />;
}
