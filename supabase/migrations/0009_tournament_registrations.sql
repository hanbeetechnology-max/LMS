-- HanbeeLms — RC tournament registrations
-- Backs TournamentPage.tsx's RegistrationForm (driver name, email, phone,
-- scan-to-pay confirmation). No login required — same public/anonymous
-- insert shape as course_applications (see 0001_init.sql / 0002_rls.sql).
-- `status` is a plain text column (not an enum) so a future staff-side
-- manual payment-verification step can use it without a migration; that
-- verification UI is intentionally not built yet.

create table tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  driver_name text not null,
  email text not null,
  phone text not null default '',
  payment_confirmed boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table tournament_registrations enable row level security;

create policy "anyone (including anonymous) can register for the tournament"
  on tournament_registrations for insert with check (true);
create policy "staff/manager read tournament registrations"
  on tournament_registrations for select using (is_staff_or_manager());
