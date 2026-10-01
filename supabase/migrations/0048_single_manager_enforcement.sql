-- The original platform plan allowed multiple managers only "while fixing
-- production issues", with a unique-manager index deferred to the final
-- production checklist. The user has now confirmed info@hanbee.in as the
-- one permanent manager, so this both performs the one-time transition
-- (promote info@hanbee.in, demote the two interim managers to Hanbee
-- staff) and adds the structural guarantee so a second manager can never
-- exist again, by accident or otherwise.

-- 1. Demote the interim managers to Hanbee staff. They keep their accounts
--    and approved status - this is a role change, not a removal.
update profiles
  set role = 'staff'
  where role = 'manager' and lower(email) <> 'info@hanbee.in';

-- 2. Promote the confirmed permanent manager.
update profiles
  set role = 'manager', approved = true, account_status = 'active'
  where lower(email) = 'info@hanbee.in';

-- 3. Record the transition for the audit trail.
insert into audit_log (actor_id, action, target_type, target_id, meta)
select id, 'manager_transition', 'profile', id,
  jsonb_build_object('note', 'info@hanbee.in confirmed as the sole permanent manager')
from profiles where lower(email) = 'info@hanbee.in';

-- 4. Structural guarantee: at most one profile can ever hold role='manager'.
--    Any future attempt to promote a second account to manager - whether
--    through the guarded RLS path (which already requires an existing
--    manager to do it) or a bug - fails at the database level instead of
--    silently creating a second manager.
create unique index if not exists profiles_single_manager_idx
  on profiles (role) where role = 'manager';
