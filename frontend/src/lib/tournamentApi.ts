import { supabase } from "./supabaseClient";

/** Persists a tournament registration (TournamentPage.tsx's RegistrationForm)
 *  to the real `tournament_registrations` table — see supabase/migrations/
 *  0009_tournament_registrations.sql. Returns whether the insert succeeded;
 *  callers fall back to the existing offline "success" UI when Supabase
 *  isn't configured or the insert fails, same pattern as coursesApi.ts. */
export async function registerForTournament(
  driverName: string,
  email: string,
  phone: string,
  paymentConfirmed: boolean
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("tournament_registrations").insert({
    driver_name: driverName,
    email,
    phone,
    payment_confirmed: paymentConfirmed,
  });
  return !error;
}
