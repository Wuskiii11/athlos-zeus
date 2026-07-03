import { createClient } from "@supabase/supabase-js";

// Keys come from .env (see .env.example). Until you paste real values the app
// keeps running in local demo mode (localStorage) — nothing breaks.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const looksReal = (v) => typeof v === "string" && v.length > 10 && !v.includes("TVOJ_");

export const hasSupabase = looksReal(url) && looksReal(key);
export const supabaseUrl = hasSupabase ? url : null;
export const supabaseKey = hasSupabase ? key : null;

export const supabase = hasSupabase
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
