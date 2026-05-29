import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const FIELD_SUPABASE_URL = "https://vmudtmujzcqsmvcrzcwi.supabase.co";

const FIELD_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdWR0bXVqemNxc212Y3J6Y3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzUxOTUsImV4cCI6MjA5NTU1MTE5NX0.ktodO-Hsv3yKpXXCGMN62Fd6N4cP2tRwfNyltzAO2BA";

export const supabase = createClient(
  FIELD_SUPABASE_URL,
  FIELD_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "fieldpress-ai-auth",
    },
  },
);

window.FIELD_SUPABASE_URL = FIELD_SUPABASE_URL;
window.FIELD_SUPABASE_ANON_KEY = FIELD_SUPABASE_ANON_KEY;
window.fieldpressSupabase = supabase;

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
}

export async function getProfile() {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function ensureActiveProfile() {
  const profile = await getProfile();

  if (!profile) {
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  if (profile.status === "suspended" && profile.role !== "owner") {
    await supabase.auth.signOut();
    window.location.href = "login.html?error=suspended";
    return null;
  }

  return profile;
}

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  const profile = await ensureActiveProfile();
  if (!profile) return null;

  return session;
}

export async function requireGuest() {
  const session = await getSession();

  if (session) {
    window.location.href = "dashboard.html";
    return null;
  }

  return true;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  window.location.href = "login.html";
}

export function getSupabaseClient() {
  return supabase;
}
