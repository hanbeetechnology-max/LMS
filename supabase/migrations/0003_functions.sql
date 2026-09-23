-- HanbeeLms — RPCs for behavior that plain RLS can't express:
--   1. Autonomous attendance needs a "finalize on read" view (no cron/Edge
--      Function required) plus heartbeat/logout RPCs.
--   2. Certificate issuance needs idempotency (one per user+course).
--   3. Certificate verification is deliberately public/unauthenticated —
--      see backend/app/routers/certificates.py for the FastAPI prototype
--      this reproduces exactly.

-- ----------------------------------------------------------------------------
-- Effective attendance status, computed at read time — mirrors
-- backend/app/store.py's sweep_stale_sessions() logic without needing pg_cron.
-- ----------------------------------------------------------------------------
create view auto_attendance_sessions_effective as
select
  s.*,
  case
    when s.status <> 'active' then s.status
    when now() - s.last_heartbeat_at > interval '90 seconds' or now() > s.expires_at then
      case when s.last_heartbeat_at - s.login_at >= interval '10 minutes' then 'present'::auto_session_status else 'left_early'::auto_session_status end
    else 'active'::auto_session_status
  end as effective_status,
  extract(epoch from (coalesce(s.ended_at, now()) - s.login_at)) as duration_seconds
from auto_attendance_sessions s;

-- Views don't inherit RLS from their base table automatically in older PG,
-- but Supabase Postgres (PG15+) does enforce the base table's RLS for the
-- querying role by default via security_invoker — set explicitly to be sure.
alter view auto_attendance_sessions_effective set (security_invoker = true);

create function heartbeat(p_session_id uuid)
returns auto_attendance_sessions as $$
  update auto_attendance_sessions
  set last_heartbeat_at = now()
  where id = p_session_id and user_id = auth.uid() and status = 'active'
  returning *;
$$ language sql security invoker;

create function finalize_my_session(p_session_id uuid)
returns auto_attendance_sessions as $$
  update auto_attendance_sessions
  set
    ended_at = now(),
    status = case when now() - login_at >= interval '10 minutes' then 'present'::auto_session_status else 'left_early'::auto_session_status end
  where id = p_session_id and user_id = auth.uid() and status = 'active'
  returning *;
$$ language sql security invoker;

-- ----------------------------------------------------------------------------
-- Idempotent certificate issuance — "completing" a course twice returns the
-- same serial rather than minting a new one.
-- ----------------------------------------------------------------------------
-- The obvious "select, then insert if not found" is NOT safe here: React's
-- StrictMode double-invokes effects in dev, so two calls can land within
-- milliseconds of each other, both see "not found," and both try to
-- insert — the second hits the unique(user_id, course_title) constraint and
-- the caller gets a raw 409 instead of the certificate. Caught via real
-- testing against the live database, not by inspection. `insert ... on
-- conflict do nothing`, falling back to a select only when the insert lost
-- the race, is atomic and closes the window entirely.
create function issue_certificate(p_course_title text)
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
$$ language plpgsql security invoker;

-- ----------------------------------------------------------------------------
-- Public certificate verification — deliberately bypasses RLS (security
-- definer) and is granted to `anon`, since the entire point is that someone
-- with no HanbeeLms account can confirm a certificate is real.
-- ----------------------------------------------------------------------------
create function verify_certificate(p_certificate_id uuid)
returns table (id uuid, user_name text, course_title text, issued_at timestamptz, serial text) as $$
  select c.id, p.full_name, c.course_title, c.issued_at, c.serial
  from certificates c
  join profiles p on p.id = c.user_id
  where c.id = p_certificate_id;
$$ language sql security definer set search_path = public;

grant execute on function verify_certificate(uuid) to anon, authenticated;
grant execute on function heartbeat(uuid) to authenticated;
grant execute on function finalize_my_session(uuid) to authenticated;
grant execute on function issue_certificate(text) to authenticated;
