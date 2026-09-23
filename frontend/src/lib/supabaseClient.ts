import { createClient } from "@supabase/supabase-js";

// Not yet wired into AuthProvider/api calls anywhere in the app — see
// docs/PLAN.md §10.35. This file exists so the connection is a one-line
// `import` away the moment VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are set;
// until then `supabase` is simply unused, same as backend/'s FastAPI service
// coexists with the offline mock in lib/mockAuth.ts without conflict.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
