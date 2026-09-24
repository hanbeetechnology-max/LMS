-- Solo students: learners who belong to no school. A student becomes solo when
-- Hanbee staff invite them without a school (handled in handle_new_user below)
-- or when they convert after their school closes (0029). Solo students may take
-- courses and enter tournaments by paying; the flag lets policies tell "solo"
-- apart from "student whose school just closed and has not converted yet".
alter table profiles add column is_solo boolean not null default false;

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

    if inv.org_id is null and final_role = 'student' then
      update public.profiles set is_solo = true where id = new.id;
    end if;

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
