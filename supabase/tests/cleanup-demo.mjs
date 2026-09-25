// Removes ALL demo data (see seed-demo.mjs / seed-demo-full.mjs) safely.
//
//   node cleanup-demo.mjs                    DRY RUN: runs the whole deletion inside a transaction
//                                            and ROLLS BACK, printing exact counts (cascades included).
//   node cleanup-demo.mjs --rollback-test    same, plus a re-count proving no demo rows remain
//                                            inside the transaction, then rolls back.
//   node cleanup-demo.mjs --yes              really deletes (commits).
//   add --include-seeded                     ALSO removes ava@student.edu, jamie@hanbeelms.edu,
//                                            morgan@hanbeelms.edu, the course "Intro to Design" and the
//                                            tournament "Hanbee RC Cup 2026" (final launch clean-up only).
//
// What counts as demo (documented rules):
//   * users: email ends with @hanbee.test (plus the three seeded accounts with --include-seeded)
//   * schools: created by a demo user, or named "... (demo)"; skipped (with a warning) if a real user is an active member
//   * rows titled/named "... (demo)": courses, tournaments, announcements, events, tasks, holidays
//   * "Hanbee RC Cup 2026": created by seed-demo.mjs under jamie (a seeded, non-@hanbee.test account), so it cannot
//     be proven demo. DEFAULT: kept, only its demo teams/results are removed. --include-seeded deletes it.
//   * "Intro to Design" (created before the demo seed, owned by jamie): kept by default. Demo students' enrollments are removed
//     with their accounts; ava's enrollment stays. Seed-made class sessions (scheduled at a :07 seconds mark) are removed.
//   * jamie's seed-made time entries (exact-minute clock-ins; a real clock-in has fractional seconds) are removed in default mode.
//   NEVER touched: info@hanbee.in, hanbeetechnology@gmail.com, the holiday "Founders' Day", anything not matching above.
import { connect } from "./rls/_db.mjs";

const args = new Set(process.argv.slice(2));
const YES = args.has("--yes"), ROLLBACK_TEST = args.has("--rollback-test"), INCLUDE_SEEDED = args.has("--include-seeded");
const PROTECTED = ["info@hanbee.in", "hanbeetechnology@gmail.com"];
const SEEDED = ["ava@student.edu", "jamie@hanbeelms.edu", "morgan@hanbeelms.edu"];
const COMMIT = YES && !ROLLBACK_TEST;
const say = (m) => console.log(m);

if (INCLUDE_SEEDED) {
  say("################################################################");
  say("# WARNING: --include-seeded ALSO removes ava@student.edu,        #");
  say("# jamie@hanbeelms.edu, morgan@hanbeelms.edu, the course           #");
  say("# 'Intro to Design' and the tournament 'Hanbee RC Cup 2026'.      #");
  say("# Only for the final launch clean-up.                             #");
  say("################################################################");
}
say(COMMIT ? "MODE: REAL DELETE (commit)" : ROLLBACK_TEST ? "MODE: rollback test (deletes inside a transaction, verifies, rolls back)" : "MODE: dry run (nothing is deleted; pass --yes to delete)");

const db = await connect();
const COUNT_TABLES = ["profiles", "organizations", "organization_members", "invitations", "courses", "modules", "lessons", "sections", "enrollments",
  "lesson_completions", "applications", "certificates", "tournaments", "tournament_teams", "tournament_team_members", "tournament_results",
  "announcements", "calendar_events", "holidays", "staff_tasks", "staff_time_entries", "class_sessions", "attendance_marks", "conversations",
  "conversation_participants", "messages", "audit_log", "notifications", "discussion_threads", "discussion_posts", "assessments"];
const countAll = async () => {
  const o = {};
  for (const t of COUNT_TABLES) o[t] = +(await db.query(`select count(*) n from public.${t}`)).rows[0].n;
  o["auth.users"] = +(await db.query("select count(*) n from auth.users")).rows[0].n;
  return o;
};
const one = async (sql, p = []) => (await db.query(sql, p)).rows[0];

try {
  await db.query("begin");
  await db.query("set local statement_timeout = '120s'");
  const before = await countAll();
  const hadFounders = !!(await one("select 1 x from public.holidays where name=$1", ["Founders' Day"]));

  // ---- what is demo
  const seededList = INCLUDE_SEEDED ? SEEDED : [];
  await db.query(`create temp table d_users on commit drop as
    select id from public.profiles where lower(email) like '%@hanbee.test' or lower(email) = any($1::text[])`, [seededList]);
  const guard = await one("select count(*)::int n from public.profiles p join d_users d on d.id=p.id where lower(p.email) = any($1::text[])", [PROTECTED]);
  if (guard.n) throw new Error("ABORT: a protected real account is in the demo set");
  await db.query(`create temp table d_orgs on commit drop as
    select o.id from public.organizations o
    where (o.created_by in (select id from d_users) or o.name like '% (demo)')
      and not exists (select 1 from public.organization_members m where m.org_id=o.id and m.status='active' and m.user_id not in (select id from d_users))`);
  const skippedOrgs = (await db.query(`select o.name from public.organizations o where (o.created_by in (select id from d_users) or o.name like '% (demo)') and o.id not in (select id from d_orgs)`)).rows;
  for (const s of skippedOrgs) say(`WARNING: school "${s.name}" has real members, NOT deleted`);
  await db.query(`create temp table d_courses on commit drop as
    select id from public.courses where title like '% (demo)' or owner_id in (select id from d_users) or ($1::boolean and title='Intro to Design')`, [INCLUDE_SEEDED]);
  await db.query(`create temp table d_tourn on commit drop as
    select id from public.tournaments where title like '% (demo)' or ($1::boolean and title='Hanbee RC Cup 2026')`, [INCLUDE_SEEDED]);
  await db.query(`create temp table d_teams on commit drop as
    select id from public.tournament_teams where tournament_id in (select id from d_tourn) or org_id in (select id from d_orgs) or created_by in (select id from d_users)`);
  await db.query(`create temp table d_convs on commit drop as
    select id from public.conversations c
    where c.org_id in (select id from d_orgs)
       or exists (select 1 from public.conversation_participants p where p.conversation_id=c.id and p.user_id in (select id from d_users) and c.kind='direct')
       or (exists (select 1 from public.conversation_participants p where p.conversation_id=c.id)
           and not exists (select 1 from public.conversation_participants p where p.conversation_id=c.id and p.user_id not in (select id from d_users)))`);
  const rc = await one("select id, created_by from public.tournaments where title='Hanbee RC Cup 2026'");
  say(`DECISION "Hanbee RC Cup 2026": ${rc ? (INCLUDE_SEEDED ? "DELETED (--include-seeded)" : "KEPT (created under seeded account jamie, cannot be proven demo); its demo teams and results are removed") : "not present"}`);
  say(`DECISION "Intro to Design": ${INCLUDE_SEEDED ? "DELETED (--include-seeded)" : "KEPT (pre-existing course); demo students' enrollments removed with their accounts, ava's stays"}`);
  say(`Protected and never touched: ${PROTECTED.join(", ")}, holiday "Founders' Day"${INCLUDE_SEEDED ? "" : ", " + SEEDED.join(", ")}`);
  const sizes = {};
  for (const t of ["d_users", "d_orgs", "d_courses", "d_tourn", "d_teams", "d_convs"]) sizes[t] = +(await one(`select count(*) n from ${t}`)).n;
  say("Demo sets: " + JSON.stringify(sizes));

  // ---- deletions in FK-safe order; direct rowCounts printed
  const steps = [
    ["conversations (demo users only / demo schools)", "delete from public.conversations where id in (select id from d_convs)"],
    ["messages by demo users", "delete from public.messages where sender_id in (select id from d_users)"],
    ["verification_applicants links cleared", `update public.verification_applicants set resulting_enrollment_id=null where resulting_enrollment_id in
       (select e.id from public.enrollments e where e.student_id in (select id from d_users) or e.section_id in (select s.id from public.sections s where s.course_id in (select id from d_courses)))`],
    ["attendance marks by demo users", "delete from public.attendance_marks where marked_by in (select id from d_users)"],
    ["seed class sessions (:07 seconds marker) + their marks", "delete from public.class_sessions where extract(second from scheduled_at)=7"],
    ["discussion posts by demo users", "delete from public.discussion_posts where author_id in (select id from d_users)"],
    ["discussion threads by demo users", "delete from public.discussion_threads where author_id in (select id from d_users)"],
    ["announcements", "delete from public.announcements where title like '% (demo)' or author_id in (select id from d_users) or org_id in (select id from d_orgs)"],
    ["calendar events", "delete from public.calendar_events where title like '% (demo)' or created_by in (select id from d_users) or owner_id in (select id from d_users) or org_id in (select id from d_orgs)"],
    ["holidays", "delete from public.holidays where name like '% (demo)'"],
    ["staff tasks", "delete from public.staff_tasks where title like '% (demo)' or staff_id in (select id from d_users)"],
    ["staff time entries (demo users)", "delete from public.staff_time_entries where staff_id in (select id from d_users)"],
    ["staff time entries (seed-shaped, seeded accounts)", `delete from public.staff_time_entries where staff_id in (select id from public.profiles where lower(email) = 'jamie@hanbeelms.edu')
       and clock_out is not null and date_trunc('minute', clock_in) = clock_in`],
    ["certificates", "delete from public.certificates where user_id in (select id from d_users) or course_title like '% (demo)'"],
    ["course applications", "delete from public.applications where course_id in (select id from d_courses) or applicant_id in (select id from d_users)"],
    ["tournament teams (results and members cascade)", "delete from public.tournament_teams where id in (select id from d_teams)"],
    ["tournaments (demo)", "delete from public.tournaments where id in (select id from d_tourn)"],
    ["invitations tied to demo course sections", "delete from public.invitations where section_id in (select id from public.sections where course_id in (select id from d_courses))"],
    ["courses (modules, lessons, sections, enrollments, completions cascade)", "delete from public.courses where id in (select id from d_courses)"],
    ["invitations (demo emails, by demo users, demo schools)", "delete from public.invitations where lower(email) like '%@hanbee.test' or invited_by in (select id from d_users) or org_id in (select id from d_orgs)"],
    ["schools (memberships cascade)", "delete from public.organizations where id in (select id from d_orgs)"],
    ["enrollments of demo students", "delete from public.enrollments where student_id in (select id from d_users)"],
    ["audit rows (actor or target is demo)", `delete from public.audit_log where actor_id in (select id from d_users)
       or target_id in (select id from d_users union select id from d_orgs union select id from d_courses union select id from d_tourn union select id from d_teams)`],
    ["auth.users (profiles, memberships, notifications cascade)", "delete from auth.users where id in (select id from d_users)"],
  ];
  const direct = [];
  for (const [label, sql] of steps) {
    const r = await db.query(sql);
    direct.push([label, r.rowCount]);
  }
  const after = await countAll();

  say("\nDirect deletions:");
  for (const [l, n] of direct) say(`  ${String(n).padStart(5)}  ${l}`);
  say("\nTable totals (before -> after, including cascades):");
  for (const k of Object.keys(before)) if (before[k] !== after[k]) say(`  ${k.padEnd(28)} ${String(before[k]).padStart(5)} -> ${String(after[k]).padStart(5)}  (-${before[k] - after[k]})`);

  // ---- safety checks inside the transaction
  const bad = [];
  for (const e of PROTECTED) if (!(await one("select 1 x from public.profiles where lower(email)=$1", [e]))) bad.push("protected account deleted: " + e);
  if (hadFounders && !(await one("select 1 x from public.holidays where name=$1", ["Founders' Day"]))) bad.push("Founders' Day deleted");
  if (!INCLUDE_SEEDED) {
    for (const e of SEEDED) if (!(await one("select 1 x from public.profiles where lower(email)=$1", [e]))) bad.push("seeded account deleted: " + e);
    if (!(await one("select 1 x from public.courses where title='Intro to Design'"))) bad.push("Intro to Design deleted");
    if (rc && !(await one("select 1 x from public.tournaments where title='Hanbee RC Cup 2026'"))) bad.push("RC Cup deleted");
    if (!(await one("select 1 x from public.enrollments e join public.profiles p on p.id=e.student_id where lower(p.email)='ava@student.edu'"))) bad.push("ava's enrollment deleted");
  }
  const expectedProfiles = before.profiles - sizes.d_users;
  if (after.profiles !== expectedProfiles) bad.push(`profiles ${before.profiles} -> ${after.profiles}, expected ${expectedProfiles}`);
  if (bad.length) throw new Error("SAFETY CHECK FAILED: " + bad.join("; "));
  say("\nSafety checks passed: protected accounts, seeded accounts, Founders' Day, Intro to Design intact; profile delta equals the demo user count.");

  if (ROLLBACK_TEST) {
    const rem = {
      demo_users: +(await one("select count(*) n from public.profiles where lower(email) like '%@hanbee.test'")).n,
      demo_titled: +(await one(`select
        (select count(*) from public.courses where title like '% (demo)') + (select count(*) from public.tournaments where title like '% (demo)') +
        (select count(*) from public.announcements where title like '% (demo)') + (select count(*) from public.calendar_events where title like '% (demo)') +
        (select count(*) from public.staff_tasks where title like '% (demo)') + (select count(*) from public.holidays where name like '% (demo)') n`)).n,
      demo_orgs: +(await one("select count(*) n from public.organizations where name like '% (demo)' or name in ('Demo Public School','Sample Academy')")).n,
      demo_invitations: +(await one("select count(*) n from public.invitations where lower(email) like '%@hanbee.test'")).n,
      auth_users: +(await one("select count(*) n from auth.users where lower(email) like '%@hanbee.test'")).n,
    };
    say("Re-count inside the transaction (all should be 0): " + JSON.stringify(rem));
    if (Object.values(rem).some((v) => v !== 0)) throw new Error("demo rows still present after cleanup");
  }

  if (COMMIT) { await db.query("commit"); say("\nCOMMITTED. Demo data removed."); }
  else { await db.query("rollback"); say("\nROLLED BACK. Nothing was deleted." + (YES ? "" : " Re-run with --yes to delete for real.")); }
} catch (e) {
  try { await db.query("rollback"); } catch { /* ignore */ }
  console.error("\nFAILED, rolled back, nothing deleted:", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
