// Extends the demo world (run AFTER seed-demo.mjs) so every page of every role
// shows meaningful content. Idempotent: every block checks before it inserts.
// Uses the public API and RPCs wherever a server rule exists; owner SQL (no
// auth.uid()) only for server-forced values: created_at, message times,
// attendance history, clock-in times, expired invitations.
//
//   export SUPABASE_DB_URL=...   (session pooler URL)
//   node seed-demo-full.mjs
//
// Everything created is removable with cleanup-demo.mjs (@hanbee.test emails,
// " (demo)" titles). Do not run against a launched production database.
import fs from "fs";
import { connect } from "./rls/_db.mjs";

const env = fs.readFileSync(new URL("../../frontend/.env.local", import.meta.url), "utf8");
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const anon = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const PW = "Demo#12345";
const db = await connect();
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (m) => console.log(m);

async function api(path, { method = "GET", body, token, prefer } = {}) {
  const res = await fetch(url + path, {
    method,
    headers: { apikey: anon, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, json };
}
const tokens = {};
async function login(email, password = PW) {
  if (tokens[email]) return tokens[email];
  const r = await api("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  if (!r.json?.access_token) throw new Error(`login failed for ${email}: ${JSON.stringify(r.json)}`);
  return (tokens[email] = r.json.access_token);
}
const signup = (email, data) => api("/auth/v1/signup", { method: "POST", body: { email, password: PW, data } });
const rpc = (name, args, token) => api(`/rest/v1/rpc/${name}`, { method: "POST", body: args, token });
const errText = (r) => JSON.stringify(r.json)?.slice(0, 200);
// Calls an rpc; tolerated messages (already done) are silent, anything else is logged.
async function rpcSoft(name, args, token, tolerate = /already|exists|duplicate|not open|earlier/i) {
  const r = await rpc(name, args, token);
  if (!r.ok && !tolerate.test(errText(r))) say(`  ! ${name} refused: ${errText(r)}`);
  return r;
}
const must = (r, label) => { if (!r.ok) throw new Error(`${label} failed: ${errText(r)}`); return r; };
const pid = async (email) => (await q("select id from profiles where lower(email)=lower($1)", [email]))[0]?.id;
const JAMIE = "jamie@hanbeelms.edu", MORGAN = "morgan@hanbeelms.edu";
const jamie = await login(JAMIE, "staff123");
const morgan = await login(MORGAN, "manager123");
const jamieId = await pid(JAMIE), morganId = await pid(MORGAN);
const org1 = (await q("select id from organizations where name='Demo Public School'"))[0]?.id;
const org2 = (await q("select id from organizations where name='Sample Academy'"))[0]?.id;
if (!org1 || !org2 || !jamieId || !morganId) throw new Error("run seed-demo.mjs first");
const owner1 = await login("demo.owner1@hanbee.test"), owner2 = await login("demo.owner2@hanbee.test");
const owner1Id = await pid("demo.owner1@hanbee.test"), owner2Id = await pid("demo.owner2@hanbee.test");
const day = 86400000;
const iso = (offsetDays, hour = 10, minute = 0) => { const d = new Date(Date.now() + offsetDays * day); d.setUTCHours(hour, minute, 0, 0); return d.toISOString(); };
const istToday = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);

// ---------------------------------------------------------------- people
say("== people");
const exists = async (email) => !!(await pid(email));
// third school left pending
if (!(await exists("demo.owner3@hanbee.test"))) {
  must(await signup("demo.owner3@hanbee.test", {
    role: "school_staff", full_name: "Sunita Krishnan", school_name: "Riverside School (demo)", registration_no: "RVS-003",
    official_email: "office@riversideschool.hanbee.test", guardian_consent: "true",
  }), "register Riverside");
  say("  Riverside School (demo) registered, pending");
}
// Hanbee staff application, left unapproved
if (!(await exists("demo.staffapp@hanbee.test"))) {
  must(await signup("demo.staffapp@hanbee.test", { role: "staff", full_name: "Vikram Desai" }), "staff application");
  say("  staff application waiting");
}
// second approved Hanbee staff, invited by the manager
if (!(await exists("demo.staff2@hanbee.test"))) {
  let tok = (await q("select token from invitations where email='demo.staff2@hanbee.test' and not accepted and revoked_at is null and expires_at>now()"))[0]?.token;
  if (!tok) {
    const made = must(await api("/rest/v1/invitations", { method: "POST", token: morgan, prefer: "return=representation", body: { email: "demo.staff2@hanbee.test", role: "staff" } }), "invite staff2");
    tok = made.json[0].token;
  }
  must(await signup("demo.staff2@hanbee.test", { invite_token: tok, full_name: "Priya Nair" }), "staff2 signup");
  say("  demo.staff2 created");
}
const staff2Id = await pid("demo.staff2@hanbee.test");
const staff2 = await login("demo.staff2@hanbee.test");
// Attendance ignores days before an account existed, so give the two Hanbee staff a history.
await q("update profiles set created_at = now() - interval '45 days' where id = $1 and created_at > now() - interval '45 days'", [staff2Id]);
await q("update profiles set created_at = now() - interval '45 days' where id = $1 and created_at > now() - interval '45 days'", [jamieId]);
// student invitations for Demo Public School: two pending, one expired
for (const [email, kind] of [["demo.invitee1@hanbee.test", "pending"], ["demo.invitee2@hanbee.test", "pending"], ["demo.invitee3@hanbee.test", "expired"]]) {
  if ((await q("select 1 from invitations where email=$1", [email])).length) continue;
  await rpcSoft("invite_students", { p_org: org1, p_emails: [email] }, owner1);
  if (kind === "expired") await q("update invitations set expires_at = now() - interval '6 days', created_at = now() - interval '36 days' where email=$1", [email]);
  else await q("update invitations set created_at = now() - interval '2 days' where email=$1 and created_at > now() - interval '2 days'", [email]);
  say(`  invitation ${email} (${kind})`);
}

// ---------------------------------------------------------------- courses
say("== courses");
const COURSES = [
  {
    title: "RC Car Basics (demo)", description: "Learn how an RC car works, how to drive it and how to look after it.", section: "Batch A",
    modules: [
      { title: "Getting started", lessons: [
        { title: "Meet your RC car", type: "video", yt: "demoRcCar01", body: "" },
        { title: "Safety and setup", type: "text", body: "Charge the battery fully. Check the wheels. Keep the car away from the crowd. Always switch the transmitter on first and off last." },
      ] },
      { title: "First drive", lessons: [
        { title: "Steering and throttle control", type: "video", yt: "demoRcCar02", body: "" },
        { title: "Your first lap", type: "video", yt: "demoRcCar03", body: "" },
      ] },
    ],
  },
  {
    title: "Race Strategy (demo)", description: "Plan a race: tyre choice, pit stops, reading the track and staying calm under pressure.", section: "Batch A",
    modules: [
      { title: "Reading the track", lessons: [
        { title: "Track layout and racing line", type: "video", yt: "demoStrat01", body: "" },
        { title: "Tyre and battery notes", type: "text", body: "Soft tyres grip more and wear faster. Keep a spare battery charged. Write your lap times in a notebook." },
      ] },
      { title: "Race day", lessons: [
        { title: "Pit stop plan", type: "video", yt: "demoStrat02", body: "" },
      ] },
    ],
  },
  {
    title: "Pit Stop Practice (demo)", description: "Fast, safe pit stops for RC race day. Open for applications.", section: "Batch A",
    modules: [{ title: "Pit basics", lessons: [
      { title: "Pit lane rules", type: "text", body: "Slow in, stop in the box, work in order, exit safely." },
      { title: "Tyre change drill", type: "video", yt: "demoPit0001", body: "" },
      { title: "Timing your stop", type: "video", yt: "demoPit0002", body: "" },
    ] }],
  },
];
async function ensureCourse(def) {
  let id = (await q("select id from courses where title=$1", [def.title]))[0]?.id;
  if (!id) {
    const r = must(await api("/rest/v1/courses", { method: "POST", token: jamie, prefer: "return=representation", body: { title: def.title, description: def.description, status: "published", owner_id: jamieId } }), "course " + def.title);
    id = r.json[0].id;
  }
  let mi = 0;
  for (const m of def.modules) {
    mi++;
    let mid = (await q("select id from modules where course_id=$1 and title=$2", [id, m.title]))[0]?.id;
    if (!mid) mid = must(await api("/rest/v1/modules", { method: "POST", token: jamie, prefer: "return=representation", body: { course_id: id, title: m.title, sort_order: mi } }), "module").json[0].id;
    let li = 0;
    for (const l of m.lessons) {
      li++;
      if ((await q("select 1 from lessons where module_id=$1 and title=$2", [mid, l.title])).length) continue;
      must(await api("/rest/v1/lessons", { method: "POST", token: jamie, body: { module_id: mid, title: l.title, content_type: l.type, published: true, body_text: l.body || "", youtube_id: l.yt || null, sort_order: li } }), "lesson");
    }
  }
  if (!(await q("select 1 from sections where course_id=$1", [id])).length) {
    must(await api("/rest/v1/sections", { method: "POST", token: jamie, body: { course_id: id, name: def.section, capacity: 30, start_date: iso(-30).slice(0, 10), end_date: iso(60).slice(0, 10) } }), "section");
  }
  return id;
}
const courseId = {};
for (const c of COURSES) { courseId[c.title] = await ensureCourse(c); }
const introId = (await q("select id from courses where title='Intro to Design'"))[0]?.id;
const sectionOf = async (courseTitle) => (await q("select s.id from sections s join courses c on c.id=s.course_id where c.title=$1 order by s.created_at limit 1", [courseTitle]))[0]?.id;
const lessonsOf = async (course) => (await q("select l.id from lessons l join modules m on m.id=l.module_id where m.course_id=$1 and l.published order by m.sort_order, l.sort_order, l.id", [course])).map((x) => x.id);
const RC = "RC Car Basics (demo)", RS = "Race Strategy (demo)";
// [student email, course title, lessons to complete]
const PLAN = [
  ["demo.s1@hanbee.test", RC, 2], ["demo.s2@hanbee.test", RC, 4], ["demo.t1@hanbee.test", RC, 3], ["demo.s4@hanbee.test", RC, 0],
  ["demo.s1@hanbee.test", RS, 1], ["demo.s4@hanbee.test", RS, 2],
  ["demo.s3@hanbee.test", "Intro to Design", 0], ["demo.s1@hanbee.test", "Intro to Design", 1],
];
for (const [email, title, n] of PLAN) {
  const sec = await sectionOf(title);
  const sid = await pid(email);
  if (!(await q("select 1 from enrollments where student_id=$1 and section_id=$2", [sid, sec])).length) await rpcSoft("enroll_student", { p_student: sid, p_section: sec }, jamie);
  if (n > 0) {
    const t = await login(email);
    const course = title === "Intro to Design" ? introId : courseId[title];
    for (const lid of (await lessonsOf(course)).slice(0, n)) await rpcSoft("complete_lesson", { p_lesson_id: lid }, t, /already|quiz|earlier/i);
  }
}
{ // s2 finished the course and holds a certificate
  const t = await login("demo.s2@hanbee.test");
  const r = await rpc("issue_certificate", { p_course_title: RC }, t);
  if (!r.ok) say("  ! certificate: " + errText(r));
}
// applications: two waiting, one approved
for (const [email, title] of [["demo.s3@hanbee.test", RC], ["demo.solo@hanbee.test", RS]]) {
  await rpcSoft("apply_for_course", { p_course: courseId[title], p_payment_declared: true }, await login(email));
}
{
  await rpcSoft("apply_for_course", { p_course: courseId[RC], p_payment_declared: true }, await login("demo.t2@hanbee.test"));
  const app = (await q("select id from applications where applicant_id=$1 and course_id=$2 and status in ('applied','payment_declared')", [await pid("demo.t2@hanbee.test"), courseId[RC]]))[0]?.id;
  if (app) await rpcSoft("decide_course_application", { p_application: app, p_decision: "verified", p_section: await sectionOf(RC) }, jamie);
  await q("update applications set created_at = now() - interval '5 days' where applicant_id=$1 and course_id=$2 and created_at > now() - interval '5 days'", [await pid("demo.t2@hanbee.test"), courseId[RC]]);
  await q("update applications set created_at = now() - interval '2 days' where applicant_id=$1 and course_id=$2 and created_at > now() - interval '2 days'", [await pid("demo.s3@hanbee.test"), courseId[RC]]);
}
say("  courses, enrollments, progress, certificate, applications done");

// ---------------------------------------------------------------- lesson reviews and certificates
say("== lesson reviews and certificates");
const QUIZ = {
  [RC]: { lesson: "Meet your RC car", title: "Meet your RC car check (demo)", questions: [
    ["What should you switch on first?", ["The transmitter", "The car", "Neither"]],
    ["Why charge the battery fully?", ["It gives steady power", "It looks nicer", "It is required by law"]],
  ] },
  [RS]: { lesson: "Track layout and racing line", title: "Racing line check (demo)", questions: [
    ["Which line is usually fastest?", ["The smooth racing line", "The shortest wall hug", "Any line"]],
    ["What should you do before the corner?", ["Slow down early", "Speed up", "Close your eyes"]],
  ] },
};
const quizOf = {}; // course title -> { assessmentId, lessonId, questions: [{ id, options: [{id, correct}] }] }
for (const [title, def] of Object.entries(QUIZ)) {
  const lesson = (await q("select l.id from lessons l join modules m on m.id=l.module_id where m.course_id=$1 and l.title=$2", [courseId[title], def.lesson]))[0]?.id;
  if (!lesson) { say(`  ! lesson ${def.lesson} missing`); continue; }
  let aid = (await q("select id from assessments where lesson_id=$1", [lesson]))[0]?.id;
  if (!aid) {
    aid = (await q("insert into assessments (lesson_id, title, created_by) values ($1,$2,$3) returning id", [lesson, def.title, jamieId]))[0].id;
    for (const [qi, [prompt, options]] of def.questions.entries()) {
      const qid = (await q("insert into assessment_questions (assessment_id, prompt, sort_order) values ($1,$2,$3) returning id", [aid, prompt, qi]))[0].id;
      for (const [oi, label] of options.entries()) await q("insert into assessment_options (question_id, label, is_correct, sort_order) values ($1,$2,$3,$4)", [qid, label, oi === 0, oi]);
    }
    say(`  quiz added to ${title}`);
  }
  const questions = [];
  for (const row of await q("select id from assessment_questions where assessment_id=$1 order by sort_order", [aid])) {
    questions.push({ id: row.id, options: await q("select id, is_correct as correct from assessment_options where question_id=$1 order by sort_order", [row.id]) });
  }
  quizOf[title] = { assessmentId: aid, lessonId: lesson, questions };
}
const enrollmentOf = async (email, title) => (await q("select e.id from enrollments e join sections s on s.id=e.section_id where e.student_id=$1 and s.course_id=$2 limit 1", [await pid(email), courseId[title]]))[0]?.id;
// correct = how many questions to answer right (the rest pick a wrong option)
async function submitQuiz(email, title, correct, after) {
  const quiz = quizOf[title];
  const enrollment = await enrollmentOf(email, title);
  if (!quiz || !enrollment) { say(`  ! ${email} has no enrollment in ${title}`); return; }
  if ((await q("select 1 from assessment_submissions where assessment_id=$1 and enrollment_id=$2", [quiz.assessmentId, enrollment])).length) return;
  const answers = {};
  quiz.questions.forEach((qu, i) => { answers[qu.id] = (i < correct ? qu.options.find((o) => o.correct) : qu.options.find((o) => !o.correct)).id; });
  const r = await rpc("submit_assessment", { p_assessment_id: quiz.assessmentId, p_enrollment_id: enrollment, p_answers: answers }, await login(email));
  if (!r.ok) { say(`  ! submit for ${email}: ${errText(r)}`); return; }
  const sub = Array.isArray(r.json) ? r.json[0] : r.json;
  if (after === "verify") await rpcSoft("verify_assessment_submission", { p_submission_id: sub.id }, jamie);
  if (after === "overdue") await q("update assessment_submissions set submitted_at = now() - interval '25 minutes', auto_unlock_at = now() - interval '15 minutes' where id=$1", [sub.id]);
  say(`  ${email} submitted ${title} (${after ?? "waiting"})`);
}
await submitQuiz("demo.s1@hanbee.test", RC, 2, "verify");
await submitQuiz("demo.s2@hanbee.test", RC, 1, "verify");
await submitQuiz("demo.s4@hanbee.test", RS, 1, "verify");
await submitQuiz("demo.t1@hanbee.test", RC, 0, null);
await submitQuiz("demo.s4@hanbee.test", RC, 2, null);
await submitQuiz("demo.s1@hanbee.test", RS, 2, null);
await submitQuiz("demo.t2@hanbee.test", RC, 1, "overdue");

// two more students finish Race Strategy and earn a certificate
for (const email of ["demo.t1@hanbee.test", "demo.s3@hanbee.test"]) {
  const uid = await pid(email);
  if ((await q("select 1 from certificates where user_id=$1 and course_title=$2", [uid, RS])).length) continue;
  const sec = await sectionOf(RS);
  if (!(await q("select 1 from enrollments where student_id=$1 and section_id=$2", [uid, sec])).length) await rpcSoft("enroll_student", { p_student: uid, p_section: sec }, jamie);
  await submitQuiz(email, RS, 2, "verify");
  // the review happened two days ago, so the quiz no longer blocks the lesson
  await q("update assessment_submissions set submitted_at = now() - interval '2 days', auto_unlock_at = now() - interval '2 days' + interval '10 minutes' where enrollment_id=$1", [await enrollmentOf(email, RS)]);
  const t = await login(email);
  for (const lid of await lessonsOf(courseId[RS])) await rpcSoft("complete_lesson", { p_lesson_id: lid }, t, /already|earlier/i);
  const r = await rpc("issue_certificate", { p_course_title: RS }, t);
  say(r.ok ? `  ${email} earned a certificate for ${RS}` : `  ! certificate for ${email}: ${errText(r)}`);
}

// ---------------------------------------------------------------- tournaments
say("== tournaments");
const studentId = pid;
{
  let winter = (await q("select id from tournaments where title='Hanbee Winter Cup (demo)'"))[0]?.id;
  if (!winter) {
    winter = must(await rpc("create_tournament", { p_title: "Hanbee Winter Cup (demo)", p_description: "Last winter's inter-school RC F1 cup.", p_starts_at: iso(-75), p_ends_at: iso(-74), p_venue: "Hanbee Track, Chennai" }, jamie), "winter cup").json;
    const t1 = must(await rpc("create_team", { p_tournament: winter, p_name: "Turbo Falcons" }, owner1), "team").json;
    for (const e of ["demo.s1@hanbee.test", "demo.s2@hanbee.test"]) await rpc("add_team_member", { p_team: t1, p_student: await pid(e) }, owner1);
    await rpc("apply_team", { p_team: t1, p_payment_declared: true }, owner1);
    const t2 = must(await rpc("create_team", { p_tournament: winter, p_name: "Nitro Knights" }, owner2), "team").json;
    for (const e of ["demo.t1@hanbee.test", "demo.t2@hanbee.test"]) await rpc("add_team_member", { p_team: t2, p_student: await pid(e) }, owner2);
    await rpc("apply_team", { p_team: t2, p_payment_declared: true }, owner2);
    await rpc("decide_team", { p_team: t1, p_decision: "verified" }, jamie);
    await rpc("decide_team", { p_team: t2, p_decision: "verified" }, jamie);
    await rpcSoft("set_result", { p_tournament: winter, p_team: t2, p_rank: 1, p_points: 25, p_notes: "Clean laps, fastest pit stop (demo)" }, jamie);
    await rpcSoft("set_result", { p_tournament: winter, p_team: t1, p_rank: 2, p_points: 18, p_notes: "Lost time in the last corner (demo)" }, jamie);
    must(await rpc("update_tournament", { p_id: winter, p_title: "Hanbee Winter Cup (demo)", p_description: "Last winter's inter-school RC F1 cup.", p_starts_at: iso(-75), p_ends_at: iso(-74), p_venue: "Hanbee Track, Chennai", p_status: "completed" }, jamie), "complete winter");
    say("  Hanbee Winter Cup (demo) completed with two results");
  }
  const cup = (await q("select id from tournaments where title='Hanbee RC Cup 2026'"))[0]?.id;
  if (cup && !(await q("select 1 from tournament_teams where tournament_id=$1 and name='Alpha Sprint'", [cup])).length) {
    const t = must(await rpc("create_team", { p_tournament: cup, p_name: "Alpha Sprint" }, owner1), "Alpha Sprint").json;
    for (const e of ["demo.s3@hanbee.test", "demo.s4@hanbee.test"]) await rpc("add_team_member", { p_team: t, p_student: await pid(e) }, owner1);
    await rpc("apply_team", { p_team: t, p_payment_declared: true }, owner1);
    say("  Alpha Sprint applied (awaiting decision)");
  }
  if (cup && !(await q("select 1 from tournament_teams where tournament_id=$1 and name='Sample Juniors'", [cup])).length) {
    // both Sample Academy students are already on Sample Speed, so this draft has no members yet
    await rpcSoft("create_team", { p_tournament: cup, p_name: "Sample Juniors" }, owner2);
    say("  Sample Juniors draft created");
  }
}

// ---------------------------------------------------------------- announcements
say("== announcements");
const ANN = [
  ["Holiday schedule for October (demo)", "The centre is closed on public holidays. Check the Schedule page for the full list.", "all", null, morgan, morganId, 9, true],
  ["New course: RC Car Basics (demo)", "Enrolments are open for RC Car Basics and Race Strategy. Apply from the Courses page.", "student", null, jamie, jamieId, 6, false],
  ["Staff meeting on Monday, 10 AM (demo)", "Bring your weekly task updates. We will also review attendance.", "staff", null, morgan, morganId, 3, false],
  ["Team kit collection (demo)", "Kits for the RC Cup can be collected from the lab on Thursday.", "all", org1, owner1, owner1Id, 5, false],
  ["Parent meeting on Saturday (demo)", "Parents are invited to see the RC cars run. Please share the message at home.", "all", org1, owner1, owner1Id, 1, false],
  ["Track visit permission slips (demo)", "Please return the signed slip before the track visit.", "all", org2, owner2, owner2Id, 8, false],
  ["Sample Academy lab timings (demo)", "The lab is open from 3 PM to 5 PM on weekdays for RC practice.", "all", org2, owner2, owner2Id, 2, false],
];
for (const [title, body, audience, org, token, authorId, ago, pinned] of ANN) {
  if ((await q("select 1 from announcements where title=$1", [title])).length) continue;
  const r = must(await api("/rest/v1/announcements", { method: "POST", token, prefer: "return=representation", body: { author_id: authorId, title, body, audience, ...(org ? { org_id: org } : {}) } }), "announcement");
  await q("update announcements set created_at = now() - make_interval(days => $2) - interval '3 hours', pinned = $3 where id=$1", [r.json[0].id, ago, pinned]);
}

// ---------------------------------------------------------------- schedule
say("== schedule");
const EVENTS = [
  ["RC Car Basics live class (demo)", "class_session", "Hanbee Track, Chennai", 2, 10, 90, jamie, null, null],
  ["Office hours: Race Strategy (demo)", "office_hours", "Room 2", 4, 15, 60, jamie, null, null],
  ["Centre open house (demo)", "other", "Hanbee Centre", 9, 11, 180, morgan, null, null],
  ["Inter-house practice (demo)", "other", "School lab", 3, 9, 120, owner1, org1, null],
  ["Sample Academy track visit (demo)", "other", "Hanbee Track, Chennai", 6, 8, 240, owner2, org2, null],
  ["Prepare team kits (demo)", "other", "Staff room", 1, 14, 60, owner1, null, owner1Id],
  ["Review applications (demo)", "other", "Office", 1, 11, 45, jamie, null, jamieId],
  ["Weekly staff review (demo)", "other", "Office", 5, 10, 60, morgan, null, morganId],
];
for (const [title, type, loc, off, hour, mins, token, org, owner] of EVENTS) {
  if ((await q("select 1 from calendar_events where title=$1", [title])).length) continue;
  const start = iso(off, hour - 6, 30); // stored as UTC; hour is IST-ish (UTC+5:30)
  const end = new Date(new Date(start).getTime() + mins * 60000).toISOString();
  must(await api("/rest/v1/calendar_events", { method: "POST", token, body: { title, event_type: type, location: loc, starts_at: start, ends_at: end, ...(org ? { org_id: org } : {}), ...(owner ? { owner_id: owner } : {}) } }), "event " + title);
}
const workingDays = (n) => { const out = []; let d = new Date(istToday() + "T00:00:00Z"); while (out.length < n) { d = new Date(d.getTime() - day); const w = d.getUTCDay(); if (w >= 1 && w <= 5) out.push(d.toISOString().slice(0, 10)); } return out; };
const wd = workingDays(20); // most recent first
{
  if (!(await q("select 1 from holidays where name='Center closed (demo)'")).length) {
    const at = new Date(Date.now() + 12 * day); while ([0, 6].includes(at.getUTCDay())) at.setTime(at.getTime() + day);
    must(await api("/rest/v1/holidays", { method: "POST", token: morgan, body: { name: "Center closed (demo)", holiday_date: at.toISOString().slice(0, 10), scope: "center" } }), "holiday");
  }
  if (!(await q("select 1 from holidays where name='Founders Week Day (demo)'")).length) {
    const r = await api("/rest/v1/holidays", { method: "POST", token: morgan, body: { name: "Founders Week Day (demo)", holiday_date: wd[9], scope: "center" } });
    if (!r.ok) await q("insert into holidays (name, holiday_date, scope) values ('Founders Week Day (demo)', $1, 'center')", [wd[9]]);
  }
}

// ---------------------------------------------------------------- tasks
say("== tasks");
const TASKS = [
  [jamie, jamieId, [
    ["Review course applications (demo)", "high", "in_progress", 1], ["Upload lesson videos for Race Strategy (demo)", "medium", "todo", 4],
    ["Verify Alpha Sprint payment (demo)", "high", "todo", -2], ["Update Intro to Design slides (demo)", "low", "done", -6], ["Prepare RC Cup track layout (demo)", "medium", "in_progress", 10],
  ]],
  [staff2, staff2Id, [
    ["Call Riverside School about verification (demo)", "high", "todo", -1], ["Test the new RC cars (demo)", "medium", "in_progress", 3],
    ["Update attendance sheet (demo)", "low", "done", -4], ["Order spare tyres (demo)", "medium", "todo", 7],
  ]],
  [morgan, morganId, [
    ["Approve staff application (demo)", "high", "todo", 0], ["Review monthly attendance report (demo)", "medium", "in_progress", 5],
    ["Renew track booking (demo)", "high", "todo", -3], ["Send holiday notice to schools (demo)", "low", "done", -7], ["Plan Winter Cup prize ceremony (demo)", "low", "todo", 20],
  ]],
  [owner1, owner1Id, [
    ["Collect consent forms (demo)", "high", "in_progress", -1], ["Book the lab for practice (demo)", "medium", "todo", 2],
    ["Invite remaining students (demo)", "low", "todo", 6], ["Send payment receipt to Hanbee (demo)", "medium", "done", -5],
  ]],
];
for (const [token, staffId, list] of TASKS) {
  for (const [title, priority, status, due] of list) {
    if ((await q("select 1 from staff_tasks where staff_id=$1 and title=$2", [staffId, title])).length) continue;
    must(await api("/rest/v1/staff_tasks", { method: "POST", token, body: { staff_id: staffId, title, priority, status, due_date: iso(due).slice(0, 10), description: "Demo task." } }), "task " + title);
  }
}

// ---------------------------------------------------------------- attendance
say("== attendance");
{ // students: 6 more sessions per demo-course section, varied marks
  const marks = ["present", "present", "present", "late", "absent", "excused", "present", "present", "late", "present"];
  const secs = await q("select s.id from sections s join courses c on c.id=s.course_id where c.title in ('Intro to Design','RC Car Basics (demo)','Race Strategy (demo)')");
  for (const { id: sec } of secs) {
    if ((await q("select 1 from class_sessions where section_id=$1 and extract(second from scheduled_at)=7", [sec])).length) continue;
    const enr = await q("select id from enrollments where section_id=$1 order by id", [sec]);
    for (let i = 0; i < 6; i++) {
      const cs = (await q("insert into class_sessions (section_id, scheduled_at) values ($1, date_trunc('day', now()) - make_interval(days => $2) + interval '10 hours 0 minutes 7 seconds') returning id", [sec, 3 + i * 3]))[0].id;
      let k = 0;
      for (const e of enr) {
        k++;
        await q("insert into attendance_marks (class_session_id, enrollment_id, status, marked_by) values ($1,$2,$3::attendance_status,$4) on conflict do nothing", [cs, e.id, marks[(i * 3 + k * 7) % marks.length], jamieId]);
      }
    }
  }
}
{ // Hanbee staff: last 20 working days
  const hm = (date, h, m) => `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`;
  const build = async (staffId, absent, late, holidayIdx) => {
    for (let i = 0; i < wd.length; i++) {
      if (absent.includes(i) && i !== holidayIdx) continue;
      if (i === holidayIdx && staffId === jamieId) continue; // holiday, no entry
      const isLate = late.includes(i);
      const inH = isLate ? 9 : 9, inM = isLate ? 50 + ((i * 7) % 25) : 5 + ((i * 11) % 38);
      const cin = isLate && inM >= 60 ? hm(wd[i], 10, inM - 60) : hm(wd[i], inH, inM);
      const cout = hm(wd[i], 17, 20 + ((i * 13) % 40));
      await q(`insert into staff_time_entries (staff_id, work_date, clock_in, clock_out, on_time)
               values ($1, $2, $3::timestamptz, $4::timestamptz, (($3::timestamptz at time zone 'Asia/Kolkata')::time <= time '09:45')) on conflict (staff_id, work_date) do nothing`, [staffId, wd[i], cin, cout]);
    }
  };
  await build(jamieId, [4, 11], [2, 7, 15], 9);
  await build(staff2Id, [6, 13, 17], [1, 5, 10, 16], 9);
}

// ---------------------------------------------------------------- chat
say("== chat");
const nameToEmail = { anita: "demo.owner1@hanbee.test", rahul: "demo.owner2@hanbee.test", aarav: "demo.s1@hanbee.test", diya: "demo.s2@hanbee.test", kabir: "demo.s3@hanbee.test", meera: "demo.s4@hanbee.test", ishaan: "demo.t1@hanbee.test", tara: "demo.t2@hanbee.test", jamie: JAMIE, morgan: MORGAN };
const pwOf = (e) => (e === JAMIE ? "staff123" : e === MORGAN ? "manager123" : PW);
async function runChat(convId, lines, unread = {}) {
  const first = lines[0][1];
  if ((await q("select 1 from messages where conversation_id=$1 and body=$2", [convId, first])).length) return;
  const ids = [];
  for (const [who, body, hoursAgo] of lines) {
    const email = nameToEmail[who];
    const r = must(await api("/rest/v1/messages", { method: "POST", token: await login(email, pwOf(email)), prefer: "return=representation", body: { conversation_id: convId, body } }), "message");
    ids.push(r.json[0].id);
    await q("update messages set created_at = now() - make_interval(secs => $2) where id=$1", [r.json[0].id, hoursAgo * 3600]);
    await sleep(120);
  }
  await q("update conversation_participants set last_read_at = now() where conversation_id=$1", [convId]);
  for (const [who, lastN] of Object.entries(unread)) { // leave the last N messages unread for this person
    const cut = lines.length - lastN;
    const at = (await q("select created_at from messages where id=$1", [ids[cut]]))[0].created_at;
    await q("update conversation_participants set last_read_at = $3::timestamptz - interval '1 second' where conversation_id=$1 and user_id=$2", [convId, await pid(nameToEmail[who]), at]);
  }
}
const direct = async (a, b) => {
  const r = await rpc("start_conversation_with", { other_user_id: await pid(nameToEmail[b]) }, await login(nameToEmail[a], pwOf(nameToEmail[a])));
  if (!r.ok) throw new Error(`direct ${a}->${b}: ${errText(r)}`);
  return r.json;
};
const group = async (org) => (await q("select id from conversations where kind='group' and org_id=$1 limit 1", [org]))[0]?.id;
await runChat(await group(org1), [
  ["anita", "Welcome to the Demo Public School RC group. Use this space for practice updates.", 310],
  ["aarav", "Good morning ma'am, when is the next practice?", 300],
  ["anita", "Friday after lunch in the lab. Please bring your controllers.", 296],
  ["diya", "Can we test the new tyres on the track this time?", 250],
  ["anita", "Yes, but only with a teacher present.", 248],
  ["kabir", "I finished lesson 1 of RC Car Basics!", 120],
  ["meera", "Same here, the steering video was really helpful.", 118],
  ["anita", "Great work everyone. Team kits arrive on Thursday, watch the announcements.", 30],
], { aarav: 1 });
await runChat(await group(org2), [
  ["rahul", "Hello team, this is our Sample Academy RC group.", 200],
  ["ishaan", "Sir, are we still on for the track visit next week?", 190],
  ["rahul", "Yes. Permission slips must be back by Monday.", 188],
  ["tara", "I will bring mine tomorrow.", 150],
  ["ishaan", "Our team name Sample Speed is on the RC Cup list now.", 60],
  ["rahul", "Well done. Keep practising the pit stop.", 20],
]);
await runChat(await direct("aarav", "anita"), [
  ["aarav", "Ma'am, can I stay after school on Friday to tune the car?", 280],
  ["anita", "Yes, ask the lab assistant for the key.", 270],
  ["aarav", "Thank you, ma'am.", 269],
]);
await runChat(await direct("aarav", "jamie"), [
  ["aarav", "Sir, in the steering lesson what is the right trim setting for a smooth floor?", 200],
  ["jamie", "Start at zero and adjust one click at a time until the car drives straight.", 190],
  ["aarav", "Got it. And how many laps should I practise before the quiz?", 100],
  ["jamie", "Ten clean laps is a good target. Watch the racing line video again too.", 8],
  ["jamie", "I have added a text note on tyres to the Race Strategy course as well.", 7],
], { aarav: 2 });
await runChat(await direct("anita", "jamie"), [
  ["anita", "Good morning Jamie, two of our students applied for RC Car Basics. Please check the payment.", 150],
  ["jamie", "Thanks Anita, I will verify it today.", 140],
  ["anita", "Also, can we add a practice slot on Friday?", 60],
]);
await runChat(await direct("morgan", "jamie"), [
  ["morgan", "Jamie, please approve the new applications before Friday.", 100],
  ["jamie", "On it. Two are waiting, one is already approved.", 90],
  ["morgan", "Great. Also update the RC Cup track layout task.", 12],
  ["jamie", "Will do this afternoon.", 5],
], { morgan: 1 });
await runChat(await direct("morgan", "anita"), [
  ["morgan", "Hello Anita, thanks for registering the team Alpha Sprint.", 210],
  ["anita", "Thank you. We have declared the payment already.", 205],
  ["morgan", "Noted. Hanbee staff will verify it soon.", 20],
], { morgan: 1 });
await runChat(await direct("ishaan", "rahul"), [
  ["ishaan", "Sir, can we borrow a spare battery for practice?", 40],
  ["rahul", "Yes, collect it from the lab office tomorrow.", 36],
]);

say("\nDone. New logins (password Demo#12345): demo.owner3 (Riverside, pending), demo.staffapp (unapproved staff), demo.staff2 (Priya Nair, staff), demo.invitee1/2/3 (invited only).");
await db.end();
