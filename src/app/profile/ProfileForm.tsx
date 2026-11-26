"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/lib/players";
import { EXPERIENCE, GENDERS, experienceLabel, experienceYears } from "@/lib/profile-options";

const s = (v: unknown) => (typeof v === "string" ? v : "");

export default function ProfileForm({ player, fallbackEmail }: { player: Player; fallbackEmail: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "").trim() || null;
    const photo = f.get("photo");
    const file = photo instanceof File && photo.size > 0 ? photo : null;

    try {
      if (!player.profile_photo_path && !file) {
        throw new Error("Please upload a profile photo before continuing.");
      }
      const db = createClient();
      const update: Record<string, unknown> = {
        name: text("name"),
        nickname: text("nickname"),
        phone: text("phone"),
        email: text("email") || fallbackEmail,
        date_of_birth: text("date_of_birth"),
        gender: text("gender"),
        occupation: text("occupation"),
        line_id: text("line_id"),
        instagram_id: text("instagram_id"),
        regular_tennis_court: text("regular_tennis_court"),
        tennis_experience_years: experienceYears(String(f.get("experience") ?? "")),
        medical_condition: text("medical_condition"),
        emergency_contact_name: text("emergency_contact_name"),
        emergency_contact_phone: text("emergency_contact_phone"),
        updated_at: new Date().toISOString(),
      };
      if (file) {
        const path = `${player.player_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const up = await db.storage.from("profile-photos").upload(path, file, { upsert: true });
        if (up.error) throw up.error;
        update.profile_photo_path = path;
      }
      const { error } = await db.from("players").update(update).eq("player_id", player.player_id);
      if (error) throw error;
      router.push("/profile/skill");
      router.refresh();
    } catch (err) {
      setError(`Could not save your profile. ${err instanceof Error ? err.message : String(err)}`);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2>Personal Details</h2>
      <div className="grid">
        <Field label="Name–Surname *" name="name" defaultValue={s(player.name)} required />
        <Field label="Nickname" name="nickname" defaultValue={s(player.nickname)} />
        <Field label="Phone *" name="phone" type="tel" defaultValue={s(player.phone)} required />
        <Field label="Email *" name="email" type="email" defaultValue={s(player.email) || fallbackEmail || ""} required />
        <Field label="Date of Birth *" name="date_of_birth" type="date" defaultValue={s(player.date_of_birth)} required />
        <label className="field">
          <span>Gender *</span>
          <select name="gender" defaultValue={s(player.gender) || GENDERS[0]} required>
            {GENDERS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <Field label="Occupation" name="occupation" defaultValue={s(player.occupation)} />
        <Field label="LINE ID" name="line_id" defaultValue={s(player.line_id)} />
        <Field label="Instagram ID" name="instagram_id" defaultValue={s(player.instagram_id)} />
        <Field label="Regular Tennis Court" name="regular_tennis_court" defaultValue={s(player.regular_tennis_court)} />
        <label className="field">
          <span>Tennis Experience</span>
          <select name="experience" defaultValue={experienceLabel(player.tennis_experience_years as number | null)}>
            {EXPERIENCE.map((x) => (
              <option key={x.label}>{x.label}</option>
            ))}
          </select>
        </label>
        <Field label="Medical Condition(s)" name="medical_condition" defaultValue={s(player.medical_condition)} />
        <Field label="Emergency Contact Name" name="emergency_contact_name" defaultValue={s(player.emergency_contact_name)} />
        <Field label="Emergency Contact No." name="emergency_contact_phone" type="tel" defaultValue={s(player.emergency_contact_phone)} />
        <label className="field">
          <span>Profile Photo {player.profile_photo_path ? "" : "*"}</span>
          <input type="file" name="photo" accept="image/*" />
          <small className="muted">
            {player.profile_photo_path ? "Photo on file. Choose a new one to replace it." : "This photo is used as your tournament photo."}
          </small>
        </label>
      </div>
      {error && <div className="notice red">{error}</div>}
      <div className="actions">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Continue to Skill Profile"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, ...input }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...input} />
    </label>
  );
}
