// Backspin Supabase client — Tournament V1 production bridge.
const BACKSPIN_SUPABASE_URL='https://ddnmrbkkrllmxsflkmam.supabase.co';
const BACKSPIN_SUPABASE_PUBLISHABLE_KEY='sb_publishable_w0ECVY33KmSCev_0XHfA-A_vAxWHsjm';

window.backspinDb=window.supabase.createClient(
  BACKSPIN_SUPABASE_URL,
  BACKSPIN_SUPABASE_PUBLISHABLE_KEY,
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',experimental:{appendPkceFlowIdToRedirects:true}}}
);

window.backspinAuthState={event:null,session:null};
window.backspinAuthWaiters=[];

function backspinAuthDebug(stage,payload={}){
  const safe={stage,...payload};
  console.info('[Backspin Auth]',safe);
}
window.backspinAuthDebug=backspinAuthDebug;

window.backspinDb.auth.onAuthStateChange((event,session)=>{
  window.backspinAuthState={event,session};
  backspinAuthDebug('AUTH_STATE_CHANGE',{
    event,
    hasSession:Boolean(session),
    userId:session?.user?.id||null
  });
  if(event==='INITIAL_SESSION'){
    const waiters=window.backspinAuthWaiters.splice(0);
    waiters.forEach(resolve=>resolve(session||null));
  }else if(session){
    const waiters=window.backspinAuthWaiters.splice(0);
    waiters.forEach(resolve=>resolve(session));
  }
});

window.backspinData={
  async session(){
    backspinAuthDebug('SESSION_READ_START');
    const {data,error}=await window.backspinDb.auth.getSession();
    if(error){
      backspinAuthDebug('SESSION_READ_ERROR',{message:error.message});
      throw error;
    }
    backspinAuthDebug('SESSION_READ_OK',{
      hasSession:Boolean(data.session),
      userId:data.session?.user?.id||null
    });
    return data.session||null;
  },

  async waitForSession(timeoutMs=15000){
    if(window.backspinAuthState.event==='INITIAL_SESSION') return window.backspinAuthState.session||null;
    const existing=await this.session();
    if(existing)return existing;
    return new Promise(resolve=>{
      let done=false;
      const finish=session=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        window.backspinAuthWaiters=window.backspinAuthWaiters.filter(x=>x!==finish);
        resolve(session||null);
      };
      const timer=setTimeout(async()=>{
        try{finish(await this.session())}catch(_e){finish(null)}
      },timeoutMs);
      window.backspinAuthWaiters.push(finish);
    });
  },

  async completeOAuthCallback(code,flowId){
    if(!code)throw new Error('Missing LINE authorization code.');
    backspinAuthDebug('PKCE_EXCHANGE_START',{hasCode:Boolean(code),hasFlowId:Boolean(flowId)});
    const {data,error}=await window.backspinDb.auth.exchangeCodeForSession(code,flowId?{flowId}:undefined);
    if(error){
      backspinAuthDebug('PKCE_EXCHANGE_ERROR',{message:error.message});
      throw error;
    }
    if(!data?.session)throw new Error('LINE sign-in completed but no Backspin session was created.');
    backspinAuthDebug('PKCE_EXCHANGE_OK',{userId:data.session.user?.id||null});
    return data.session;
  },

  async signInWithLine(){
    backspinAuthDebug('LINE_LOGIN_START');
    const redirectTo=window.location.origin+'/auth/callback';
    const {data,error}=await window.backspinDb.auth.signInWithOAuth({
      provider:'custom:line',
      options:{scopes:'openid profile',redirectTo}
    });
    if(error){
      backspinAuthDebug('LINE_LOGIN_ERROR',{message:error.message});
      throw error;
    }
    if(!data?.url)throw new Error('Supabase did not return the LINE authorization URL.');
    backspinAuthDebug('LINE_LOGIN_REDIRECT_READY',{hasUrl:Boolean(data.url)});
    return data;
  },

  async signOut(){
    const {error}=await window.backspinDb.auth.signOut();
    if(error)throw error;
  },

  lineIdentity(session){
    const u=session?.user||{};
    const ids=u.identities||[];
    const i=ids.find(x=>x.provider==='line'||x.provider==='custom:line');
    const d=i?.identity_data||{};
    const m=u.user_metadata||{};
    const identity={
      lineId:d.sub||d.userId||m.sub||m.userId||null,
      name:d.name||d.displayName||m.name||m.display_name||m.full_name||u.email||'Backspin Player',
      picture:d.picture||d.pictureUrl||m.picture||m.avatar_url||null,
      email:d.email||u.email||m.email||null
    };
    backspinAuthDebug('LINE_IDENTITY_READ',{
      hasIdentity:Boolean(i),
      hasLineId:Boolean(identity.lineId),
      hasName:Boolean(identity.name),
      hasEmail:Boolean(identity.email),
      userId:u.id||null
    });
    return identity;
  },

  async syncPlayerIdentity(player,session,line){
    if(!player?.player_id||!session?.user?.id)throw new Error('Cannot link LINE identity without a player and authenticated user.');
    if(line.lineId){
      const {data:identity,error:ie}=await window.backspinDb
        .from('player_identities')
        .select('player_identity_id,player_id,provider,provider_subject')
        .eq('provider','line')
        .eq('provider_subject',line.lineId)
        .maybeSingle();
      if(ie)throw ie;
      if(identity && identity.player_id!==player.player_id){
        throw new Error('This LINE account is already linked to another Backspin player.');
      }
      if(!identity){
        const {error:ce}=await window.backspinDb.from('player_identities').insert({
          player_id:player.player_id,
          provider:'line',
          provider_subject:line.lineId
        });
        if(ce)throw ce;
        backspinAuthDebug('PLAYER_IDENTITY_CREATED',{playerId:player.player_id,provider:'line'});
      }else{
        backspinAuthDebug('PLAYER_IDENTITY_FOUND',{playerId:player.player_id,provider:'line'});
      }
    }else{
      backspinAuthDebug('PLAYER_IDENTITY_MISSING_SUBJECT',{playerId:player.player_id});
    }

    const patch={};
    if(line.lineId && player.line_id!==line.lineId)patch.line_id=line.lineId;
    if(line.email && !player.email)patch.email=line.email;
    if(Object.keys(patch).length){
      const {data,error}=await window.backspinDb.from('players').update({...patch,updated_at:new Date().toISOString()}).eq('player_id',player.player_id).select('*').single();
      if(error)throw error;
      return data;
    }
    return player;
  },

  async ensurePlayer(session){
    if(!session?.user?.id)throw new Error('No authenticated user.');
    const authUserId=session.user.id;
    const line=this.lineIdentity(session);

    backspinAuthDebug('PLAYER_LOOKUP_BY_AUTH_START',{userId:authUserId});
    const {data:existing,error:ee}=await window.backspinDb.from('players').select('*').eq('auth_user_id',authUserId).maybeSingle();
    if(ee){
      backspinAuthDebug('PLAYER_LOOKUP_BY_AUTH_ERROR',{message:ee.message});
      throw ee;
    }
    if(existing){
      backspinAuthDebug('PLAYER_FOUND_BY_AUTH',{playerId:existing.player_id});
      return await this.syncPlayerIdentity(existing,session,line);
    }

    // A LINE subject is the durable external identity reference.
    // Check it before creating a second player record.
    if(line.lineId){
      backspinAuthDebug('PLAYER_LOOKUP_BY_LINE_START');
      const {data:byLine,error:le}=await window.backspinDb.from('players').select('*').eq('line_id',line.lineId).maybeSingle();
      if(le){
        backspinAuthDebug('PLAYER_LOOKUP_BY_LINE_ERROR',{message:le.message});
        throw le;
      }
      if(byLine){
        if(byLine.auth_user_id && byLine.auth_user_id!==authUserId){
          throw new Error('This LINE account is already linked to another Backspin player.');
        }
        // If the row has no auth_user_id, the client cannot safely claim it under
        // player RLS. Fail clearly rather than silently creating a duplicate.
        if(!byLine.auth_user_id){
          throw new Error('A Backspin player record exists for this LINE ID but is not linked to an authenticated account. Admin linking is required.');
        }
        return await this.syncPlayerIdentity(byLine,session,line);
      }
    }

    backspinAuthDebug('PLAYER_CREATE_START',{userId:authUserId});
    const {data,error}=await window.backspinDb.from('players').insert({
      auth_user_id:authUserId,
      name:line.name,
      email:line.email||null,
      line_id:line.lineId||null,
      profile_photo_path:null,
      verification_status:'Unverified'
    }).select('*').single();
    if(error){
      backspinAuthDebug('PLAYER_CREATE_ERROR',{message:error.message,code:error.code||null});
      throw error;
    }
    backspinAuthDebug('PLAYER_CREATED',{playerId:data.player_id});

    try{
      return await this.syncPlayerIdentity(data,session,line);
    }catch(e){
      // Do not leave the login flow looking successful if the identity reference
      // could not be persisted.
      backspinAuthDebug('PLAYER_IDENTITY_LINK_ERROR',{message:e.message});
      throw e;
    }
  },

  async loadTournament(){
    const {data:tournament,error:te}=await window.backspinDb.from('tournaments').select('*').eq('status','Open').order('start_at',{ascending:true}).limit(1).maybeSingle();
    if(te)throw te;
    if(!tournament)return{tournament:null,divisions:[]};
    const {data:divisions,error:de}=await window.backspinDb.from('divisions').select('*').eq('tournament_id',tournament.tournament_id).order('sort_order');
    if(de)throw de;
    const {data:regs,error:re}=await window.backspinDb.from('registrations').select('division_id,registration_status').eq('tournament_id',tournament.tournament_id).in('registration_status',['SUBMITTED','PAYMENT_REQUIRED','PAYMENT_SUBMITTED','CONFIRMED']);
    if(re)throw re;
    const counts={};
    (regs||[]).forEach(r=>counts[r.division_id]=(counts[r.division_id]||0)+1);
    return{tournament,divisions:(divisions||[]).map(d=>({...d,registration_count:counts[d.division_id]||0}))};
  },

  async loadRegistrations(playerId){
    const {data,error}=await window.backspinDb.from('registrations').select('*, divisions(name,format,level,fee), tournaments(name)').eq('main_player_id',playerId).order('submitted_at',{ascending:false});
    if(error)throw error;
    return data||[];
  },

  async loadExternalHistory(playerId){
    const {data,error}=await window.backspinDb.from('external_tournament_history').select('*').eq('player_id',playerId).order('tournament_year',{ascending:false});
    if(error)throw error;
    return data||[];
  },

  async loadChampionHistory(playerId){
    const {data,error}=await window.backspinDb.from('champion_history').select('*, divisions(name,format,level)').eq('champion_player_id',playerId).order('recorded_at',{ascending:false});
    if(error)throw error;
    return data||[];
  },

  async createRegistration(p){
    const {data,error}=await window.backspinDb.from('registrations').insert({
      tournament_id:p.tournamentId,division_id:p.divisionId,main_player_id:p.playerId,
      registration_status:p.status,eligibility_result:p.eligibilityResult,
      eligibility_reason:p.eligibilityReason,payment_status:p.paymentStatus,
      profile_snapshot:p.profileSnapshot||{},application_snapshot:p.applicationSnapshot||{},
      eligibility_answers:p.eligibilityAnswers||{},external_history_snapshot:p.externalHistorySnapshot||[],
      skill_assessment:p.skillAssessment||{}
    }).select('*, divisions(name,format,level,fee), tournaments(name)').single();
    if(error)throw error;
    return data;
  },

  async saveConsents(id,items){
    const rows=items.map(x=>({registration_id:id,consent_type:x.type,accepted:x.accepted,language:x.language,consent_version:x.version,accepted_at:new Date().toISOString()}));
    const {error}=await window.backspinDb.from('registration_consents').upsert(rows,{onConflict:'registration_id,consent_type'});
    if(error)throw error;
  },

  async uploadPaymentSlip(id,file){
    const path=`${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const up=await window.backspinDb.storage.from('payment-slips').upload(path,file,{upsert:false});
    if(up.error)throw up.error;
    const ins=await window.backspinDb.from('payment_submissions').insert({registration_id:id,slip_storage_path:path,payment_status:'SUBMITTED'}).select('*').single();
    if(ins.error)throw ins.error;
    const upd=await window.backspinDb.from('registrations').update({registration_status:'PAYMENT_SUBMITTED',payment_status:'SUBMITTED',updated_at:new Date().toISOString()}).eq('registration_id',id).select('*').single();
    if(upd.error)throw upd.error;
    return upd.data;
  }
};
