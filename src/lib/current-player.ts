import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensurePlayer } from "@/lib/players";

/** For server pages behind login: returns the signed-in user and their player row. */
export async function requirePlayer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const player = await ensurePlayer(supabase, user);
  return { supabase, user, player };
}
