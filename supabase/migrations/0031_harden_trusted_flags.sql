-- Hardening: the "trusted write" flags (app.trusted_*_write) exist so that
-- SECURITY DEFINER functions can bypass the guard triggers. A flag is only
-- meaningful when set by such a function, so the guards now honour it only
-- when the running role is not a client role. Inside a definer function the
-- role is the function owner; a direct client statement runs as
-- authenticated or anon and can no longer switch a guard off. (PostgREST does
-- not expose set_config, so this closes a theoretical path, cheaply.)

create or replace function guard_profile_self_escalation()
returns trigger as $$
begin
  if auth.uid() is null
     or (coalesce(current_setting('app.trusted_profile_write', true), '') = 'true'
         and current_user not in ('authenticated', 'anon')) then
    return new;
  end if;
  -- coalesce: a suspended caller has a null role, which must count as "not a manager".
  if not coalesce((select my_role() = 'manager'), false) then
    new.role := old.role;
    new.approved := old.approved;
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;

create or replace function guard_invitation() returns trigger as $$
begin
  if auth.uid() is null
     or (coalesce(current_setting('app.trusted_invitation_write', true), '') = 'true'
         and current_user not in ('authenticated', 'anon')) then
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

create or replace function guard_auto_attendance_update()
returns trigger as $$
begin
  if not (coalesce(current_setting('app.trusted_attendance_write', true), '') = 'true'
          and current_user not in ('authenticated', 'anon')) then
    new.status := old.status;
    new.ended_at := old.ended_at;
    new.expires_at := old.expires_at;
    new.login_at := old.login_at;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;
