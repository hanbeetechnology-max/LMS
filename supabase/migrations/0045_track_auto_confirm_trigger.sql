-- handle_auto_confirm_user() and its trigger on auth.users already exist on
-- the live database (created directly, outside any migration) and are
-- load-bearing: this is the actual mechanism that makes signup work without
-- a real email-confirmation flow (the project's documented "verification
-- can't be done for now" decision). Two real problems, both fixed here:
--
-- 1. Untracked: nothing in version control recreates this. Rebuilding the
--    database from migrations alone (the restore drill, or a fresh
--    environment) would silently leave new signups permanently unconfirmed
--    and unable to use their account - a production-breaking gap that
--    would only surface during an actual disaster recovery.
-- 2. Missing search_path: of 135 SECURITY DEFINER functions, this was the
--    only one without `set search_path = public` pinned, the standard
--    defense against search_path hijacking. The function body itself only
--    touches NEW and the built-in now(), so today's actual exploitability
--    is low - but it's the one inconsistent function, and pinning it
--    costs nothing and removes the gap for good (including against any
--    future edit to this function that might add an unqualified reference).

create or replace function handle_auto_confirm_user()
returns trigger as $$
begin
  -- Set the confirmation timestamp BEFORE the user is even saved.
  new.email_confirmed_at := now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created_auto_confirm on auth.users;
create trigger on_auth_user_created_auto_confirm
  before insert on auth.users
  for each row execute function handle_auto_confirm_user();
