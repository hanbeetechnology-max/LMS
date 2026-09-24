-- S4 (docs/SECURITY_PLAN.md): profiles held every user's email and were
-- readable by any signed-in user. Students only need to see names for the
-- people they actually interact with, so a student may now read: their own
-- row, approved staff/managers (announcement authors, instructors), people
-- they share a conversation with, and people who wrote discussion threads or
-- posts in a course they are enrolled in. Staff and managers still read all.
-- Unapproved staff accounts are no longer visible to students at all.

create or replace function can_see_profile(p_profile_id uuid)
returns boolean as $$
  select
    auth.uid() is not null
    and (
      p_profile_id = auth.uid()
      or is_staff_or_manager()
      or exists (
        select 1 from profiles p
        where p.id = p_profile_id and p.role in ('staff', 'manager') and p.approved
      )
      or exists (
        select 1
        from conversation_participants mine
        join conversation_participants theirs on theirs.conversation_id = mine.conversation_id
        where mine.user_id = auth.uid() and theirs.user_id = p_profile_id
      )
      or exists (
        select 1 from discussion_threads t
        where t.author_id = p_profile_id and is_enrolled_in_course(t.course_id)
      )
      or exists (
        select 1
        from discussion_posts dp
        join discussion_threads t on t.id = dp.thread_id
        where dp.author_id = p_profile_id and is_enrolled_in_course(t.course_id)
      )
    );
$$ language sql stable security definer set search_path = public;

grant execute on function can_see_profile(uuid) to authenticated;

drop policy "profiles are readable by any signed-in user" on profiles;
create policy "profiles readable only where there is a reason to see them"
  on profiles for select
  using (can_see_profile(id));
