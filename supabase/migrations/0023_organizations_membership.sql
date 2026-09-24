-- Multi-school platform, step 2: schools (organizations), membership history,
-- account status, and the role helpers every later policy builds on.
--
-- Rules baked in here:
--  * A school is created only by the signup trigger (0024) and changed only
--    by SECURITY DEFINER functions, so no client can write these tables.
--  * Membership keeps history (ended rows stay) so a student's record stays
--    attributed to the school they joined under even after it closes.
--  * A suspended or revoked account loses staff privileges immediately,
--    because my_role() returns null for it.

create type org_status as enum ('pending', 'active', 'suspended', 'closed');
create type org_member_role as enum ('owner', 'staff', 'student');
create type org_member_status as enum ('active', 'ended');
create type account_status as enum ('active', 'suspended', 'revoked');

alter table profiles add column account_status account_status not null default 'active';

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status org_status not null default 'pending',
  registration_no text not null,
  official_email text not null,
  guardian_consent boolean not null default false,
  created_by uuid not null references profiles(id),
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  join_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  member_role org_member_role not null,
  status org_member_status not null default 'active',
  joined_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index organization_members_one_active_per_user
  on organization_members (user_id) where status = 'active';
create index on organization_members (org_id, status);

-- ----------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so they read past RLS and cannot recurse; the
-- same pattern 0015 used to fix the conversation_participants bug).
-- ----------------------------------------------------------------------------

-- Suspended or revoked accounts have no role, so every policy built on
-- my_role() / is_staff_or_manager() stops matching them at once.
create or replace function my_role() returns user_role as $$
  select role from public.profiles where id = auth.uid() and account_status = 'active';
$$ language sql stable security definer set search_path = public;

create or replace function is_manager() returns boolean as $$
  select coalesce(my_role() = 'manager', false);
$$ language sql stable security definer set search_path = public;

create or replace function is_hanbee_staff() returns boolean as $$
  select coalesce(
    my_role() = 'staff' and (select approved from public.profiles where id = auth.uid()),
    false
  );
$$ language sql stable security definer set search_path = public;

create or replace function is_active_account() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and account_status = 'active');
$$ language sql stable security definer set search_path = public;

-- The caller's current school, only while it is active (used for what a
-- member may see; a pending or closed school grants nothing).
create or replace function my_org_id() returns uuid as $$
  select m.org_id
  from public.organization_members m
  join public.organizations o on o.id = m.org_id
  where m.user_id = auth.uid() and m.status = 'active' and o.status = 'active'
    and is_active_account()
  limit 1;
$$ language sql stable security definer set search_path = public;

-- Any active membership regardless of school status (an owner must still see
-- their own pending school).
create or replace function is_org_member(p_org uuid) returns boolean as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active'
  ) and is_active_account();
$$ language sql stable security definer set search_path = public;

create or replace function is_org_owner(p_org uuid) returns boolean as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active'
      and m.member_role = 'owner'
  ) and is_active_account();
$$ language sql stable security definer set search_path = public;

-- Who may manage a school: the manager, Hanbee staff, or that school's own
-- staff while the school is active.
create or replace function can_manage_org(p_org uuid) returns boolean as $$
  select is_manager() or is_hanbee_staff() or exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.org_id
    where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active'
      and m.member_role in ('owner', 'staff') and o.status = 'active'
      and my_role() = 'school_staff'
  );
$$ language sql stable security definer set search_path = public;

grant execute on function is_manager(), is_hanbee_staff(), is_active_account(), my_org_id(),
  is_org_member(uuid), is_org_owner(uuid), can_manage_org(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- RLS: read-only for clients. Writes happen only through SECURITY DEFINER
-- functions (0024 onward).
-- ----------------------------------------------------------------------------
alter table organizations enable row level security;
alter table organization_members enable row level security;

create policy "manager and Hanbee staff read every school; members read their own"
  on organizations for select
  using (is_manager() or is_hanbee_staff() or (my_role() = 'school_staff' and is_org_member(id)));

create policy "manager and Hanbee staff read every membership; a school's staff read theirs; a student reads their own"
  on organization_members for select
  using (
    is_manager() or is_hanbee_staff()
    or user_id = auth.uid()
    or (my_role() = 'school_staff' and is_org_member(org_id))
  );

-- ----------------------------------------------------------------------------
-- profiles: account_status may only change through trusted functions. The
-- 0016 guard already pins role/approved for non-managers; extend it, and let
-- SECURITY DEFINER functions opt in with a transaction-local flag.
-- ----------------------------------------------------------------------------
create or replace function guard_profile_self_escalation()
returns trigger as $$
begin
  if auth.uid() is null or coalesce(current_setting('app.trusted_profile_write', true), '') = 'true' then
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
