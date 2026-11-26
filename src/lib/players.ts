import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Player = {
  player_id: string;
  auth_user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  line_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  [key: string]: unknown;
};

export type LineIdentity = {
  lineId: string | null;
  name: string;
  picture: string | null;
  email: string | null;
};

type Bag = Record<string, string | undefined>;

export function lineIdentity(user: User): LineIdentity {
  const identity = (user.identities || []).find(
    (x) => x.provider === "line" || x.provider === "custom:line",
  );
  const d = (identity?.identity_data || {}) as Bag;
  const m = (user.user_metadata || {}) as Bag;
  return {
    lineId: d.sub || d.userId || m.sub || m.userId || null,
    name: d.name || d.displayName || m.name || m.display_name || m.full_name || user.email || "Backspin Player",
    picture: d.picture || d.pictureUrl || m.picture || m.avatar_url || null,
    email: d.email || user.email || m.email || null,
  };
}

async function syncPlayerIdentity(db: SupabaseClient, player: Player, line: LineIdentity): Promise<Player> {
  if (line.lineId) {
    const { data: identity, error: ie } = await db
      .from("player_identities")
      .select("player_identity_id,player_id")
      .eq("provider", "line")
      .eq("provider_subject", line.lineId)
      .maybeSingle();
    if (ie) throw ie;
    if (identity && identity.player_id !== player.player_id) {
      throw new Error("This LINE account is already linked to another Backspin player.");
    }
    if (!identity) {
      const { error: ce } = await db
        .from("player_identities")
        .insert({ player_id: player.player_id, provider: "line", provider_subject: line.lineId });
      if (ce) throw ce;
    }
  }

  const patch: Partial<Player> = {};
  if (line.lineId && player.line_id !== line.lineId) patch.line_id = line.lineId;
  if (line.email && !player.email) patch.email = line.email;
  if (Object.keys(patch).length === 0) return player;

  const { data, error } = await db
    .from("players")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("player_id", player.player_id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Player;
}

/** Find or create the player row for the signed-in user. Runs under player RLS. */
export async function ensurePlayer(db: SupabaseClient, user: User): Promise<Player> {
  const line = lineIdentity(user);

  const { data: existing, error: ee } = await db
    .from("players")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (ee) throw ee;
  if (existing) return syncPlayerIdentity(db, existing as Player, line);

  if (line.lineId) {
    const { data: byLine, error: le } = await db
      .from("players")
      .select("*")
      .eq("line_id", line.lineId)
      .maybeSingle();
    if (le) throw le;
    if (byLine) {
      if (!byLine.auth_user_id) {
        throw new Error(
          "A Backspin player record exists for this LINE ID but is not linked to an authenticated account. Admin linking is required.",
        );
      }
      if (byLine.auth_user_id !== user.id) {
        throw new Error("This LINE account is already linked to another Backspin player.");
      }
      return syncPlayerIdentity(db, byLine as Player, line);
    }
  }

  const { data, error } = await db
    .from("players")
    .insert({
      auth_user_id: user.id,
      name: line.name,
      email: line.email,
      line_id: line.lineId,
      profile_photo_path: null,
      verification_status: "Unverified",
    })
    .select("*")
    .single();
  if (error) throw error;
  return syncPlayerIdentity(db, data as Player, line);
}

export function isProfileComplete(p: Player) {
  return Boolean(p.phone && p.date_of_birth && p.gender);
}
