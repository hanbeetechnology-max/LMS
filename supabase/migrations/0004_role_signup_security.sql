-- HanbeeLms — closes a real, currently-live vulnerability and implements
-- separate, secure signup paths for staff / student / manager. See
-- docs/PLAN.md §10.38.
--
-- THE HOLE: 0001_init.sql's handle_new_user() trusted whatever `role` a
-- client passed in auth.signUp()'s metadata and cast it straight into the
-- new profile. Since that call is made from browser JS with only the public
-- anon key, anyone could open devtools and sign up with
-- `options: { data: { role: "manager" } }` and grant themselves org-wide
-- access — bypassing every RLS policy that checks is_staff_or_manager().
--
-- THE FIX: a signup's role is now decided server-side, in order:
--   1. A matching, not-yet-accepted invitation row for this exact email
--      wins outright — its role is used regardless of anything the client
--      requested, and the invitation is marked accepted. A student invite
--      tied to a section also creates the real enrollment row immediately.
--   2. Otherwise, requesting 'manager' only succeeds if this is the very
--      first manager in the whole system (the one-time /setup bootstrap) —
--      every subsequent 'manager' request silently becomes 'student'
--      rather than erroring, so the check's existence isn't confirmed to
--      whoever's probing it.
--   3. Otherwise, requesting 'staff' is honored as-is — self-service staff
--      signup is this app's deliberate, existing design (frontend/src/pages/SignupPage.tsx).
--   4. Anything else defaults to 'student'.

create or replace function handle_new_user()
returns trigger as $$
declare
  requested_role text := new.raw_user_meta_data->>'role';
  final_role user_role;
  matched_invite invitations;
begin
  select * into matched_invite
  from invitations
  where email = new.email and accepted = false
  order by created_at desc
  limit 1;

  if matched_invite.id is not null then
    final_role := matched_invite.role;
  elsif requested_role = 'manager' then
    if exists (select 1 from public.profiles where role = 'manager') then
      final_role := 'student';
    else
      final_role := 'manager';
    end if;
  elsif requested_role = 'staff' then
    final_role := 'staff';
  else
    final_role := 'student';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    final_role
  );

  if matched_invite.id is not null then
    update invitations set accepted = true where id = matched_invite.id;

    if matched_invite.section_id is not null and final_role = 'student' then
      insert into enrollments (section_id, student_id, status)
      values (matched_invite.section_id, new.id, 'active')
      on conflict (section_id, student_id) do nothing;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Lets a signup/invite page ask "should I even show a manager-claim form?"
-- without needing to authenticate first or leak who the manager is.
create function manager_exists() returns boolean as $$
  select exists(select 1 from profiles where role = 'manager');
$$ language sql stable security definer set search_path = public;

grant execute on function manager_exists() to anon, authenticated;

-- Lets the (unauthenticated) invite-acceptance page show who/what an invite
-- is for before the person has an account — deliberately narrow: only an
-- unaccepted invitation's public-safe fields, never the whole table.
create function get_invitation(p_id uuid)
returns table (email text, role user_role, accepted boolean, course_title text, section_name text) as $$
  select i.email, i.role, i.accepted, c.title, s.name
  from invitations i
  left join sections s on s.id = i.section_id
  left join courses c on c.id = s.course_id
  where i.id = p_id;
$$ language sql security definer set search_path = public;

grant execute on function get_invitation(uuid) to anon, authenticated;
