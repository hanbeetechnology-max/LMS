-- Closes a real trust-boundary gap in 0009_tournament_registrations.sql:
-- `payment_confirmed` was insertable directly by the client (RLS only
-- checked `with check (true)` for the insert), meaning anyone could skip
-- the UI entirely and call the Supabase REST API with
-- `{ "payment_confirmed": true }` and no payment at all — the checkbox on
-- the form was never actually enforced server-side. The QR image being
-- client-editable via devtools was the visible symptom the user spotted;
-- the real bug is that the *database* never verified payment either way.
--
-- Fix: a BEFORE INSERT trigger forces payment_confirmed = false and
-- status = 'pending_verification' on every new row, ignoring whatever the
-- client sent for those two columns. The only way a registration becomes
-- confirmed is a staff/manager UPDATE after manually checking their UPI
-- transaction history against the driver's name/email — matching this
-- app's existing manual-verification pattern (ManagerVerificationsPage,
-- the staff-approval gate) rather than trusting client-reported state.

create or replace function force_pending_tournament_registration()
returns trigger as $$
begin
  new.payment_confirmed := false;
  new.status := 'pending_verification';
  return new;
end;
$$ language plpgsql security invoker set search_path = public;

create trigger tournament_registration_force_pending
before insert on tournament_registrations
for each row execute function force_pending_tournament_registration();

-- Only staff/manager can ever mark a registration verified/paid.
create policy "staff/manager update tournament registrations"
  on tournament_registrations for update
  using (is_staff_or_manager())
  with check (is_staff_or_manager());
