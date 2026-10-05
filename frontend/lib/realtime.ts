import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readStoredSession } from "./supabaseAuth";

let client: SupabaseClient | null = null;

export function getRealtimeClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error("Realtime is not configured. Add the Supabase URL and public anon key to the frontend environment.");
    }
    client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  const session = readStoredSession();
  if (session) client.realtime.setAuth(session.access_token);
  return client;
}
