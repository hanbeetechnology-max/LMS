-- The frontend posts directly to PostgREST for several tables with no
-- app-layer validation in between, so the database is the only place that
-- can enforce payload limits. staff_tasks and profiles.full_name had no
-- upper-bound length checks at all (only client-side maxLength, which is
-- cosmetic and trivially bypassed) - unlike messages.body, which already
-- does this correctly (0026_chat_v2.sql). This brings those columns in
-- line with that existing pattern. Also adds the one missing index that
-- every staff_tasks RLS check and UI query actually filters on.

alter table staff_tasks
  add constraint staff_tasks_title_length
  check (char_length(btrim(title)) >= 1 and char_length(title) <= 180);

alter table staff_tasks
  add constraint staff_tasks_description_length
  check (description is null or char_length(description) <= 2000);

alter table profiles
  add constraint profiles_full_name_length
  check (full_name is null or char_length(btrim(full_name)) <= 120);

create index if not exists staff_tasks_staff_id_idx on staff_tasks (staff_id);
