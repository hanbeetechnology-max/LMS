-- Multi-school platform, step 3: invite-only signup enforced IN THE DATABASE,
-- school registration, first-verifier-wins school verification, and the
-- invite functions. Before this, handle_new_user (0005) let any visitor sign
-- up as a student, and an invite matched by email alone (so knowing an email
-- was enough to claim its invite).
--
-- Allowed signups now (everything else raises):
--   1. invite_token + matching email      solo student, co-staff, or a
--                                         manager-created staff/manager account
--   2. join_token + allow-listed email    a student joining their school
--   3. role 'school_staff' + school data  registers a new school (pending)
--   4. role 'staff'                       Hanbee staff application (pending,
--                                         manager approves, as since 0005)
--   5. role 'manager' when none exists    the one-time bootstrap

-- ----------------------------------------------------------------------------
-- Audit log: privileged actions only (never student activity).
-- ----------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on audit_log (created_at desc);
alter table audit_log enable row level security;
create policy "manager and Hanbee staff read the audit log"
  on audit_log for select using (is_manager() or is_hanbee_staff());

create or replace function log_audit(p_action text, p_target_type text, p_target_id uuid, p_meta jsonb default '{}'::jsonb)
returns void as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_meta, '{}'::jsonb));
$$ language sql security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- Invitations: per-invite secret, school link, expiry, revocation.
-- ----------------------------------------------------------------------------
alter table invitations
  add column org_id uuid references organizations(id) on delete cascade,
  add column token text not null default encode(gen_random_bytes(16), 'hex'),
  add column expires_at timestamptz not null default now() + interval '30 days',
  add column revoked_at timestamptz;
create index on invitations (lower(email));
create index on invitations (org_id);

-- Old invites matched by email alone; none of them carries a known token, so
-- retire them rather than leave a weaker path alive.
update invitations set revoked_at = now() where not accepted;

create or replace function is_staff_or_manager() returns boolean as $$
  select is_manager() or is_hanbee_staff();
$$ language sql stable security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- The signup trigger.
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role text := meta->>'role';
  v_invite_token text := nullif(meta->>'invite_token', '');
  v_join_token text := nullif(meta->>'join_token', '');
  inv invitations;
  org organizations;
  final_role user_role;
  final_approved boolean := true;
  register_school boolean := false;
  v_org_id uuid;
  v_school_name text;
  v_reg_no text;
  v_official_email text;
  v_full_name text := coalesce(nullif(trim(meta->>'full_name'), ''), split_part(new.email, '@', 1));
begin
  if v_invite_token is not null then
    select * into inv from invitations i
    where i.token = v_invite_token and lower(i.email) = lower(new.email)
      and not i.accepted and i.revoked_at is null and i.expires_at > now()
    for update;
    if inv.id is null then
      raise exception 'This invitation is invalid or has expired';
    end if;
    final_role := inv.role;
    if inv.org_id is not null then
      select * into org from organizations o where o.id = inv.org_id;
      if org.status <> 'active' then
        raise exception 'This school is not active';
      end if;
    end if;

  elsif v_join_token is not null then
    select * into org from organizations o where o.join_token = v_join_token and o.status = 'active';
    if org.id is null then
      raise exception 'This school link is invalid';
    end if;
    select * into inv from invitations i
    where i.org_id = org.id and lower(i.email) = lower(new.email) and i.role = 'student'
      and not i.accepted and i.revoked_at is null and i.expires_at > now()
    order by i.created_at desc limit 1
    for update;
    if inv.id is null then
      raise exception 'This email has not been invited by the school';
    end if;
    final_role := 'student';

  elsif requested_role = 'school_staff' then
    v_school_name := nullif(trim(meta->>'school_name'), '');
    v_reg_no := nullif(trim(meta->>'registration_no'), '');
    v_official_email := nullif(trim(meta->>'official_email'), '');
    if v_school_name is null or v_reg_no is null or v_official_email is null
       or coalesce(meta->>'guardian_consent', '') <> 'true' then
      raise exception 'School name, registration number, official email and the guardian-consent confirmation are required';
    end if;
    final_role := 'school_staff';
    final_approved := false;
    register_school := true;

  elsif requested_role = 'staff' then
    final_role := 'staff';
    final_approved := false;

  elsif requested_role = 'manager' and not exists (select 1 from public.profiles where role = 'manager') then
    final_role := 'manager';

  else
    raise exception 'Signups are by invitation only';
  end if;

  insert into public.profiles (id, email, full_name, role, approved)
  values (new.id, new.email, v_full_name, final_role, final_approved);

  if inv.id is not null then
    update invitations set accepted = true where id = inv.id;

    if inv.org_id is not null then
      insert into organization_members (org_id, user_id, member_role)
      values (inv.org_id, new.id, case when final_role = 'school_staff' then 'staff'::org_member_role else 'student'::org_member_role end);
    end if;

    if inv.section_id is not null and final_role = 'student' then
      insert into enrollments (section_id, student_id, status)
      values (inv.section_id, new.id, 'active')
      on conflict (section_id, student_id) do nothing;
    end if;
  end if;

  if register_school then
    insert into organizations (name, status, registration_no, official_email, guardian_consent, created_by)
    values (v_school_name, 'pending', v_reg_no, v_official_email, true, new.id)
    returning id into v_org_id;
    insert into organization_members (org_id, user_id, member_role)
    values (v_org_id, new.id, 'owner');
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- Invitation guard (replaces 0018's): who may create which kind of invite.
-- ----------------------------------------------------------------------------
create or replace function guard_invitation() returns trigger as $$
begin
  if auth.uid() is null then return new; end if;

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

-- A school's own staff may read their school's invitations (to see who joined).
create policy "school staff read their own school's invitations"
  on invitations for select
  using (my_role() = 'school_staff' and org_id is not null and is_org_member(org_id));

-- ----------------------------------------------------------------------------
-- Functions the app calls.
-- ----------------------------------------------------------------------------

-- Join page: show the school's name for a valid link (no other data).
create or replace function get_join_info(p_token text)
returns table (school_name text) as $$
  select o.name from organizations o where o.join_token = p_token and o.status = 'active';
$$ language sql stable security definer set search_path = public;

-- Friendly pre-check before calling signUp (the trigger's own error is masked
-- by Supabase as "Database error saving new user").
create or replace function preflight_join(p_token text, p_email text)
returns text as $$
declare
  org organizations;
begin
  select * into org from organizations where join_token = p_token and status = 'active';
  if org.id is null then return 'invalid_link'; end if;
  if not exists (
    select 1 from invitations i
    where i.org_id = org.id and lower(i.email) = lower(trim(p_email)) and i.role = 'student'
      and not i.accepted and i.revoked_at is null and i.expires_at > now()
  ) then return 'not_invited'; end if;
  return 'ok';
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function get_join_info(text), preflight_join(text, text) to anon, authenticated;

create or replace function invite_students(p_org uuid, p_emails text[])
returns table (email text, result text) as $$
declare
  v_email text;
  v_seen text[] := '{}';
begin
  if not can_manage_org(p_org) then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from organizations where id = p_org and status = 'active') then
    raise exception 'this school is not active';
  end if;
  if coalesce(array_length(p_emails, 1), 0) = 0 then
    raise exception 'no emails given';
  end if;
  if array_length(p_emails, 1) > 200 then
    raise exception 'at most 200 emails per batch';
  end if;

  foreach v_email in array p_emails loop
    v_email := lower(trim(v_email));
    email := v_email;
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      result := 'invalid_email'; return next; continue;
    end if;
    if v_email = any (v_seen) then
      result := 'duplicate_in_list'; return next; continue;
    end if;
    v_seen := v_seen || v_email;

    if exists (select 1 from profiles p where lower(p.email) = v_email and p.role <> 'student') then
      result := 'unavailable'; return next; continue;
    end if;
    if exists (
      select 1 from profiles p join organization_members m on m.user_id = p.id and m.status = 'active'
      where lower(p.email) = v_email
    ) then
      result := 'unavailable'; return next; continue;
    end if;

    if exists (
      select 1 from invitations i
      where i.org_id = p_org and lower(i.email) = v_email and i.role = 'student'
        and not i.accepted and i.revoked_at is null and i.expires_at > now()
    ) then
      update invitations i set expires_at = now() + interval '30 days'
      where i.org_id = p_org and lower(i.email) = v_email and i.role = 'student'
        and not i.accepted and i.revoked_at is null;
      result := 'already_invited'; return next; continue;
    end if;

    insert into invitations (email, role, org_id, invited_by)
    values (v_email, 'student', p_org, auth.uid());
    result := 'invited'; return next;
  end loop;

  perform log_audit('invite_students', 'organization', p_org, jsonb_build_object('count', array_length(p_emails, 1)));
end;
$$ language plpgsql security definer set search_path = public;

create or replace function invite_school_staff(p_org uuid, p_email text)
returns text as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not (is_org_owner(p_org) or is_manager()) then
    raise exception 'only the school owner may invite school staff';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return 'invalid_email';
  end if;
  if exists (select 1 from profiles p where lower(p.email) = v_email) then
    return 'unavailable';
  end if;
  insert into invitations (email, role, org_id, invited_by)
  values (v_email, 'school_staff', p_org, auth.uid());
  perform log_audit('invite_school_staff', 'organization', p_org, '{}'::jsonb);
  return 'invited';
end;
$$ language plpgsql security definer set search_path = public;

create or replace function revoke_invitation(p_invitation uuid)
returns boolean as $$
declare
  inv invitations;
begin
  select * into inv from invitations where id = p_invitation;
  if inv.id is null then return false; end if;
  if not (is_manager() or is_hanbee_staff() or (inv.org_id is not null and can_manage_org(inv.org_id))) then
    raise exception 'not allowed';
  end if;
  update invitations set revoked_at = now() where id = p_invitation and not accepted;
  return true;
end;
$$ language plpgsql security definer set search_path = public;

-- First verifier wins: the row is locked, so a second verifier sees who got there first.
create or replace function verify_school(p_org uuid)
returns jsonb as $$
declare
  org organizations;
  v_owner uuid;
  v_by text;
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only the manager or Hanbee staff may verify a school';
  end if;
  select * into org from organizations where id = p_org for update;
  if org.id is null then raise exception 'school not found'; end if;
  if org.status <> 'pending' then
    select full_name into v_by from profiles where id = org.verified_by;
    return jsonb_build_object('result', 'already_decided', 'status', org.status, 'by', v_by);
  end if;

  update organizations set status = 'active', verified_by = auth.uid(), verified_at = now() where id = p_org;
  select user_id into v_owner from organization_members where org_id = p_org and member_role = 'owner' and status = 'active' limit 1;
  perform set_config('app.trusted_profile_write', 'true', true);
  update profiles set approved = true where id = v_owner;
  perform set_config('app.trusted_profile_write', '', true);
  perform log_audit('verify_school', 'organization', p_org, '{}'::jsonb);
  return jsonb_build_object('result', 'verified');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function reject_school(p_org uuid)
returns jsonb as $$
declare
  org organizations;
  v_by text;
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only the manager or Hanbee staff may reject a school';
  end if;
  select * into org from organizations where id = p_org for update;
  if org.id is null then raise exception 'school not found'; end if;
  if org.status <> 'pending' then
    select full_name into v_by from profiles where id = org.verified_by;
    return jsonb_build_object('result', 'already_decided', 'status', org.status, 'by', v_by);
  end if;
  update organizations set status = 'closed', verified_by = auth.uid(), verified_at = now() where id = p_org;
  perform log_audit('reject_school', 'organization', p_org, '{}'::jsonb);
  return jsonb_build_object('result', 'rejected');
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function invite_students(uuid, text[]), invite_school_staff(uuid, text), revoke_invitation(uuid),
  verify_school(uuid), reject_school(uuid) from public, anon;
-- Supabase grants function access to `authenticated` directly (not via PUBLIC),
-- so log_audit must be revoked from it by name or any signed-in user could
-- forge audit entries. Only the SECURITY DEFINER functions above may call it.
revoke all on function log_audit(text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function invite_students(uuid, text[]), invite_school_staff(uuid, text), revoke_invitation(uuid),
  verify_school(uuid), reject_school(uuid) to authenticated;
