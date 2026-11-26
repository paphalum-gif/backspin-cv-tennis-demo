import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensurePlayer, isProfileComplete } from "@/lib/players";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let player;
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

  return (
    <main className="wrap">
      <section className="card narrow">
        <div className="eyebrow">BACKSPIN</div>
        <h1>Hi, {player.name}</h1>
        <p className="muted">
          {isProfileComplete(player)
            ? "Your profile is complete."
            : "Please complete your profile before registering."}
        </p>
        <form action="/auth/signout" method="post">
          <button className="btn secondary" type="submit">
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
