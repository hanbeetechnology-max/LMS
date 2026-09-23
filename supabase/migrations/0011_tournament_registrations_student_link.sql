-- Links a tournament registration to the logged-in student who made it,
-- when there is one — registration stays available to anonymous visitors
-- too (see 0009's "anyone (including anonymous) can register" policy,
-- which is untouched here). Lets a logged-in student see their own
-- registration status (e.g. on their dashboard) without granting them
-- read access to anyone else's row.
--
-- Does NOT touch 0010's BEFORE INSERT trigger or its staff/manager UPDATE
-- policy — those stay exactly as they are; this migration only adds a
-- column and an additive SELECT policy (RLS policies for the same command
-- are OR'd together, so this doesn't need to replace the existing
-- staff/manager read policy from 0009).

alter table tournament_registrations
  add column student_id uuid references profiles(id) on delete set null;

create policy "a student can read their own tournament registrations"
  on tournament_registrations for select
  using (student_id = auth.uid());
