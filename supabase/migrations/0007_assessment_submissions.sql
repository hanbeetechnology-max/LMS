-- Phase 3: assessment submission, staff verification, and soft-SLA unlock.
-- Requires 0006_assessments.sql first because it references assessments(id).

create type assessment_submission_status as enum ('pending', 'verified', 'failed');

create table assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score numeric(5,2) not null default 0,
  passed boolean not null default false,
  status assessment_submission_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  auto_unlock_at timestamptz not null default (now() + interval '10 minutes'),
  unique (assessment_id, enrollment_id)
);

alter table assessment_submissions enable row level security;

create policy "students read own submissions"
  on assessment_submissions for select
  using (exists (
    select 1 from enrollments e
    where e.id = enrollment_id and e.student_id = auth.uid()
  ));

create policy "staff/manager read and verify submissions"
  on assessment_submissions for select
  using (is_staff_or_manager());

create policy "staff/manager update submissions"
  on assessment_submissions for update
  using (is_staff_or_manager())
  with check (is_staff_or_manager());

create or replace function submit_assessment(
  p_assessment_id uuid,
  p_enrollment_id uuid,
  p_answers jsonb
) returns assessment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  submission assessment_submissions;
  total_count int;
  correct_count int;
begin
  if not exists (
    select 1 from enrollments
    where id = p_enrollment_id and student_id = auth.uid()
  ) then
    raise exception 'Enrollment does not belong to the current student';
  end if;

  select count(*) into total_count
  from assessment_questions q
  where q.assessment_id = p_assessment_id;

  select count(*) into correct_count
  from assessment_questions q
  join assessment_options correct_option
    on correct_option.question_id = q.id and correct_option.is_correct
  where q.assessment_id = p_assessment_id
    and p_answers ->> q.id::text = correct_option.id::text;

  insert into assessment_submissions (
    assessment_id, enrollment_id, answers, score, passed, status, submitted_at, auto_unlock_at
  )
  values (
    p_assessment_id,
    p_enrollment_id,
    p_answers,
    case when total_count = 0 then 0 else round((correct_count::numeric / total_count) * 100, 2) end,
    total_count > 0 and correct_count = total_count,
    case when total_count > 0 and correct_count = total_count then 'pending'::assessment_submission_status else 'failed'::assessment_submission_status end,
    now(),
    now() + interval '10 minutes'
  )
  on conflict (assessment_id, enrollment_id) do update set
    answers = excluded.answers,
    score = excluded.score,
    passed = excluded.passed,
    status = excluded.status,
    submitted_at = excluded.submitted_at,
    verified_at = null,
    auto_unlock_at = excluded.auto_unlock_at
  returning * into submission;

  return submission;
end;
$$;

create or replace function verify_assessment_submission(p_submission_id uuid)
returns assessment_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  submission assessment_submissions;
begin
  if not is_staff_or_manager() then
    raise exception 'Only staff or managers can verify submissions';
  end if;

  update assessment_submissions
  set status = case when passed then 'verified'::assessment_submission_status else 'failed'::assessment_submission_status end,
      verified_at = case when passed then now() else null end
  where id = p_submission_id
  returning * into submission;

  if submission.id is null then
    raise exception 'Assessment submission not found';
  end if;
  return submission;
end;
$$;

-- Notify every staff/manager account immediately after a student submits.
create or replace function notify_assessment_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (user_id, title, link_to)
  select id, 'A student submitted a knowledge check', '/staff/dashboard'
  from profiles
  where role in ('staff', 'manager');
  return new;
end;
$$;

create trigger assessment_submission_notification
after insert on assessment_submissions
for each row execute procedure notify_assessment_submission();

create or replace view assessment_submissions_effective
with (security_invoker = true)
as
select
  s.*,
  case
    when s.passed and (s.status = 'verified' or now() >= s.auto_unlock_at) then true
    else false
  end as unlocked
from assessment_submissions s;

grant execute on function submit_assessment(uuid, uuid, jsonb) to authenticated;
grant execute on function verify_assessment_submission(uuid) to authenticated;
grant select on assessment_submissions_effective to authenticated;
