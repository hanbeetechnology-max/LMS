-- join_school (0029) marks the invitation accepted, but guard_invitation
-- (0024) refuses invitation updates from anyone who is not staff or the
-- school's manager. Found by the 0029 test. Trusted SECURITY DEFINER
-- functions now opt in with a transaction-local flag, the same pattern as
-- app.trusted_profile_write (0023) and app.trusted_chat_write (0026).

create or replace function guard_invitation() returns trigger as $$
begin
  if auth.uid() is null or coalesce(current_setting('app.trusted_invitation_write', true), '') = 'true' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.invited_by := auth.uid();
    new.accepted := false;
    new.revoked_at := null;
  else
    -- Only revocation and expiry may change after creation.
    new.invited_by := old.invited_by;
    new.email := old.email;
    new.role := old.role;
    new.org_id := old.org_id;
    new.section_id := old.section_id;
    new.token := old.token;
    new.accepted := old.accepted;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'student' then
      if new.org_id is null then
        if not (is_hanbee_staff() or is_manager()) then
          raise exception 'only Hanbee staff may invite a solo student';
        end if;
      elsif not can_manage_org(new.org_id) then
        raise exception 'you cannot invite students for this school';
      end if;
    elsif new.role = 'school_staff' then
      if new.org_id is null or not (is_org_owner(new.org_id) or is_manager()) then
        raise exception 'only the school owner may invite school staff';
      end if;
    else
      if not is_manager() then
        raise exception 'only a manager may invite staff or manager accounts';
      end if;
    end if;
  elsif not (is_manager() or is_hanbee_staff() or (new.org_id is not null and can_manage_org(new.org_id))) then
    raise exception 'you cannot change this invitation';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function join_school(p_join_token text)
returns jsonb as $$
declare
  me profiles;
  org organizations;
  inv invitations;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null or me.role <> 'student' or me.account_status <> 'active' then
    raise exception 'only an active student can join a school';
  end if;
  if exists (select 1 from organization_members where user_id = me.id and status = 'active') then
    raise exception 'you already belong to a school';
  end if;
  select * into org from organizations where join_token = p_join_token and status = 'active';
  if org.id is null then raise exception 'this school link is invalid'; end if;
  select * into inv from invitations i
   where i.org_id = org.id and lower(i.email) = lower(me.email) and i.role = 'student'
     and not i.accepted and i.revoked_at is null and i.expires_at > now()
   order by i.created_at desc limit 1
   for update;
  if inv.id is null then raise exception 'this email has not been invited by the school'; end if;

  insert into organization_members (org_id, user_id, member_role) values (org.id, me.id, 'student');
  perform set_config('app.trusted_invitation_write', 'true', true);
  update invitations set accepted = true where id = inv.id;
  perform set_config('app.trusted_invitation_write', '', true);
  perform set_config('app.trusted_profile_write', 'true', true);
  update profiles set is_solo = false where id = me.id;
  perform set_config('app.trusted_profile_write', '', true);
  perform log_audit('join_school', 'organization', org.id, '{}'::jsonb);
  return jsonb_build_object('result', 'joined', 'school', org.name);
end;
$$ language plpgsql security definer set search_path = public;
