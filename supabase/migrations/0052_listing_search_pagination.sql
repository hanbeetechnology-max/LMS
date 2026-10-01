-- Same gap list_assessment_reviews had before 0043: list_certificates_overview
-- and list_addable_students return every matching row with no search or
-- pagination, unlike the established pattern (0042/0043/0044). Brought up to
-- that same shape here. get_team_roster is deliberately left untouched - it's
-- bounded by tournaments.team_size (a handful of students), so pagination
-- would add nothing.
--
-- Postgres treats a new parameter list as a distinct function, not a
-- replacement, so the old zero/one-arg overloads are dropped first (same
-- pattern as 0043).

drop function if exists list_certificates_overview();

create or replace function list_certificates_overview(p_search text default null, p_limit int default 25, p_offset int default 0)
returns table (
  certificate_id uuid, serial text, course_title text, issued_at timestamptz,
  student_id uuid, student_name text, student_email text, school_name text
) as $$
begin
  if not (is_manager() or is_hanbee_staff() or coalesce(my_role() = 'school_staff', false)) then
    raise exception 'not allowed';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then p_limit := 25; end if;
  if p_offset is null or p_offset < 0 then p_offset := 0; end if;
  return query
  select c.id, c.serial, c.course_title, c.issued_at, c.user_id, p.full_name, p.email, o.name
  from certificates c
  join profiles p on p.id = c.user_id
  left join lateral (
    select org.name
    from organization_members om join organizations org on org.id = om.org_id
    where om.user_id = c.user_id
    order by (om.status = 'active') desc, om.joined_at desc
    limit 1
  ) o on true
  where (is_manager() or is_hanbee_staff() or is_student_in_my_school(c.user_id))
    and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%' or c.course_title ilike '%' || p_search || '%')
  order by c.issued_at desc
  limit p_limit offset p_offset;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function list_certificates_overview_count(p_search text default null)
returns int as $$
begin
  if not (is_manager() or is_hanbee_staff() or coalesce(my_role() = 'school_staff', false)) then
    raise exception 'not allowed';
  end if;
  return (
    select count(*)::int
    from certificates c
    join profiles p on p.id = c.user_id
    where (is_manager() or is_hanbee_staff() or is_student_in_my_school(c.user_id))
      and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%' or c.course_title ilike '%' || p_search || '%')
  );
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function list_certificates_overview(text, int, int), list_certificates_overview_count(text) from public, anon;
grant execute on function list_certificates_overview(text, int, int), list_certificates_overview_count(text) to authenticated;

drop function if exists list_addable_students(uuid);

create or replace function list_addable_students(p_tournament uuid, p_search text default null, p_limit int default 25, p_offset int default 0)
returns table (student_id uuid, full_name text, email text) as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then p_limit := 25; end if;
  if p_offset is null or p_offset < 0 then p_offset := 0; end if;
  return query
  select p.id, p.full_name, p.email
  from organization_members m
  join profiles p on p.id = m.user_id
  where my_role() = 'school_staff' and m.org_id = my_org_id() and m.status = 'active'
    and m.member_role = 'student' and p.account_status = 'active'
    and not exists (select 1 from tournament_team_members x
                    where x.tournament_id = p_tournament and x.student_id = p.id)
    and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%')
  order by p.full_name
  limit p_limit offset p_offset;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function list_addable_students_count(p_tournament uuid, p_search text default null)
returns int as $$
  select count(*)::int
  from organization_members m
  join profiles p on p.id = m.user_id
  where my_role() = 'school_staff' and m.org_id = my_org_id() and m.status = 'active'
    and m.member_role = 'student' and p.account_status = 'active'
    and not exists (select 1 from tournament_team_members x
                    where x.tournament_id = p_tournament and x.student_id = p.id)
    and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%');
$$ language sql stable security definer set search_path = public;

-- The old list_addable_students(uuid) had an explicit revoke/grant block
-- (0027); this new signature is a distinct function and needs its own.
revoke all on function list_addable_students(uuid, text, int, int), list_addable_students_count(uuid, text) from public, anon;
grant execute on function list_addable_students(uuid, text, int, int), list_addable_students_count(uuid, text) to authenticated;
