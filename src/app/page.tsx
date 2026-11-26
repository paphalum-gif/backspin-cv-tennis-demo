import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensurePlayer, isProfileComplete, type Player } from "@/lib/players";
import PlayerShell from "@/components/PlayerShell";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let player: Player;
  try {
    player = await ensurePlayer(supabase, user);
  } catch (e) {
    return (
      <main className="wrap">
        <section className="card narrow center">
          <h1>Signed in with LINE</h1>
          <div className="notice red">
            Authentication succeeded, but Backspin could not finish loading your player account.{" "}
            {e instanceof Error ? e.message : String(e)}
          </div>
        </section>
      </main>
    );
  }

  if (!isProfileComplete(player)) redirect("/profile");

  return (
    <PlayerShell>
      <div className="hero">
        <div className="eyebrow">BACKSPIN PLAYER</div>
        <h1>Welcome, {String(player.nickname || player.name || "")}.</h1>
        <p>Your profile is ready. Browse tournaments and register for the competitions you want to play.</p>
        <div className="inline-actions">
          <Link className="btn light" href="/tournaments">View Tournaments</Link>
          <Link className="btn secondary" href="/applications">My Applications</Link>
        </div>
      </div>
      <div className="cards2">
        <div className="card">
          <div className="eyebrow">PROFILE</div>
          <h2>My Profile</h2>
          <p className="muted">Personal details and skill profile.</p>
          <Link className="btn secondary" href="/profile">Open Profile</Link>
        </div>
        <div className="card">
          <div className="eyebrow">HISTORY</div>
          <h2>Tournament History</h2>
          <p className="muted">View your past tournament results.</p>
          <Link className="btn secondary" href="/history">View History</Link>
        </div>
      </div>
      <form action="/auth/signout" method="post" style={{ marginTop: 24 }}>
        <button className="btn secondary" type="submit">Sign out</button>
      </form>
    </PlayerShell>
  );
}
