// Backspin Supabase client — Tournament V1
// Browser-safe publishable key only. Never put a Supabase secret/service-role key or LINE Channel Secret here.
const BACKSPIN_SUPABASE_URL = 'https://ddnmrbkkrllmxsflkmam.supabase.co';
const BACKSPIN_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_w0ECVY33KmSCev_0XHfA-A_vAxWHsjm';

window.backspinDb = window.supabase.createClient(
  BACKSPIN_SUPABASE_URL,
  BACKSPIN_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

window.backspinData = {
  async session() {
    const { data, error } = await window.backspinDb.auth.getSession();
    if (error) throw error;
    return data.session || null;
  },

  async signInWithLine() {
    const { data, error } = await window.backspinDb.auth.signInWithOAuth({
      provider: 'custom:line',
      options: {
        scopes: 'openid profile email'
      }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await window.backspinDb.auth.signOut();
    if (error) throw error;
  },

  lineIdentity(session) {
    const identities = session?.user?.identities || [];
    const identity = identities.find(i => i.provider === 'line' || i.provider === 'custom:line');
    const data = identity?.identity_data || {};
    return {
      lineId: data.sub || data.userId || session?.user?.user_metadata?.sub || null,
      name: data.name || data.displayName || session?.user?.user_metadata?.name || session?.user?.user_metadata?.full_name || 'Backspin Player',
      picture: data.picture || data.pictureUrl || session?.user?.user_metadata?.picture || session?.user?.user_metadata?.avatar_url || null,
      email: data.email || session?.user?.email || null
    };
  },

  async ensurePlayer(session) {
    if (!session?.user?.id) throw new Error('No authenticated user');
    const authUserId = session.user.id;
    const line = this.lineIdentity(session);

    const { data: existing, error: ee } = await window.backspinDb
      .from('players')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (ee) throw ee;
    if (existing) return existing;

    // If the same LINE subject was already linked to a Backspin profile, reuse it.
    if (line.lineId) {
      const { data: byLine, error: le } = await window.backspinDb
        .from('players')
        .select('*')
        .eq('line_id', line.lineId)
        .maybeSingle();
      if (le) throw le;
      if (byLine) {
        const { data: linked, error: ue } = await window.backspinDb
          .from('players')
          .update({ auth_user_id: authUserId, email: byLine.email || line.email, updated_at: new Date().toISOString() })
          .eq('player_id', byLine.player_id)
          .select('*')
          .single();
        if (ue) throw ue;
        return linked;
      }
    }

    const { data, error } = await window.backspinDb
      .from('players')
      .insert({
        auth_user_id: authUserId,
        name: line.name,
        email: line.email,
        line_id: line.lineId,
        profile_photo_path: null,
        verification_status: 'Unverified'
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
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
      .select('division_id, registration_status')
      .eq('tournament_id', tournament.tournament_id)
      .in('registration_status', ['SUBMITTED','PAYMENT_REQUIRED','PAYMENT_SUBMITTED','CONFIRMED']);
    if (re) throw re;

    const counts = {};
    (regs || []).forEach(r => counts[r.division_id] = (counts[r.division_id] || 0) + 1);

    return {
      tournament,
      divisions: (divisions || []).map(d => ({
        ...d,
        registration_count: counts[d.division_id] || 0
      }))
    };
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
