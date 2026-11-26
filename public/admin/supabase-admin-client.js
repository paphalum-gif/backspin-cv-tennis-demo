// Backspin Admin-only Supabase client.
// Intentionally isolated from the Player OAuth client so Admin restore cannot alter LINE PKCE flow.
const BACKSPIN_SUPABASE_URL='https://ddnmrbkkrllmxsflkmam.supabase.co';
const BACKSPIN_SUPABASE_PUBLISHABLE_KEY='sb_publishable_w0ECVY33KmSCev_0XHfA-A_vAxWHsjm';
window.backspinDb=window.supabase.createClient(BACKSPIN_SUPABASE_URL,BACKSPIN_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}});
