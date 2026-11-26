import { notFound, redirect } from "next/navigation";
import PlayerShell from "@/components/PlayerShell";
import { requirePlayer } from "@/lib/current-player";
import { isProfileComplete } from "@/lib/players";
import { getTournament, isRegistrationOpen } from "@/lib/tournaments";
import RegisterWizard, { type HistoryRow } from "./RegisterWizard";

export default async function RegisterPage({ params }: { params: Promise<{ id: string; divisionId: string }> }) {
  const { id, divisionId } = await params;
  const { supabase, player } = await requirePlayer();
  if (!isProfileComplete(player)) redirect("/profile");

  const data = await getTournament(supabase, id);
  if (!data) notFound();
  const division = data.divisions.find((d) => d.division_id === divisionId);
  if (!division || !division.is_open || !isRegistrationOpen(data.tournament)) redirect(`/tournaments/${id}`);

  const { data: existing } = await supabase
    .from("registrations")
    .select("registration_id")
    .eq("main_player_id", player.player_id)
    .eq("division_id", divisionId)
    .neq("registration_status", "REJECTED")
    .maybeSingle();
  if (existing) redirect(`/applications/${existing.registration_id}`);

  const { data: history } = await supabase
    .from("external_tournament_history")
    .select("external_history_id,tournament_name,tournament_year,format,level,result,partner_name")
    .eq("player_id", player.player_id)
    .order("tournament_year", { ascending: false });

  return (
    <PlayerShell>
      <RegisterWizard
        tournament={data.tournament}
        division={division}
        player={player}
        initialHistory={(history || []) as HistoryRow[]}
      />
    </PlayerShell>
  );
}
