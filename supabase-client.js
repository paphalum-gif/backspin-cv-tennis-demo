// Backspin Supabase client — Tournament V1
// Publishable key is safe for browser use when RLS is correctly enforced.
// Never put a service-role/secret key in this file.
const BACKSPIN_SUPABASE_URL = 'https://ddnmrbkkrllmxsflkmam.supabase.co';
const BACKSPIN_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_w0ECVY33KmSCev_0XHfA-A_vAxWHsjm';

window.backspinDb = window.supabase.createClient(
  BACKSPIN_SUPABASE_URL,
  BACKSPIN_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

window.backspinData = {
  async session() {
    const { data } = await window.backspinDb.auth.getSession();
    return data.session || null;
  },
  async ensureDevSession() {
    let session = await this.session();
    if (session) return session;
    const { data, error } = await window.backspinDb.auth.signInAnonymously();
    if (error) throw error;
    return data.session;
  },
  async loadTournament() {
    const { data: tournament, error: te } = await window.backspinDb
      .from('tournaments')
      .select('*')
      .eq('name', 'Backspin January Open')
      .eq('status', 'Open')
      .single();
    if (te) throw te;
    const { data: divisions, error: de } = await window.backspinDb
      .from('divisions')
      .select('*')
      .eq('tournament_id', tournament.tournament_id)
      .eq('is_open', true)
      .order('sort_order');
    if (de) throw de;
    const { data: regs, error: re } = await window.backspinDb
      .from('registrations')
      .select('division_id')
      .eq('tournament_id', tournament.tournament_id);
    if (re) throw re;
    const counts = {};
    (regs || []).forEach(r => counts[r.division_id] = (counts[r.division_id] || 0) + 1);
    return { tournament, divisions: (divisions || []).map(d => ({...d, registration_count: counts[d.division_id] || 0})) };
  },
  async ensurePlayer(session) {
    const authUserId = session.user.id;
    const { data: existing, error: ee } = await window.backspinDb
      .from('players').select('*').eq('auth_user_id', authUserId).maybeSingle();
    if (ee) throw ee;
    if (existing) return existing;
    const { data, error } = await window.backspinDb
      .from('players')
      .insert({
        auth_user_id: authUserId,
        name: 'Demo Player',
        phone: null,
        email: session.user.email || null,
        verification_status: 'Unverified'
      })
      .select('*').single();
    if (error) throw error;
    return data;
  },
  async loadRegistrations(playerId) {
    const { data, error } = await window.backspinDb
      .from('registrations')
      .select('*, divisions(name,level,fee), tournaments(name)')
      .eq('main_player_id', playerId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async createRegistration({ tournamentId, divisionId, playerId, profileSnapshot, applicationSnapshot, eligibilityAnswers, externalHistorySnapshot, skillAssessment, status, paymentStatus }) {
    const { data, error } = await window.backspinDb
      .from('registrations')
      .insert({
        tournament_id: tournamentId,
        division_id: divisionId,
        main_player_id: playerId,
        registration_status: status,
        eligibility_result: 'YELLOW',
        eligibility_reason: 'Initial registration validation',
        payment_status: paymentStatus,
        profile_snapshot: profileSnapshot || {},
        application_snapshot: applicationSnapshot || {},
        eligibility_answers: eligibilityAnswers || {},
        external_history_snapshot: externalHistorySnapshot || [],
        skill_assessment: skillAssessment || {}
      })
      .select('*, divisions(name,level,fee), tournaments(name)')
      .single();
    if (error) throw error;
    return data;
  }
};
