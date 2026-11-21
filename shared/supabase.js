// إعداد الاتصال بـ Supabase لكل صفحات الموقع.
// تُعبَّى هاتين القيمتين تلقائيًا بعد ربط مشروع Supabase.
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (typeof window === "undefined" || !window.supabase) return null;
  if (!window.__sbClient) {
    window.__sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return window.__sbClient;
}

function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function getCurrentUser() {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data && data.session ? data.session.user : null;
}

async function getCurrentProfile() {
  const sb = getSupabaseClient();
  const user = await getCurrentUser();
  if (!sb || !user) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
  if (error) return null;
  return data;
}

async function signOutAndRedirect(redirectUrl) {
  const sb = getSupabaseClient();
  if (sb) await sb.auth.signOut();
  window.location.href = redirectUrl || "../index.html";
}
