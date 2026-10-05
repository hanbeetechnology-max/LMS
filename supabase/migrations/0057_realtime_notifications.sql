-- Publish notifications to Supabase Realtime so the bell updates the moment a
-- notification is created. Realtime applies the table's RLS policies per
-- subscriber, so a user only receives their own rows.

do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; end $$;
