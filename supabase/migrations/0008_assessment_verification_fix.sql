-- Fixes a real bug in 0007_assessment_submissions.sql: it conflated quiz
-- correctness (`passed`) with the verification workflow (`status`) — a
-- submission that didn't get every question right was inserted directly as
-- status='failed', which meant it never appeared in the staff verification
-- queue at all (fetchPendingAssessmentSubmissions() only reads status =
-- 'pending') and could never unlock, contradicting the actual, agreed
-- design: ANY submission — pass or fail — reaches the queue, and the only
-- two resolutions are a staff member verifying it or the 10-minute soft SLA
-- elapsing. Score is shown to staff for context; it was never meant to
-- gate whether a submission gets reviewed at all.
--
-- The `assessment_submission_status` enum keeps its 'failed' value (Postgres
-- can't drop an enum value) but it's simply not written by this function
-- anymore — every real submission now goes in as 'pending' regardless of
-- score, same as every other insert path in this schema.

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
    'pending'::assessment_submission_status,
    now(),
    now() + interval '10 minutes'
  )
  on conflict (assessment_id, enrollment_id) do update set
    answers = excluded.answers,
    score = excluded.score,
    passed = excluded.passed,
    status = 'pending'::assessment_submission_status,
    submitted_at = excluded.submitted_at,
    verified_at = null,
    auto_unlock_at = excluded.auto_unlock_at
  returning * into submission;

  return submission;
end;
$$;

-- A staff/manager "verify" always means the same thing regardless of score:
-- "I reviewed this and the student may continue." Previously this only
-- actually set status='verified' when passed was also true — meaning
-- clicking Verify on a failed submission silently did nothing observable
-- (it was already 'failed' and stayed 'failed', never unlocking the
-- student), the opposite of what a staff member clicking that button
-- would reasonably expect.
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
  set status = 'verified'::assessment_submission_status,
      verified_at = now()
  where id = p_submission_id
  returning * into submission;

  if submission.id is null then
    raise exception 'Assessment submission not found';
  end if;
  return submission;
end;
$$;

-- unlocked no longer requires passed — a failed quiz still gets verified or
-- still auto-unlocks after 10 minutes, exactly like a passed one. `passed`
-- remains on the row for staff/manager context (the score they're
-- reviewing), it's just no longer a gate on the student's own progress.
create or replace view assessment_submissions_effective
with (security_invoker = true)
as
select
  s.*,
  case
    when s.status = 'verified' or now() >= s.auto_unlock_at then true
    else false
  end as unlocked
from assessment_submissions s;

grant select on assessment_submissions_effective to authenticated;
