export type Tournament = {
  tournament_id: string;
  name: string;
  venue: string | null;
  status: string;
  start_at: string;
  end_at: string;
  registration_open_at: string;
  registration_close_at: string;
  payment_deadline_at: string;
  description_th: string | null;
  description_en: string | null;
  payment_account_name: string | null;
  payment_qr_path: string | null;
  rules_th: string | null;
  rules_en: string | null;
};

export type Division = {
  division_id: string;
  tournament_id: string;
  name: string;
  format: "SINGLES" | "DOUBLES";
  gender_category: string;
  level: number;
  fee: number;
  capacity: number;
  is_open: boolean;
  sort_order: number;
};

export type Registration = {
  registration_id: string;
  tournament_id: string;
  division_id: string;
  registration_status: string;
  payment_status: string | null;
  eligibility_result: string | null;
  eligibility_reason: string | null;
  admin_note: string | null;
  reject_reason: string | null;
  submitted_at: string;
  application_snapshot: { partner?: { name?: string } } | null;
  external_history_snapshot: unknown;
  players: { name: string | null; email: string | null; phone: string | null } | null;
  divisions: { name: string; format: string; level: number; fee: number } | null;
};

export const REGISTRATION_STATUSES = [
  "SUBMITTED",
  "PAYMENT_REQUIRED",
  "WAITING_LIST",
  "PAYMENT_SUBMITTED",
  "CONFIRMED",
  "REJECTED",
] as const;

export const money = (n: number | null | undefined) => `฿${Number(n || 0).toLocaleString()}`;
