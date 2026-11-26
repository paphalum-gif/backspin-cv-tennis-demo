import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensurePlayer, isProfileComplete, type Player } from "@/lib/players";

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
    <main className="wrap">
      <section className="card narrow">
        <div className="eyebrow">BACKSPIN</div>
        <h1>Hi, {player.name}</h1>
        <p className="muted">Your profile is complete. Tournaments are coming next.</p>
        <Link className="btn secondary" href="/profile">
          Edit profile
        </Link>
        <form action="/auth/signout" method="post">
          <button className="btn secondary" type="submit">
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
