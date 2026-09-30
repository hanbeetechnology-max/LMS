-- Add search and status filtering to list_course_applications() so the
-- Hanbee review queue doesn't fetch every application ever made (including
-- long-decided ones) just to filter down to "pending" client-side.
--
-- This function is also used by students to see their own applications (the
-- last branch of its access check), so every new parameter defaults to null
-- = "no filter", preserving that exact old behavior for any future caller
-- that wants the full history.

drop function if exists list_course_applications();

create or replace function list_course_applications(p_status application_status[] default null, p_search text default null)
returns table (id uuid, course_id uuid, course_title text, applicant_id uuid, applicant_name text,
  org_id_at_join uuid, school_name text, status application_status, payment_declared boolean,
  decided_at timestamptz, created_at timestamptz) as $$
  select a.id, a.course_id, c.title, a.applicant_id, p.full_name, a.org_id_at_join, o.name, a.status,
    a.payment_declared, a.decided_at, a.created_at
  from public.applications a
  join public.courses c on c.id = a.course_id
  join public.profiles p on p.id = a.applicant_id
  left join public.organizations o on o.id = a.org_id_at_join
  where (is_manager() or is_hanbee_staff()
    or (my_role() = 'school_staff' and a.org_id_at_join is not null and a.org_id_at_join = my_org_id())
    or (a.applicant_id = auth.uid() and is_active_account()))
    and (p_status is null or a.status = any(p_status))
    and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%' or c.title ilike '%' || p_search || '%')
  order by a.created_at desc;
$$ language sql stable security definer set search_path = public;

revoke all on function list_course_applications(application_status[], text) from public, anon;
grant execute on function list_course_applications(application_status[], text) to authenticated;
