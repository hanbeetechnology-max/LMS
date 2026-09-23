-- HanbeeLms — initial schema
-- See docs/PLAN.md §10.35 for context. Mirrors the shapes already established
-- across frontend/src/lib/mock*.ts and the FastAPI backend/ prototype, so
-- migrating off mock data changes as little application logic as possible.
--
-- Run this in the Supabase SQL Editor (or `supabase db push` with the CLI)
-- against a fresh project, in order (0001, 0002, ...).

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================================
-- Enums
-- ============================================================================
create type user_role as enum ('staff', 'student', 'manager');
create type student_status as enum ('invited', 'active', 'completed', 'dropped');
create type content_type as enum ('video', 'document', 'slides', 'link', 'text');
create type attendance_status as enum ('present', 'absent', 'late', 'excused');
create type auto_session_status as enum ('active', 'present', 'left_early');
create type verification_status as enum ('pending', 'verified', 'declined');
create type holiday_scope as enum ('staff', 'students', 'center');
create type announcement_audience as enum ('all', 'staff', 'student');
create type course_status as enum ('draft', 'published', 'archived');

-- ============================================================================
-- Profiles — one row per auth.users row, created by the trigger below.
-- This is the single source of truth for role, replacing mockAuth.ts.
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role user_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up. The role
-- defaults to 'student' unless raw_user_meta_data->>'role' was set at signup
-- (e.g. by an admin-created staff/manager account).
create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================================
-- Courses, sections, modules, lessons, materials
-- ============================================================================
create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status course_status not null default 'draft',
  cover_accent text not null default 'violet',
  owner_id uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  name text not null,
  capacity int not null default 30,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  sort_order int not null default 0
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  content_type content_type not null default 'text',
  published boolean not null default false,
  body_text text not null default '',
  external_url text not null default '',
  youtube_id text,
  sort_order int not null default 0
);

create table lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  file_name text not null,
  file_size_bytes bigint not null,
  storage_path text not null, -- Supabase Storage object path, e.g. "materials/<lesson_id>/<file_name>"
  uploaded_at timestamptz not null default now()
);

-- ============================================================================
-- Enrollment (the "roster") — replaces StaffRosterPage.tsx's INITIAL_ROSTER
-- ============================================================================
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status student_status not null default 'invited',
  roll_no text unique,
  age int,
  institution text,
  phone text,
  enrolled_date date not null default current_date,
  unique (section_id, student_id)
);

create table lesson_completions (
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (enrollment_id, lesson_id)
);

-- ============================================================================
-- Manual, per-session attendance marking (StaffAttendancePage.tsx)
-- ============================================================================
create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade,
  scheduled_at timestamptz not null
);

create table attendance_marks (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  status attendance_status not null default 'present',
  note text not null default '',
  marked_by uuid not null references profiles(id),
  marked_at timestamptz not null default now(),
  unique (class_session_id, enrollment_id)
);

-- ============================================================================
-- Autonomous attendance (real login/heartbeat sessions) — see backend/app/store.py.
-- Replaces the FastAPI prototype's in-memory Session dataclass with a durable table.
-- ============================================================================
create table auto_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  login_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  status auto_session_status not null default 'active'
);
create index on auto_attendance_sessions (user_id, login_at desc);

-- ============================================================================
-- Announcements
-- ============================================================================
create table announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  audience announcement_audience not null default 'all',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Certificates — mirrors backend/app/routers/certificates.py exactly,
-- including the unauthenticated-verify use case.
-- ============================================================================
create table certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_title text not null,
  serial text not null unique,
  issued_at timestamptz not null default now(),
  unique (user_id, course_title)
);

-- ============================================================================
-- Discussions
-- ============================================================================
create table discussion_threads (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  author_id uuid not null references profiles(id),
  title text not null,
  pinned boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

create table discussion_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references discussion_threads(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Messages
-- ============================================================================
create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Notifications
-- ============================================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  link_to text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

-- ============================================================================
-- Staff tasks & time tracking
-- ============================================================================
create table staff_tasks (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false
);

create table staff_time_entries (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  work_date date not null,
  clock_in timestamptz not null,
  clock_out timestamptz,
  on_time boolean not null default true,
  unique (staff_id, work_date)
);

-- ============================================================================
-- Manager: verifications (applicant → enrollment workflow) & holidays
-- ============================================================================
create table verification_applicants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  course_title text not null,
  age int,
  institution text,
  phone text,
  status verification_status not null default 'pending',
  resulting_enrollment_id uuid references enrollments(id),
  submitted_at timestamptz not null default now()
);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  holiday_date date not null,
  scope holiday_scope not null default 'center'
);

-- ============================================================================
-- Public course-interest applications (the /apply page) & staff invitations
-- ============================================================================
create table course_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null default '',
  message text not null default '',
  course_title text not null,
  submitted_at timestamptz not null default now()
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role user_role not null default 'student',
  section_id uuid references sections(id),
  invited_by uuid not null references profiles(id),
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);
