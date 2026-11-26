import PlayerShell from "@/components/PlayerShell";
import { requirePlayer } from "@/lib/current-player";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const { user, player } = await requirePlayer();
  return (
    <PlayerShell>
      <div className="eyebrow">SET UP YOUR PROFILE · 1/2</div>
      <h1>Create your Backspin Profile</h1>
      <p className="muted">
        Complete your player details once. Your profile will be reused for future tournaments.
      </p>
      <section className="card wide">
        <div className="notice">
          LINE account connected. Your profile is separate from each tournament registration.
        </div>
        <ProfileForm player={player} fallbackEmail={user.email ?? null} />
      </section>
    </PlayerShell>
  );
}
