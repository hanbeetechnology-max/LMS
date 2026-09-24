-- Real calendar events backing CalendarAgenda.tsx (currently pure local
-- useState over a hardcoded INITIAL_GROUPS array with a display-string
-- `time` field). This gives it real start/end timestamps so "Today" /
-- "Tomorrow" / "This week" grouping can eventually be computed for real —
-- the grouping logic itself is the frontend owner's job, not this migration's.
--
-- Optionally tied to a real `sections` row (nullable: "office hours" or a
-- general event might not belong to any one specific section). Follows this
-- repo's established enum/RLS conventions exactly (0001_init.sql's
-- content_type/attendance_status style, 0002_rls.sql's policy style).
-- Reuses is_staff_or_manager() from 0002_rls.sql rather than redefining it.

create type calendar_event_type as enum ('class_session', 'office_hours', 'other');

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references sections(id) on delete cascade,
  title text not null,
  event_type calendar_event_type not null default 'other',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index on calendar_events (starts_at);

alter table calendar_events enable row level security;

create policy "calendar events readable by all signed in"
  on calendar_events for select using (auth.uid() is not null);
create policy "staff/manager manage calendar events"
  on calendar_events for all using (is_staff_or_manager()) with check (is_staff_or_manager());
