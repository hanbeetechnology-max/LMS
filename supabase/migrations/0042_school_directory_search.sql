-- Add server-side search and pagination to the school directory, so the
-- Hanbee/manager Schools page doesn't have to fetch every school to filter
-- client-side as the platform grows.
--
-- Postgres treats a new parameter list as a distinct overload, not a
-- replacement, so a zero-arg call would become ambiguous between the old
-- school_directory() and this one (every param defaulted) unless the old
-- one is dropped first.
drop function if exists school_directory();

create or replace function school_directory(p_search text default null, p_limit int default 25, p_offset int default 0)
returns table (
  org_id uuid, name text, status text, owner_name text, owner_email text,
  students int, teams int, participants int, created_at timestamptz, verified_by text
) as $$
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then p_limit := 25; end if;
  if p_offset is null or p_offset < 0 then p_offset := 0; end if;
  return query
  select o.id, o.name, o.status::text,
    (select p.full_name from organization_members m join profiles p on p.id = m.user_id
      where m.org_id = o.id and m.member_role = 'owner' order by m.joined_at limit 1),
    (select p.email from organization_members m join profiles p on p.id = m.user_id
      where m.org_id = o.id and m.member_role = 'owner' order by m.joined_at limit 1),
    (select count(*)::int from organization_members m where m.org_id = o.id and m.status = 'active' and m.member_role = 'student'),
    (select count(*)::int from tournament_teams t where t.org_id = o.id),
    (select count(distinct tm.student_id)::int from tournament_team_members tm join tournament_teams t on t.id = tm.team_id
      where t.org_id = o.id and t.status::text not in ('rejected', 'withdrawn')),
    o.created_at,
    (select full_name from profiles where id = o.verified_by)
  from organizations o
  where p_search is null or p_search = '' or o.name ilike '%' || p_search || '%'
  order by (o.status = 'pending') desc, o.created_at desc
  limit p_limit offset p_offset;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function school_directory_count(p_search text default null)
returns int as $$
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  return (select count(*)::int from organizations o where p_search is null or p_search = '' or o.name ilike '%' || p_search || '%');
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function school_directory(text, int, int), school_directory_count(text) from public, anon;
grant execute on function school_directory(text, int, int), school_directory_count(text) to authenticated;
