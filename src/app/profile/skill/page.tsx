import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/current-player";
import { isProfileComplete } from "@/lib/players";
import SkillForm from "./SkillForm";

export default async function SkillPage() {
  const { player } = await requirePlayer();
  if (!isProfileComplete(player)) redirect("/profile");
  return (
    <main className="page">
      <div className="eyebrow">SET UP YOUR PROFILE · 2/2</div>
      <h1>Your Skill Profile</h1>
      <p className="muted">
        Set your current playing profile once. Tournament registration will use this information.
      </p>
      <section className="card wide">
        <SkillForm
          playerId={player.player_id}
          saved={(player.skill_profile as Record<string, string> | null) ?? {}}
        />
      </section>
    </main>
  );
}
