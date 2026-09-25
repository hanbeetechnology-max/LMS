-- Backend hardening (docs/SECURITY_PLAN.md items 11 to 15).
--   11  a school can replace its shared join link
--   12  the audit log cannot be edited or deleted, and records more events
--   13  the public certificate check shows a shortened name
--   14  chat: typing/online channels are private; a new group member cannot
--       read messages sent before they joined; classmates in a group can no
--       longer read each other's profile rows (names still come from the
--       chat functions)
--   15  caps on invitations per hour and on schools or staff applications
--       waiting for verification
-- (Statement timeouts of 3s anonymous and 8s signed-in are already set by
-- Supabase.)

-- ---------------------------------------------------------------------------
-- 11. Rotate a school's join link
-- ---------------------------------------------------------------------------
create or replace function rotate_school_join_link(p_org uuid)
returns text as $$
declare
  -- 32 random hex characters (built in; the pgcrypto helpers are not on this function's search path)
  v_token text := replace(gen_random_uuid()::text, '-', '');
begin
  if not (is_org_owner(p_org) or is_manager() or is_hanbee_staff()) then
    raise exception 'not allowed';
  end if;
  update organizations set join_token = v_token where id = p_org;
  if not found then raise exception 'school not found'; end if;
  perform log_audit('rotate_join_link', 'organization', p_org, '{}'::jsonb);
  return v_token;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function rotate_school_join_link(uuid) from public, anon;
grant execute on function rotate_school_join_link(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. Append-only audit log, plus more events
-- ---------------------------------------------------------------------------
revoke update, delete, truncate on audit_log from anon, authenticated;

-- Blocks every change unless the connection is the database owner and has
-- said so explicitly (used only by the demo clean-up script). Client
-- connections run as authenticated or anon and can never satisfy this.
create or replace function audit_log_immutable() returns trigger as $$
begin
  if current_user = 'postgres' and coalesce(current_setting('app.audit_maintenance', true), '') = 'true' then
    return coalesce(old, new);
  end if;
  raise exception 'the audit log cannot be changed';
end;
$$ language plpgsql security definer set search_path = public;

create trigger audit_log_no_update_delete
  before update or delete on audit_log
  for each row execute function audit_log_immutable();
create trigger audit_log_no_truncate
  before truncate on audit_log
  for each statement execute function audit_log_immutable();

-- Role, approval, account status and solo changes on any profile.
create or replace function audit_profile_change() returns trigger as $$
begin
  if new.role is distinct from old.role or new.approved is distinct from old.approved
     or new.account_status is distinct from old.account_status or new.is_solo is distinct from old.is_solo then
    insert into audit_log (actor_id, action, target_type, target_id, meta)
    values (auth.uid(), 'profile_changed', 'profile', new.id, jsonb_build_object(
      'role', jsonb_build_array(old.role, new.role),
      'approved', jsonb_build_array(old.approved, new.approved),
      'status', jsonb_build_array(old.account_status, new.account_status),
      'solo', jsonb_build_array(old.is_solo, new.is_solo)));
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger trg_audit_profile_change after update on profiles
  for each row execute function audit_profile_change();

create or replace function audit_org_status_change() returns trigger as $$
begin
  if new.status is distinct from old.status then
    insert into audit_log (actor_id, action, target_type, target_id, meta)
    values (auth.uid(), 'school_status_changed', 'organization', new.id,
            jsonb_build_object('status', jsonb_build_array(old.status, new.status)));
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger trg_audit_org_status after update on organizations
  for each row execute function audit_org_status_change();

create or replace function audit_membership_change() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into audit_log (actor_id, action, target_type, target_id, meta)
    values (auth.uid(), 'membership_added', 'organization', new.org_id,
            jsonb_build_object('user', new.user_id, 'member_role', new.member_role));
  elsif new.status is distinct from old.status then
    insert into audit_log (actor_id, action, target_type, target_id, meta)
    values (auth.uid(), 'membership_ended', 'organization', new.org_id,
            jsonb_build_object('user', new.user_id, 'member_role', new.member_role));
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger trg_audit_membership after insert or update on organization_members
  for each row execute function audit_membership_change();

-- ---------------------------------------------------------------------------
-- 13. Public certificate check: first name and last initial only
-- ---------------------------------------------------------------------------
create or replace function verify_certificate(p_certificate_id uuid)
returns table (id uuid, user_name text, course_title text, issued_at timestamptz, serial text) as $$
  select c.id,
         split_part(trim(p.full_name), ' ', 1)
           || case when position(' ' in trim(p.full_name)) > 0
                   then ' ' || left(regexp_replace(trim(p.full_name), '^.* ', ''), 1) || '.'
                   else '' end,
         c.course_title, c.issued_at, c.serial
  from certificates c
  join profiles p on p.id = c.user_id
  where c.id = p_certificate_id;
$$ language sql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 14a. A new group member cannot read messages sent before they joined.
--      Existing members keep everything they can see today.
-- ---------------------------------------------------------------------------
update conversation_participants cp
   set joined_at = least(
     cp.joined_at,
     (select c.created_at from conversations c where c.id = cp.conversation_id),
     coalesce((select min(m.created_at) from messages m where m.conversation_id = cp.conversation_id), cp.joined_at)
   );

create or replace function can_read_message(p_conv uuid, p_at timestamptz)
returns boolean as $$
  select is_active_account() and exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = p_conv and cp.user_id = auth.uid() and p_at >= cp.joined_at
  );
$$ language sql stable security definer set search_path = public;

grant execute on function can_read_message(uuid, timestamptz) to authenticated;

drop policy "a participant reads messages in their conversations" on messages;
create policy "a participant reads messages sent since they joined"
  on messages for select using (can_read_message(conversation_id, created_at));

-- ---------------------------------------------------------------------------
-- 14b. Profile rows of people you only share a GROUP chat with are hidden.
--      (Direct chat partners, school staff and Hanbee staff stay visible; group
--      member names still come from chat_members()/chat_conversations().)
-- ---------------------------------------------------------------------------
create or replace function can_see_profile(p_profile_id uuid)
returns boolean as $$
  select
    is_active_account()
    and (
      p_profile_id = auth.uid()
      or is_staff_or_manager()
      or exists (
        select 1 from profiles p
        where p.id = p_profile_id and p.role in ('staff', 'manager') and p.approved and p.account_status = 'active'
      )
      or exists (
        select 1
        from organization_members mine
        join organization_members theirs on theirs.org_id = mine.org_id and theirs.status = 'active'
        where mine.user_id = auth.uid() and mine.status = 'active'
          and theirs.user_id = p_profile_id
          and (mine.member_role in ('owner', 'staff') or theirs.member_role in ('owner', 'staff'))
      )
      or exists (
        select 1
        from conversation_participants mine
        join conversations cv on cv.id = mine.conversation_id and cv.kind = 'direct'
        join conversation_participants theirs on theirs.conversation_id = mine.conversation_id
        where mine.user_id = auth.uid() and theirs.user_id = p_profile_id
      )
      or exists (
        select 1 from discussion_threads t
        where t.author_id = p_profile_id and is_enrolled_in_course(t.course_id)
      )
      or exists (
        select 1
        from discussion_posts dp
        join discussion_threads t on t.id = dp.thread_id
        where dp.author_id = p_profile_id and is_enrolled_in_course(t.course_id)
      )
    );
$$ language sql stable security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 14c. Private realtime channel for typing and online status. Only members of
--      the conversation named in the topic ("chat-presence:<conversation id>")
--      may listen or send.
-- ---------------------------------------------------------------------------
create or replace function chat_topic_allowed(p_topic text)
returns boolean as $$
declare
  v_conv uuid;
begin
  if p_topic is null or p_topic not like 'chat-presence:%' then
    return false;
  end if;
  begin
    v_conv := split_part(p_topic, ':', 2)::uuid;
  exception when others then
    return false;
  end;
  return is_participant_of(v_conv) and is_active_account();
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function chat_topic_allowed(text) to authenticated;

create policy "chat presence: members listen"
  on realtime.messages for select to authenticated
  using (chat_topic_allowed(realtime.topic()));
create policy "chat presence: members send"
  on realtime.messages for insert to authenticated
  with check (chat_topic_allowed(realtime.topic()));

-- ---------------------------------------------------------------------------
-- 15. Caps against floods
-- ---------------------------------------------------------------------------
create or replace function invitation_rate_limit() returns trigger as $$
begin
  if auth.uid() is null then return new; end if;
  if (select count(*) from invitations where invited_by = auth.uid() and created_at > now() - interval '1 hour') >= 400 then
    raise exception 'too many invitations this hour; please try again later';
  end if;
  if new.role <> 'student' and new.org_id is not null
     and (select count(*) from invitations where org_id = new.org_id and role <> 'student' and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many staff invitations today';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
create trigger trg_invitation_rate_limit before insert on invitations
  for each row execute function invitation_rate_limit();

-- Protects the manager's verification queue from being flooded by sign-ups.
-- (Two separate functions: a single shared one cannot read `new.status` on the
-- profiles table, which has no such column.)
create or replace function pending_schools_cap() returns trigger as $$
begin
  if new.status = 'pending' and (select count(*) from organizations where status = 'pending') >= 25 then
    raise exception 'too many schools are waiting for verification; please try again later';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function pending_staff_cap() returns trigger as $$
begin
  if new.role = 'staff' and not new.approved
     and (select count(*) from profiles where role = 'staff' and not approved) >= 25 then
    raise exception 'too many staff applications are waiting; please try again later';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_pending_schools_cap before insert on organizations
  for each row execute function pending_schools_cap();
create trigger trg_pending_staff_cap before insert on profiles
  for each row execute function pending_staff_cap();
