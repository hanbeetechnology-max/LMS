-- notify_assessment_submission (0049) pointed staff at /staff/dashboard, a route
-- that doesn't exist in the app. The assessment review queue is
-- /dashboard/hanbee/assessment-reviews. Only the link target changes.

create or replace function notify_assessment_submission()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into notifications (user_id, title, link_to, kind)
  select id, 'A student submitted a knowledge check', '/dashboard/hanbee/assessment-reviews', 'assessment_submitted'
  from profiles
  where role in ('staff', 'manager');
  return new;
end;
$function$;
