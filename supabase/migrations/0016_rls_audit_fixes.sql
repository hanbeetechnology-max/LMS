-- HanbeeLms — systematic RLS audit pass (see docs/PLAN.md for the dated
-- entry with full methodology). Every table/policy in 0001-0015 was read
-- and, where a write path exists, exercised live via impersonated pooler
-- queries (set local role authenticated + request.jwt.claims) before any
-- fix was written here. Three real, confirmed-live vulnerabilities:
--
-- 1. profiles.role / profiles.approved self-promotion. The self-update
--    policy ("a user can update only their own profile") has a USING clause
--    of `id = auth.uid()` and NO explicit WITH CHECK — Postgres then reuses
--    USING as the WITH CHECK, which only constrains `id`, not `role` or
--    `approved`. Proven live: authenticated as the real student account
--    (ava@student.edu), `update profiles set role='manager', approved=true
--    where id = auth.uid()` succeeded and returned the new row — instant,
--    fully-approved manager self-promotion, bypassing every
--    is_staff_or_manager() check in the app and the staff-approval gate
--    from 0005_staff_approval.sql entirely.
--
-- 2. auto_attendance_sessions direct status/ended_at forgery. The update
--    policy ("a user heartbeats only their own session") only constrains
--    `user_id = auth.uid()`, with no WITH CHECK restricting which columns
--    change — heartbeat()/finalize_my_session() (0003_functions.sql) are
--    SECURITY INVOKER, meaning they're just a convenience wrapper; a client
--    can skip them and issue the UPDATE directly. Proven live: as ava,
--    inserting a session then directly `update ... set status='present',
--    ended_at=now() where id=<mine>` succeeded, forging a "present"
--    attendance result with zero elapsed time — no login, no wait, no
--    heartbeat gap required.
--
-- 3. certificates direct self-issue forgery. The insert policy ("a user
--    issues only their own certificate") only constrains `user_id =
--    auth.uid()`, not `course_title` or `serial` — issue_certificate()
--    (0003_functions.sql) is SECURITY INVOKER, so it's likewise just a
--    convenience wrapper subject to the same policy, not a real trust
--    boundary. Proven live: as ava, `insert into certificates (user_id,
--    course_title, serial) values (auth.uid(), 'Totally Fake Course I Never
--    Took', 'FORGED-0001')` succeeded — a fabricated certificate for a
--    course never taken, insertable straight from browser devtools/REST.
--
-- All three verified with a rolled-back transaction each (no data left
-- behind), then re-verified blocked after the fix below.

-- ----------------------------------------------------------------------------
-- Fix 1: profiles — BEFORE UPDATE trigger forces role/approved to stay at
-- their prior value unless the acting user is already a manager. Mirrors
-- 0010's force_pending_tournament_registration() trigger pattern: a WITH
-- CHECK alone can't express "this column may not change" without also
-- knowing the OLD value, so a trigger is required. The existing "manager
-- updates any profile" policy is untouched — a real manager can still
-- change anyone's role/approved; only a non-manager's attempt to change
-- their *own* role/approved (on the self-update policy path) is now
-- silently neutralized back to the prior value rather than erroring, so a
-- client that also legitimately updates full_name/avatar_url in the same
-- request isn't broken.
-- ----------------------------------------------------------------------------
create or replace function guard_profile_self_escalation()
returns trigger as $$
begin
  if not (select my_role() = 'manager') then
    new.role := old.role;
    new.approved := old.approved;
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;

create trigger profiles_guard_self_escalation
before update on profiles
for each row execute function guard_profile_self_escalation();

-- ----------------------------------------------------------------------------
-- Fix 2: auto_attendance_sessions — a GUC-gated trigger blocks direct client
-- writes to status/ended_at/expires_at/login_at/user_id; heartbeat() and
-- finalize_my_session() are promoted to SECURITY DEFINER and set a
-- transaction-local "trusted" flag before writing, so the legitimate RPC
-- path still works exactly as before while a raw client UPDATE can no
-- longer forge these columns. last_heartbeat_at is deliberately left
-- unguarded (harmless — the effective-status view only rewards a genuine
-- elapsed gap between login_at and last_heartbeat_at, which a client can't
-- fabricate since login_at is now guarded).
-- ----------------------------------------------------------------------------
create or replace function guard_auto_attendance_update()
returns trigger as $$
begin
  if coalesce(current_setting('app.trusted_attendance_write', true), '') <> 'true' then
    new.status := old.status;
    new.ended_at := old.ended_at;
    new.expires_at := old.expires_at;
    new.login_at := old.login_at;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;

create trigger auto_attendance_sessions_guard
before update on auto_attendance_sessions
for each row execute function guard_auto_attendance_update();

create or replace function heartbeat(p_session_id uuid)
returns auto_attendance_sessions as $$
declare
  result auto_attendance_sessions;
begin
  perform set_config('app.trusted_attendance_write', 'true', true);
  update auto_attendance_sessions
  set last_heartbeat_at = now()
  where id = p_session_id and user_id = auth.uid() and status = 'active'
  returning * into result;
  return result;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function finalize_my_session(p_session_id uuid)
returns auto_attendance_sessions as $$
declare
  result auto_attendance_sessions;
begin
  perform set_config('app.trusted_attendance_write', 'true', true);
  update auto_attendance_sessions
  set
    ended_at = now(),
    status = case when now() - login_at >= interval '10 minutes' then 'present'::auto_session_status else 'left_early'::auto_session_status end
  where id = p_session_id and user_id = auth.uid() and status = 'active'
  returning * into result;
  return result;
end;
$$ language plpgsql security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- Fix 3: certificates — issue_certificate() promoted to SECURITY DEFINER
-- (so it keeps working without a client-facing INSERT policy) and the
-- direct client INSERT policy is dropped, closing the raw-table forgery
-- path. Students now can only create a certificate through the RPC, which
-- is unchanged in its own logic (idempotent per user+course, still trusts
-- the caller's course_title with no completion check — this is a
-- pre-existing gap in the RPC's own business logic, tracked separately in
-- docs/PLAN.md as out of scope for this RLS-focused audit; the fix here
-- closes the *RLS* trust boundary, i.e. removes the ability to bypass the
-- RPC and its idempotency/serial-generation logic entirely via a raw
-- insert with an arbitrary serial).
-- ----------------------------------------------------------------------------
drop policy "a user issues only their own certificate" on certificates;

create or replace function issue_certificate(p_course_title text)
returns certificates as $$
declare
  result certificates;
begin
  insert into certificates (user_id, course_title, serial)
  values (
    auth.uid(),
    p_course_title,
    'HBL-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  on conflict (user_id, course_title) do nothing
  returning * into result;

  if result.id is null then
    select * into result from certificates where user_id = auth.uid() and course_title = p_course_title;
  end if;

  return result;
end;
$$ language plpgsql security definer set search_path = public;
