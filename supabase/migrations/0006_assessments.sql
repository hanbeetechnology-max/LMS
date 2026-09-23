-- HanbeeLms — Phase 2 of the assessment-gated-lessons feature (see
-- docs/PLAN.md §10.44 for the full plan). This round: schema + RLS + the
-- student-safe options view. The submit/grade/verify/auto-unlock RPCs and
-- the effective-status view are Phase 3, a separate migration.
--
-- One assessment per video lesson, multiple-choice, auto-graded. The
-- critical integrity rule: a student must never be able to read which
-- option is correct over the wire — that would defeat "auto-graded"
-- instantly. So the base `assessment_options` table is staff/manager-only,
-- and students read questions through `assessment_options_public`, a view
-- with no `is_correct` column at all.

create table assessments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references lessons(id) on delete cascade,
  title text not null default 'Lesson check',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  prompt text not null,
  sort_order int not null default 0
);

create table assessment_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references assessment_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  sort_order int not null default 0
);

-- Deliberately NOT security_invoker — a student querying this view has no
-- direct SELECT grant on assessment_options at all (its RLS policy below is
-- staff/manager-only), so this has to run with the view owner's privileges
-- (the default for a view without security_invoker) to read the base table
-- and expose only the redacted columns. This is the opposite need from
-- auto_attendance_sessions_effective/course_completion_stats, which use
-- security_invoker=true because they *want* to inherit the base table's
-- per-user RLS — here the whole point is to bypass it for these columns only.
create view assessment_options_public as
  select id, question_id, label, sort_order from assessment_options;
grant select on assessment_options_public to authenticated;

alter table assessments enable row level security;
alter table assessment_questions enable row level security;
alter table assessment_options enable row level security;

create policy "assessments readable by all signed in" on assessments
  for select using (auth.uid() is not null);
create policy "staff/manager manage assessments" on assessments
  for all using (is_staff_or_manager()) with check (is_staff_or_manager());

create policy "questions readable by all signed in" on assessment_questions
  for select using (auth.uid() is not null);
create policy "staff/manager manage questions" on assessment_questions
  for all using (is_staff_or_manager()) with check (is_staff_or_manager());

-- Base table is staff/manager ONLY — students never query this table
-- directly, only assessment_options_public (defined above, no is_correct
-- column, readable by any signed-in user via the same policy shape as
-- assessment_questions).
create policy "staff/manager read/manage options" on assessment_options
  for all using (is_staff_or_manager()) with check (is_staff_or_manager());
