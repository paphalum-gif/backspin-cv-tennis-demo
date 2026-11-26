"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/lib/players";
import type { Tournament } from "@/lib/admin/types";
import { money } from "@/lib/admin/types";
import { SKILLS } from "@/lib/profile-options";
import { DEFAULT_RULES, type DivisionWithCount } from "@/lib/tournaments";

export type HistoryRow = {
  external_history_id: string;
  tournament_name: string;
  tournament_year: number | null;
  format: "SINGLES" | "DOUBLES";
  level: number | null;
  result: string | null;
  partner_name: string | null;
};

const LEVELS = ["3.0", "3.5", "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0", "9.5", "10.0"];
const RESULTS = ["Champion", "Runner-up", "Semi-finalist", "Quarter-finalist", "Other"];
const QUESTIONS = [
  { key: "e1", text: "Are you currently, or have you ever been, a tennis coach?" },
  { key: "e2", text: "Have you ever represented your country, region, province, or university in tennis competitions?" },
  { key: "e3", text: "Have you ever won a championship in any other tennis tournament?" },
];

type Step = "info" | "partner" | "eligibility" | "history" | "skills" | "review";

export default function RegisterWizard({
  tournament,
  division,
  player,
  initialHistory,
}: {
  tournament: Tournament;
  division: DivisionWithCount;
  player: Player;
  initialHistory: HistoryRow[];
}) {
  const router = useRouter();
  const doubles = division.format === "DOUBLES";
  const steps: Step[] = doubles
    ? ["info", "partner", "eligibility", "history", "skills", "review"]
    : ["info", "eligibility", "history", "skills", "review"];
  const [step, setStep] = useState<Step>("info");
  const idx = steps.indexOf(step);
  const next = () => { setError(null); setStep(steps[idx + 1]); window.scrollTo(0, 0); };
  const back = () => { setError(null); setStep(steps[idx - 1]); window.scrollTo(0, 0); };

  const [preferredDate, setPreferredDate] = useState("Saturday");
  const [ackQualifications, setAckQualifications] = useState(false);
  const [ackRules, setAckRules] = useState(false);
  const [partner, setPartner] = useState({ name: "", phone: "", email: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({ e1: "no", e2: "no", e3: "no" });
  const [championDetail, setChampionDetail] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>(initialHistory);
  const [draft, setDraft] = useState({ name: "", year: "", format: "SINGLES", level: "3.5", result: "Champion", partner: "" });
  const saved = (player.skill_profile as Record<string, string> | null) ?? {};
  const [skills, setSkills] = useState<Record<string, string>>(
    Object.fromEntries(SKILLS.map((s) => [s.key, s.options.includes(saved[s.key]) ? saved[s.key] : s.default])),
  );
  const [consent, setConsent] = useState({ pdpa: false, photo_video: false, marketing: false, accuracy: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = division.active_count >= division.capacity;

  function continueInfo() {
    if (!ackQualifications || !ackRules) return setError("Please review and accept the qualifications and rules before continuing.");
    next();
  }
  function continuePartner() {
    if (!partner.name.trim()) return setError("Please enter your doubles partner's name.");
    next();
  }

  async function addHistory() {
    if (!draft.name.trim()) return setError("Please enter the tournament name.");
    const year = draft.year ? Number(draft.year) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear())) {
      return setError("Please enter a valid year.");
    }
    setBusy(true);
    setError(null);
    const { data, error } = await createClient()
      .from("external_tournament_history")
      .insert({
        player_id: player.player_id,
        tournament_name: draft.name.trim(),
        tournament_year: year,
        format: draft.format,
        level: Number(draft.level),
        result: draft.result,
        partner_name: draft.partner.trim() || null,
      })
      .select("external_history_id,tournament_name,tournament_year,format,level,result,partner_name")
      .single();
    setBusy(false);
    if (error) return setError(`Could not save tournament history. ${error.message}`);
    setHistory((h) => [data as HistoryRow, ...h]);
    setDraft((d) => ({ ...d, name: "", year: "", partner: "" }));
  }

  async function removeHistory(id: string) {
    setBusy(true);
    const { error } = await createClient().from("external_tournament_history").delete().eq("external_history_id", id);
    setBusy(false);
    if (error) return setError(`Could not remove tournament history. ${error.message}`);
    setHistory((h) => h.filter((x) => x.external_history_id !== id));
  }

  async function submit() {
    if (!consent.pdpa || !consent.photo_video || !consent.accuracy) {
      return setError("Please accept the required consents and confirm your information.");
    }
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("submit_registration", {
      p_division_id: division.division_id,
      p_partner: doubles ? partner : null,
      p_application: {
        preferred_competition_date: preferredDate,
        acknowledged_qualifications: ackQualifications,
        acknowledged_rules: ackRules,
      },
      p_eligibility_answers: { ...answers, champion_detail: championDetail },
      p_skill_assessment: skills,
      p_consents: consent,
      p_language: "EN",
    });
    if (error) {
      setError(`Could not submit registration. ${error.message}`);
      setBusy(false);
      return;
    }
    router.replace(`/applications/${(data as { registration_id: string }).registration_id}?new=1`);
    router.refresh();
  }

  const header = (eyebrow: string, title: string, sub: string) => (
    <>
      <div className="card wide" style={{ marginTop: 0 }}>
        <div className="eyebrow">SELECTED CATEGORY</div>
        <h2 style={{ margin: "6px 0" }}>{division.name}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {doubles ? "Doubles" : "Singles"} · Level {Number(division.level).toFixed(1)} · {money(division.fee)}
          {doubles ? " / pair" : ""} · {tournament.name}
        </p>
        {full && <div className="notice yellow">This category is full. Your application will join the waiting list.</div>}
      </div>
      <div style={{ marginTop: 20 }}>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="muted">{sub}</p>
      </div>
      <div className="stepper">{steps.map((s, i) => <span key={s} className={i <= idx ? "on" : ""} />)}</div>
    </>
  );

  const actions = (onNext: () => void, label = "Continue") => (
    <>
      {error && <div className="notice red">{error}</div>}
      <div className="actions">
        {idx === 0 ? (
          <Link className="btn secondary" href={`/tournaments/${tournament.tournament_id}`}>Back</Link>
        ) : (
          <button className="btn secondary" type="button" onClick={back} disabled={busy}>Back</button>
        )}
        <button className="btn" type="button" onClick={onNext} disabled={busy}>{busy ? "Please wait…" : label}</button>
      </div>
    </>
  );

  if (step === "info")
    return (
      <>
        {header(`REGISTRATION · STEP 1 OF ${steps.length}`, "Registration Details", "Your Backspin Profile details will be used for this tournament registration.")}
        <div className="card wide">
          <h2 style={{ marginTop: 0 }}>Preferred Competition Date</h2>
          {["Saturday", "Sunday"].map((d) => (
            <label className="choice" key={d}>
              <input type="radio" name="date" checked={preferredDate === d} onChange={() => setPreferredDate(d)} /> {d}
            </label>
          ))}
          <p className="small muted">Preference is not guaranteed.</p>
        </div>
        <div className="card wide">
          <h2 style={{ marginTop: 0 }}>Applicant Qualifications</h2>
          <div className="legal">
            Backspin Tournament is for amateur tennis players. Players should review their eligibility before registering.{"\n"}
            • Backspin Champion status may affect eligibility for the same discipline, category and level.{"\n"}
            • Champion at the same level may continue with Admin validation.{"\n"}
            • Singles and Doubles are treated as separate disciplines.
          </div>
          <label className="choice">
            <input type="checkbox" checked={ackQualifications} onChange={(e) => setAckQualifications(e.target.checked)} />
            I have read and understood the applicant qualifications.
          </label>
        </div>
        <div className="card wide">
          <h2 style={{ marginTop: 0 }}>Rules &amp; Regulations</h2>
          <div className="legal">{tournament.rules_en || DEFAULT_RULES}</div>
          <label className="choice">
            <input type="checkbox" checked={ackRules} onChange={(e) => setAckRules(e.target.checked)} />
            I have read and understood the tournament rules.
          </label>
          {actions(continueInfo)}
        </div>
      </>
    );

  if (step === "partner")
    return (
      <>
        {header(`REGISTRATION · STEP ${idx + 1} OF ${steps.length}`, "Doubles Partner", "Tell us who you will play with.")}
        <div className="card wide">
          <div className="notice">A partner change may be flagged YELLOW for Admin validation.</div>
          <div className="grid" style={{ marginTop: 14 }}>
            <label className="field"><span>Partner name *</span><input value={partner.name} onChange={(e) => setPartner({ ...partner, name: e.target.value })} /></label>
            <label className="field"><span>Partner phone</span><input type="tel" value={partner.phone} onChange={(e) => setPartner({ ...partner, phone: e.target.value })} /></label>
            <label className="field"><span>Partner email</span><input type="email" value={partner.email} onChange={(e) => setPartner({ ...partner, email: e.target.value })} /></label>
          </div>
          {actions(continuePartner)}
        </div>
      </>
    );

  if (step === "eligibility")
    return (
      <>
        {header(`REGISTRATION · STEP ${idx + 1} OF ${steps.length}`, "Eligibility", "Answer all eligibility questions. Admin validates the application.")}
        <div className="card wide">
          {QUESTIONS.map((q, i) => (
            <div className="question" key={q.key}>
              <b>{i + 1}. {q.text}</b>
              <div className="opts">
                {["no", "yes"].map((v) => (
                  <label key={v}>
                    <input type="radio" name={q.key} checked={answers[q.key] === v} onChange={() => setAnswers({ ...answers, [q.key]: v })} />{" "}
                    {v === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
              {q.key === "e3" && answers.e3 === "yes" && (
                <label className="field" style={{ marginTop: 10 }}>
                  <span>Tournament / category / year</span>
                  <input value={championDetail} onChange={(e) => setChampionDetail(e.target.value)} />
                </label>
              )}
            </div>
          ))}
          <div className="notice yellow">RED blocks registration. YELLOW allows registration but requires Admin validation.</div>
          {actions(next)}
        </div>
      </>
    );

  if (step === "history")
    return (
      <>
        {header(`REGISTRATION · STEP ${idx + 1} OF ${steps.length}`, "External Tournament History", "Add external tournament results. Champion results are used for eligibility.")}
        <div className="card wide">
          <div className="notice">Backspin Champion status is maintained by Admin. History you add here is saved to your profile and can be validated by Admin.</div>
          {history.length ? (
            <table className="table-simple" style={{ marginTop: 14 }}>
              <thead><tr><th>Tournament</th><th>Year</th><th>Format</th><th>Level</th><th>Result</th><th></th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.external_history_id}>
                    <td>{h.tournament_name}{h.partner_name ? <div className="small muted">with {h.partner_name}</div> : null}</td>
                    <td>{h.tournament_year ?? "—"}</td>
                    <td>{h.format}</td>
                    <td>{h.level ?? "—"}</td>
                    <td>{h.result ?? "—"}</td>
                    <td><button className="btn secondary" style={{ margin: 0, padding: "6px 10px" }} type="button" disabled={busy} onClick={() => removeHistory(h.external_history_id)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No external tournament history added. If you have no previous tournament records, you can continue.</p>
          )}
          <h2>Add Tournament</h2>
          <div className="grid">
            <label className="field"><span>Tournament Name</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label className="field"><span>Year</span><input inputMode="numeric" value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} /></label>
            <label className="field"><span>Format</span>
              <select value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value })}>
                <option value="SINGLES">Singles</option>
                <option value="DOUBLES">Doubles / Mixed Doubles</option>
              </select>
            </label>
            <label className="field"><span>Category / Level</span>
              <select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
            </label>
            <label className="field"><span>Result</span>
              <select value={draft.result} onChange={(e) => setDraft({ ...draft, result: e.target.value })}>{RESULTS.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            {draft.format === "DOUBLES" && (
              <label className="field"><span>Partner</span><input value={draft.partner} onChange={(e) => setDraft({ ...draft, partner: e.target.value })} /></label>
            )}
          </div>
          <button className="btn secondary" type="button" onClick={addHistory} disabled={busy}>+ Add Tournament History</button>
          {actions(next)}
        </div>
      </>
    );

  if (step === "skills")
    return (
      <>
        {header(`REGISTRATION · STEP ${idx + 1} OF ${steps.length}`, "Skill Assessment", "Choose the description that best matches your current playing level.")}
        <div className="card wide">
          <div className="grid">
            {SKILLS.map((s) => (
              <label className="field" key={s.key}>
                <span>{s.key}</span>
                <select value={skills[s.key]} onChange={(e) => setSkills({ ...skills, [s.key]: e.target.value })}>
                  {s.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
            ))}
          </div>
          {actions(next, "Review Application")}
        </div>
      </>
    );

  const check = (key: keyof typeof consent, title: string, body: string) => (
    <label className="choice">
      <input type="checkbox" checked={consent[key]} onChange={(e) => setConsent({ ...consent, [key]: e.target.checked })} />
      <span><b>{title}</b><small>{body}</small></span>
    </label>
  );

  return (
    <>
      {header("FINAL REVIEW", "Review before submitting", "Submitted applications cannot be edited.")}
      <div className="card wide">
        <h2 style={{ marginTop: 0 }}>Application</h2>
        <div className="kv"><span>Player</span><span>{player.name}</span></div>
        <div className="kv"><span>Phone</span><span>{player.phone}</span></div>
        <div className="kv"><span>Category</span><span>{division.name}</span></div>
        <div className="kv"><span>Fee</span><span>{money(division.fee)}{doubles ? " / pair" : ""}</span></div>
        <div className="kv"><span>Preferred date</span><span>{preferredDate}</span></div>
        {doubles && <div className="kv"><span>Partner</span><span>{partner.name}{partner.phone ? ` · ${partner.phone}` : ""}</span></div>}
        <div className="kv"><span>External history</span><span>{history.length ? `${history.length} tournament(s)` : "None"}</span></div>
        <div className="kv"><span>Skills</span><span>{SKILLS.map((s) => skills[s.key]).join(" · ")}</span></div>
        <p className="small muted">Eligibility (RED / YELLOW) and capacity are checked when you submit.</p>
      </div>
      <div className="card wide">
        <h2 style={{ marginTop: 0 }}>Final Consent &amp; Confirmation</h2>
        {check("pdpa", "Personal Data Protection Notice *", "I consent to the Organizer collecting, using, and processing my personal data for tournament registration, eligibility verification, communication, event administration, and result announcements.")}
        {check("photo_video", "Photo & Video Consent *", "I consent to the Organizer or its authorized representatives photographing, filming, and recording my image, video, and voice during the tournament and related activities, and using such content for public relations, marketing, social media, websites, printed materials, or other media of the Organizer without any compensation.")}
        {check("marketing", "Marketing Consent (optional)", "I consent to the Organizer using my contact information to send news, activity updates, public relations materials, promotions, and marketing communications related to future tournaments or other activities.")}
        {check("accuracy", "Registration Confirmation *", "I confirm that the information submitted is accurate and I understand the tournament rules, eligibility requirements, and organizer's final decision.")}
        {actions(submit, "Submit Registration")}
      </div>
    </>
  );
}
