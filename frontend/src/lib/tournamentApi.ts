import { supabase } from "./supabaseClient";

/** Persists a tournament registration (TournamentPage.tsx's RegistrationForm)
 *  to the real `tournament_registrations` table — see supabase/migrations/
 *  0009_tournament_registrations.sql. Returns whether the insert succeeded;
 *  callers fall back to the existing offline "success" UI when Supabase
 *  isn't configured or the insert fails, same pattern as coursesApi.ts.
 *
 *  `paymentConfirmed` is passed through for completeness but never actually
 *  trusted — 0010_tournament_registrations_trust_fix.sql's BEFORE INSERT
 *  trigger forces it to `false` server-side regardless of what's sent here.
 *  `studentId`, when the registrant is logged in, lets them read their own
 *  registration status back later (0011's `student_id = auth.uid()` policy)
 *  — omitted entirely for anonymous registrants, which still works fine. */
export async function registerForTournament(
  driverName: string,
  email: string,
  phone: string,
  paymentConfirmed: boolean,
  studentId?: string,
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("tournament_registrations").insert({
    driver_name: driverName,
    email,
    phone,
    payment_confirmed: paymentConfirmed,
    student_id: studentId ?? null,
  });
  return !error;
}

export interface PendingTournamentRegistration {
  id: string;
  driverName: string;
  email: string;
  phone: string;
  paymentConfirmed: boolean;
  createdAt: string;
}

/** Staff/manager-only — relies on 0009's staff/manager SELECT policy. */
export async function fetchPendingTournamentRegistrations(): Promise<PendingTournamentRegistration[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("id, driver_name, email, phone, payment_confirmed, created_at")
    .eq("status", "pending_verification")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    driverName: row.driver_name,
    email: row.email,
    phone: row.phone,
    paymentConfirmed: row.payment_confirmed,
    createdAt: row.created_at,
  }));
}

/** Staff/manager marks a registration verified — relies on 0010's
 *  staff/manager UPDATE policy (the only path that can ever flip
 *  payment_confirmed/status, per the trust-boundary fix). */
export async function verifyTournamentRegistration(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("tournament_registrations")
    .update({ payment_confirmed: true, status: "verified" })
    .eq("id", id);
  return !error;
}

export interface MyTournamentRegistration {
  id: string;
  driverName: string;
  status: string;
  paymentConfirmed: boolean;
  createdAt: string;
}

/** The logged-in student's own tournament registration(s), for a dashboard
 *  status widget — relies on 0011's `student_id = auth.uid()` read policy. */
export async function fetchMyTournamentRegistrations(): Promise<MyTournamentRegistration[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("id, driver_name, status, payment_confirmed, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    driverName: row.driver_name,
    status: row.status,
    paymentConfirmed: row.payment_confirmed,
    createdAt: row.created_at,
  }));
}
