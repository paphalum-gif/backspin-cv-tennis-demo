export const GENDERS = ["Female", "Male", "Prefer not to say"] as const;

export const EXPERIENCE: { label: string; years: number }[] = [
  { label: "< 1 year", years: 0.5 },
  { label: "1–3 years", years: 2 },
  { label: "3–5 years", years: 4 },
  { label: "> 5 years", years: 6 },
];

export function experienceLabel(years: number | null | undefined) {
  if (years == null) return EXPERIENCE[0].label;
  return EXPERIENCE.find((e) => e.years === Number(years))?.label ?? EXPERIENCE[0].label;
}

export function experienceYears(label: string) {
  return EXPERIENCE.find((e) => e.label === label)?.years ?? null;
}

// Keys match the legacy app so existing skill_profile JSON stays readable.
export const SKILLS: { key: string; options: string[]; default: string }[] = [
  {
    key: "Rally",
    options: ["Rally 5–10 shots", "Rally 10–20 shots", "Rally consistently with control", "Rally with pace and accuracy"],
    default: "Rally 10–20 shots",
  },
  {
    key: "Serve",
    options: ["Can serve in", "Good control", "Good pace and placement", "Can vary serves effectively"],
    default: "Good control",
  },
  {
    key: "Net",
    options: ["Rarely play at the net", "Comfortable with volleys", "Confident at the net", "Strong net player"],
    default: "Comfortable with volleys",
  },
  {
    key: "Match Experience",
    options: [
      "Mostly recreational (Fun & Exercise)",
      "Some Amateur Tournaments",
      "Regular tournament player",
      "Strong tournament player",
    ],
    default: "Some Amateur Tournaments",
  },
  {
    key: "Unforced Errors",
    options: [
      "Often make unforced errors",
      "Can keep the rally going",
      "Stay consistent even under pressure",
      "Rarely make unforced errors",
    ],
    default: "Can keep the rally going",
  },
];
