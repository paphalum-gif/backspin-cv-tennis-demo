export type MyRegistration = {
  registration_id: string;
  tournament_id: string;
  division_id: string;
  registration_status: string;
  payment_status: string | null;
  eligibility_result: string | null;
  eligibility_reason: string | null;
  reject_reason: string | null;
  submitted_at: string;
  confirmed_at: string | null;
  application_snapshot: { partner?: { name?: string; phone?: string } | null; preferred_competition_date?: string } | null;
  divisions: { name: string; format: string; level: number; fee: number } | null;
  tournaments: {
    name: string;
    start_at: string;
    payment_deadline_at: string;
    payment_account_name: string | null;
    payment_qr_path: string | null;
  } | null;
};

export const MY_REGISTRATION_SELECT =
  "registration_id,tournament_id,division_id,registration_status,payment_status,eligibility_result,eligibility_reason,reject_reason,submitted_at,confirmed_at,application_snapshot,divisions(name,format,level,fee),tournaments(name,start_at,payment_deadline_at,payment_account_name,payment_qr_path)";
