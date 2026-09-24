-- Chat v2: contact rules enforced in the database, automatic school groups,
-- manager pinned chats, read state, rate limit, realtime.
--
-- Rules baked in here:
--  * Who may start a chat with whom is decided by chat_relation_dir (one
--    direction) and enforced by start_conversation_with. Nothing else can
--    create a conversation: clients have no INSERT policy on conversations or
--    conversation_participants.
--  * A message from a client is always kind 'text' and always from auth.uid().
--    System messages (joined/left) come only from SECURITY DEFINER functions
--    that raise the transaction-local flag app.trusted_chat_write.
--  * Membership rows drive school groups; students never add or remove anyone.
--  * No policy or helper here reads conversation_participants through its own
--    RLS (see 0015): SECURITY DEFINER helpers only.

-- ----------------------------------------------------------------------------
-- Schema
-- ----------------------------------------------------------------------------
create type conversation_kind as enum ('direct', 'group', 'support');
create type chat_member_role as enum ('admin', 'member');
create type message_kind as enum ('text', 'system');

alter table conversations
  add column kind conversation_kind not null default 'direct',
  add column title text,
  add column org_id uuid references organizations(id) on delete set null,
  add column created_by uuid references profiles(id) on delete set null;

-- One automatic group per school.
create unique index conversations_one_group_per_org on conversations (org_id) where kind = 'group';

alter table conversation_participants
  add column member_role chat_member_role not null default 'member',
  add column last_read_at timestamptz not null default now(),
  add column joined_at timestamptz not null default now();
create index on conversation_participants (user_id);

alter table messages
  add column kind message_kind not null default 'text',
  add constraint messages_body_length check (char_length(btrim(body)) >= 1 and char_length(body) <= 4000);
-- clock_timestamp so ordering and the rate limit are exact even inside one transaction.
alter table messages alter column created_at set default clock_timestamp();
create index on messages (conversation_id, created_at desc);
create index on messages (sender_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Contact rules
-- ----------------------------------------------------------------------------

-- May a start a chat with b? Returns the relation label of b as seen by a, or
-- null. One direction only; chat_can_message adds the reply direction.
create or replace function chat_relation_dir(a uuid, b uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  pa profiles;
  pb profiles;
  a_org uuid; a_mrole org_member_role;
  b_org uuid; b_mrole org_member_role;
begin
  if a is null or b is null or a = b then return null; end if;
  select * into pa from profiles where id = a and account_status = 'active';
  select * into pb from profiles where id = b and account_status = 'active';
  if pa.id is null or pb.id is null then return null; end if;
  -- Hanbee staff take part only once approved.
  if (pa.role = 'staff' and not pa.approved) or (pb.role = 'staff' and not pb.approved) then return null; end if;

  select m.org_id, m.member_role into a_org, a_mrole
    from organization_members m join organizations o on o.id = m.org_id and o.status = 'active'
    where m.user_id = a and m.status = 'active' limit 1;
  select m.org_id, m.member_role into b_org, b_mrole
    from organization_members m join organizations o on o.id = m.org_id and o.status = 'active'
    where m.user_id = b and m.status = 'active' limit 1;

  if pa.role = 'manager' then
    if pb.role = 'manager' then return 'manager'; end if;
    if pb.role = 'staff' then return 'hanbee_staff'; end if;
    if pb.role = 'school_staff' then
      if b_org is null then return null; end if;
      return case when b_mrole = 'owner' then 'school_owner' else 'school_staff' end;
    end if;
    return 'student';

  elsif pa.role = 'staff' then
    if pb.role = 'manager' then return 'manager'; end if;
    if pb.role = 'staff' then return 'hanbee_staff'; end if;
    if pb.role = 'school_staff' then
      if b_org is not null and b_mrole = 'owner' then return 'school_owner'; end if;
      return null;
    end if;
    if pb.role = 'student' and exists (
      select 1 from enrollments e
      join sections s on s.id = e.section_id
      join courses c on c.id = s.course_id
      where e.student_id = b and c.owner_id = a and e.status in ('active', 'completed')
    ) then return 'student'; end if;
    return null;

  elsif pa.role = 'school_staff' then
    if a_org is null then return null; end if;
    if pb.role = 'manager' then return 'manager'; end if;
    if pb.role = 'staff' then return 'hanbee_staff'; end if;
    if pb.role = 'school_staff' and b_org = a_org then return 'colleague'; end if;
    if pb.role = 'student' and b_org = a_org and b_mrole = 'student' then return 'student'; end if;
    return null;

  elsif pa.role = 'student' then
    if pb.role = 'school_staff' and a_org is not null and b_org = a_org and b_mrole in ('owner', 'staff') then
      return 'school_staff';
    end if;
    if pb.role = 'staff' and exists (
      select 1 from enrollments e
      join sections s on s.id = e.section_id
      join courses c on c.id = s.course_id
      where e.student_id = a and c.owner_id = b and e.status in ('active', 'completed')
    ) then return 'instructor'; end if;
    return null;
  end if;
  return null;
end;
$$;

-- May a send to b? Start rule, or the reverse rule when they already share a
-- direct conversation (so whoever was allowed to write first can be answered).
create or replace function chat_can_message(a uuid, b uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is not null and auth.uid() not in (a, b) then return false; end if;
  if chat_relation_dir(a, b) is not null then return true; end if;
  return chat_relation_dir(b, a) is not null and chat_direct_between(a, b) is not null;
end;
$$;

-- The existing 2-person direct conversation between a and b (never a bigger group).
create or replace function chat_direct_between(a uuid, b uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select c.id from conversations c
  where c.kind = 'direct'
    and exists (select 1 from conversation_participants x where x.conversation_id = c.id and x.user_id = a)
    and exists (select 1 from conversation_participants y where y.conversation_id = c.id and y.user_id = b)
    and (select count(*) from conversation_participants z where z.conversation_id = c.id) = 2
  limit 1;
$$;

create or replace function chat_contacts()
returns table (user_id uuid, full_name text, role user_role, relation text, org_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role, r.rel, o.name
  from profiles p
  cross join lateral (select chat_relation_dir(auth.uid(), p.id) as rel) r
  left join lateral (
    select org.name from organization_members m join organizations org on org.id = m.org_id
    where m.user_id = p.id and m.status = 'active' and org.status = 'active' limit 1
  ) o on true
  where auth.uid() is not null and p.id <> auth.uid() and r.rel is not null
  order by p.full_name;
$$;

-- Find or create the 2-person direct conversation (internal; callers checked the rules).
create or replace function chat_find_or_create_direct(a uuid, b uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare conv uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended((select string_agg(x::text, '|' order by x) from unnest(array[a, b]) as x), 0));
  conv := chat_direct_between(a, b);
  if conv is null then
    insert into conversations (kind, created_by) values ('direct', a) returning id into conv;
    insert into conversation_participants (conversation_id, user_id) values (conv, a), (conv, b);
  end if;
  return conv;
end;
$$;

-- Same name and signature as 0014, now rule-enforcing.
create or replace function start_conversation_with(other_user_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other_user_id = me then raise exception 'cannot start a conversation with yourself'; end if;
  if not exists (select 1 from profiles where id = other_user_id) then raise exception 'unknown user'; end if;
  if not is_active_account() then raise exception 'your account cannot send messages'; end if;

  conv := chat_direct_between(me, other_user_id);
  if conv is null then
    if chat_relation_dir(me, other_user_id) is null then
      raise exception 'you are not allowed to message this person';
    end if;
  elsif not chat_can_message(me, other_user_id) then
    raise exception 'you are not allowed to message this person';
  end if;
  return chat_find_or_create_direct(me, other_user_id);
end;
$$;

-- ----------------------------------------------------------------------------
-- System messages and group management
-- ----------------------------------------------------------------------------
create or replace function chat_post_system(p_conv uuid, p_sender uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.trusted_chat_write', 'true', true);
  insert into messages (conversation_id, sender_id, body, kind) values (p_conv, p_sender, p_body, 'system');
  perform set_config('app.trusted_chat_write', '', true);
end;
$$;

-- May the caller add/remove people in this group?
create or replace function chat_can_manage(p_conv uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c conversations;
begin
  if auth.uid() is null or not is_active_account() then return false; end if;
  select * into c from conversations where id = p_conv;
  if c.id is null or c.kind <> 'group' then return false; end if;
  if is_manager() or is_hanbee_staff() then return true; end if;
  return c.org_id is not null and can_manage_org(c.org_id)
    and exists (select 1 from conversation_participants where conversation_id = p_conv and user_id = auth.uid() and member_role = 'admin');
end;
$$;

create or replace function chat_add_member(p_conversation_id uuid, p_user_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  c conversations;
  t profiles;
  t_mrole org_member_role;
  v_role chat_member_role := 'member';
  n int;
begin
  if not chat_can_manage(p_conversation_id) then raise exception 'not allowed'; end if;
  select * into c from conversations where id = p_conversation_id;
  select * into t from profiles where id = p_user_id and account_status = 'active';
  if t.id is null then raise exception 'unknown or inactive user'; end if;
  if t.role = 'manager' or (t.role = 'staff' and t.approved) then
    v_role := 'admin';
  else
    select m.member_role into t_mrole from organization_members m
      where m.org_id = c.org_id and m.user_id = p_user_id and m.status = 'active';
    if t_mrole is null then raise exception 'that person does not belong to this school'; end if;
    if t_mrole in ('owner', 'staff') then v_role := 'admin'; end if;
  end if;
  insert into conversation_participants (conversation_id, user_id, member_role)
  values (p_conversation_id, p_user_id, v_role) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then perform chat_post_system(p_conversation_id, p_user_id, t.full_name || ' joined'); end if;
  return n > 0;
end;
$$;

create or replace function chat_remove_member(p_conversation_id uuid, p_user_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  c conversations;
  v_name text;
  n int;
begin
  if not chat_can_manage(p_conversation_id) then raise exception 'not allowed'; end if;
  select * into c from conversations where id = p_conversation_id;
  if exists (select 1 from organization_members m where m.org_id = c.org_id and m.user_id = p_user_id
             and m.status = 'active' and m.member_role = 'owner') then
    raise exception 'the school owner cannot be removed from the school group';
  end if;
  delete from conversation_participants where conversation_id = p_conversation_id and user_id = p_user_id;
  get diagnostics n = row_count;
  if n > 0 then
    select full_name into v_name from profiles where id = p_user_id;
    perform chat_post_system(p_conversation_id, p_user_id, coalesce(v_name, 'Someone') || ' left');
  end if;
  return n > 0;
end;
$$;

-- ----------------------------------------------------------------------------
-- Read state and listing
-- ----------------------------------------------------------------------------
create or replace function chat_mark_read(p_conversation_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then return false; end if;
  update conversation_participants set last_read_at = clock_timestamp()
  where conversation_id = p_conversation_id and user_id = auth.uid();
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

create or replace function chat_conversations()
returns table (
  id uuid, kind conversation_kind, title text, org_id uuid,
  other_user_id uuid, other_full_name text, other_role user_role,
  last_body text, last_kind message_kind, last_at timestamptz, last_sender_name text,
  unread_count int, participant_count int, my_member_role chat_member_role, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, c.kind, c.title, c.org_id,
         o.uid, o.full_name, o.role,
         lm.body, lm.kind, lm.created_at, lm.sender_name,
         coalesce(u.n, 0)::int, coalesce(pc.n, 0)::int, cp.member_role, c.created_at
  from conversation_participants cp
  join conversations c on c.id = cp.conversation_id
  left join lateral (
    select p.id as uid, p.full_name, p.role
    from conversation_participants x join profiles p on p.id = x.user_id
    where c.kind = 'direct' and x.conversation_id = c.id and x.user_id <> cp.user_id
    limit 1
  ) o on true
  left join lateral (
    select m.body, m.kind, m.created_at, p.full_name as sender_name
    from messages m join profiles p on p.id = m.sender_id
    where m.conversation_id = c.id
    order by m.created_at desc, m.id desc limit 1
  ) lm on true
  left join lateral (
    select count(*) as n from messages m
    where m.conversation_id = c.id and m.sender_id <> cp.user_id and m.kind = 'text' and m.created_at > cp.last_read_at
  ) u on true
  left join lateral (select count(*) as n from conversation_participants x where x.conversation_id = c.id) pc on true
  where cp.user_id = auth.uid() and is_active_account()
  order by lm.created_at desc nulls last, c.created_at desc;
$$;

create or replace function chat_members(p_conversation_id uuid)
returns table (user_id uuid, full_name text, role user_role, member_role chat_member_role, joined_at timestamptz, can_add boolean, can_remove boolean)
language sql stable security definer set search_path = public as $$
  select cp.user_id, p.full_name, p.role, cp.member_role, cp.joined_at,
         mg.ok, (mg.ok and not exists (
           select 1 from organization_members m
           where m.org_id = c.org_id and m.user_id = cp.user_id and m.status = 'active' and m.member_role = 'owner'))
  from conversations c
  cross join lateral (select chat_can_manage(p_conversation_id) as ok) mg
  join conversation_participants cp on cp.conversation_id = c.id
  join profiles p on p.id = cp.user_id
  where c.id = p_conversation_id and is_active_account()
    and (mg.ok or exists (select 1 from conversation_participants me where me.conversation_id = c.id and me.user_id = auth.uid()))
  order by cp.member_role, p.full_name;
$$;

-- ----------------------------------------------------------------------------
-- Messages: forced kind/sender, active account, participant, contact rule, rate limit
-- ----------------------------------------------------------------------------
-- SECURITY INVOKER on purpose: inside chat_post_system (SECURITY DEFINER) current_user is the
-- function owner, whereas a client insert runs as 'authenticated'. So a client that sets the
-- app.trusted_chat_write flag by itself is still not trusted.
create or replace function messages_before_insert() returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  v_kind conversation_kind;
  v_other uuid;
begin
  if auth.uid() is null
     or (coalesce(current_setting('app.trusted_chat_write', true), '') = 'true' and current_user not in ('authenticated', 'anon')) then
    return new;
  end if;
  new.kind := 'text';
  new.sender_id := auth.uid();
  if not is_active_account() then raise exception 'your account cannot send messages'; end if;
  if not is_participant_of(new.conversation_id) then
    raise exception 'you are not a member of this conversation';
  end if;
  select kind into v_kind from conversations where id = new.conversation_id;
  if v_kind = 'direct' then
    select user_id into v_other from conversation_participants
      where conversation_id = new.conversation_id and user_id <> auth.uid() limit 1;
    if v_other is null or not chat_can_message(auth.uid(), v_other) then
      raise exception 'you are not allowed to message this person';
    end if;
  end if;
  if (select count(*) from messages where sender_id = auth.uid() and kind = 'text'
        and created_at > clock_timestamp() - interval '1 minute') >= 30 then
    raise exception 'You are sending messages too fast. Please wait a moment.';
  end if;
  return new;
end;
$$;
create trigger messages_before_insert before insert on messages
  for each row execute function messages_before_insert();

-- ----------------------------------------------------------------------------
-- RLS: participants only, active accounts only, via SECURITY DEFINER helper
-- ----------------------------------------------------------------------------
drop policy "a participant sees their own conversations" on conversations;
create policy "a participant sees their own conversations"
  on conversations for select using (is_participant_of(id) and is_active_account());

drop policy "a participant sees the participant list of their conversations" on conversation_participants;
create policy "a participant sees the participant list of their conversations"
  on conversation_participants for select using (is_participant_of(conversation_id) and is_active_account());

drop policy "a participant reads messages in their conversations" on messages;
create policy "a participant reads messages in their conversations"
  on messages for select using (is_participant_of(conversation_id) and is_active_account());

drop policy "a participant sends messages as themselves" on messages;
create policy "a participant sends messages as themselves"
  on messages for insert
  with check (sender_id = auth.uid() and is_participant_of(conversation_id) and is_active_account());

-- ----------------------------------------------------------------------------
-- School groups
-- ----------------------------------------------------------------------------
create or replace function chat_ensure_school_group(p_org uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o organizations;
  conv uuid;
begin
  select * into o from organizations where id = p_org and status = 'active';
  if o.id is null then return null; end if;
  select id into conv from conversations where org_id = p_org and kind = 'group';
  if conv is null then
    insert into conversations (kind, title, org_id, created_by)
    values ('group', o.name || ' - Students', p_org, o.created_by) returning id into conv;
  end if;
  insert into conversation_participants (conversation_id, user_id, member_role)
  select conv, m.user_id, case when m.member_role = 'student' then 'member'::chat_member_role else 'admin'::chat_member_role end
  from organization_members m join profiles p on p.id = m.user_id
  where m.org_id = p_org and m.status = 'active' and p.account_status = 'active'
  on conflict do nothing;
  return conv;
end;
$$;

-- Idempotent: every active manager gets a direct chat with every owner of an
-- active school and every approved active Hanbee staff.
create or replace function provision_manager_chats() returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select m.id as mgr, t.id as target
    from profiles m
    join profiles t on t.id <> m.id and t.account_status = 'active' and (
      (t.role = 'staff' and t.approved)
      or exists (select 1 from organization_members om join organizations o on o.id = om.org_id
                 where om.user_id = t.id and om.status = 'active' and om.member_role = 'owner' and o.status = 'active')
    )
    where m.role = 'manager' and m.account_status = 'active'
      and (t.role in ('staff', 'school_staff'))
  loop
    if chat_direct_between(r.mgr, r.target) is null then
      perform chat_find_or_create_direct(r.mgr, r.target);
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

create or replace function trg_org_activated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform chat_ensure_school_group(new.id);
  perform provision_manager_chats();
  return new;
end;
$$;
create trigger organizations_chat_group after update of status on organizations
  for each row when (new.status = 'active' and old.status is distinct from 'active')
  execute function trg_org_activated();

create or replace function trg_membership_chat() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  conv uuid;
  v_name text;
  n int;
begin
  select c.id into conv from conversations c join organizations o on o.id = new.org_id
    where c.org_id = new.org_id and c.kind = 'group' and o.status = 'active';
  if conv is null then return new; end if;
  select full_name into v_name from profiles where id = new.user_id;
  if new.status = 'active' then
    insert into conversation_participants (conversation_id, user_id, member_role)
    values (conv, new.user_id, case when new.member_role = 'student' then 'member'::chat_member_role else 'admin'::chat_member_role end)
    on conflict do nothing;
    get diagnostics n = row_count;
    if n > 0 then perform chat_post_system(conv, new.user_id, coalesce(v_name, 'Someone') || ' joined'); end if;
  else
    delete from conversation_participants where conversation_id = conv and user_id = new.user_id;
    get diagnostics n = row_count;
    if n > 0 then perform chat_post_system(conv, new.user_id, coalesce(v_name, 'Someone') || ' left'); end if;
  end if;
  return new;
end;
$$;
create trigger organization_members_chat after insert or update of status on organization_members
  for each row execute function trg_membership_chat();

create or replace function trg_profile_chat() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform provision_manager_chats();
  return new;
end;
$$;
create trigger profiles_chat_provision after insert or update of approved, role, account_status on profiles
  for each row when (new.role in ('manager', 'staff') and new.approved and new.account_status = 'active')
  execute function trg_profile_chat();

-- ----------------------------------------------------------------------------
-- Grants: internals are not callable by clients
-- ----------------------------------------------------------------------------
revoke all on function chat_relation_dir(uuid, uuid), chat_direct_between(uuid, uuid), chat_find_or_create_direct(uuid, uuid),
  chat_post_system(uuid, uuid, text), chat_ensure_school_group(uuid), provision_manager_chats(),
  trg_org_activated(), trg_membership_chat(), trg_profile_chat(), messages_before_insert()
  from public, anon, authenticated;
revoke all on function chat_can_message(uuid, uuid), chat_can_manage(uuid), chat_add_member(uuid, uuid), chat_remove_member(uuid, uuid),
  chat_mark_read(uuid), chat_conversations(), chat_members(uuid), chat_contacts(), start_conversation_with(uuid)
  from public, anon;
grant execute on function chat_can_message(uuid, uuid), chat_can_manage(uuid), chat_add_member(uuid, uuid), chat_remove_member(uuid, uuid),
  chat_mark_read(uuid), chat_conversations(), chat_members(uuid), chat_contacts(), start_conversation_with(uuid)
  to authenticated;

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_participants') then
      alter publication supabase_realtime add table public.conversation_participants;
    end if;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Backfill
-- ----------------------------------------------------------------------------
do $$
declare o record;
begin
  for o in select id from organizations where status = 'active' loop
    perform chat_ensure_school_group(o.id);
  end loop;
  perform provision_manager_chats();
end $$;
