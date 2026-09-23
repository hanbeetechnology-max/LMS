-- HanbeeLms — staff self-signup approval gate. See docs/PLAN.md §10.42.
--
-- THE RULE: staff self-signup (frontend/src/pages/SignupPage.tsx) stays a
-- real, working feature, but a self-service staff account can't touch any
-- staff-privileged data — or log in to a working dashboard at all — until an
-- existing manager approves them. Every other signup path (invited, of any
-- role; student; the one-time manager bootstrap) is unaffected and comes in
-- pre-approved, since there's no trust question for those paths.
--
-- This is enforced at the database level, not just the UI: is_staff_or_manager()
-- — the function nearly every RLS policy in 0002_rls.sql calls — now also
-- requires approved = true for the staff role, so an unapproved staff
-- account is really and truly locked out even if the frontend gate were
-- somehow bypassed.

alter table profiles add column approved boolean not null default true;

create or replace function handle_new_user()
returns trigger as $$
declare
  requested_role text := new.raw_user_meta_data->>'role';
  final_role user_role;
  final_approved boolean := true;
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
    final_approved := false;
  else
    final_role := 'student';
  end if;

  insert into public.profiles (id, email, full_name, role, approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    final_role,
    final_approved
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

-- Real enforcement, not just a UI gate: every policy built on
-- is_staff_or_manager() now also excludes an unapproved staff account.
create or replace function is_staff_or_manager() returns boolean as $$
  select my_role() in ('manager') or (my_role() = 'staff' and (select approved from profiles where id = auth.uid()));
$$ language sql stable security definer set search_path = public;

-- A manager needs to flip `approved` on someone else's row to approve them —
-- the existing "a user can update only their own profile" policy doesn't
-- cover that.
create policy "manager updates any profile"
  on profiles for update
  using (my_role() = 'manager');
