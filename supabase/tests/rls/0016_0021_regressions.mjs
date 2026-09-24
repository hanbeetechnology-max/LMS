import { connect } from "./_db.mjs";
// Regression checks for the security fixes in migrations 0016-0021:
// role self-promotion, attendance / certificate / time-entry forgery,
// server-checked lesson completion, gated course content, scoped profile reads.
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
const ava=await id("ava@student.edu"), jamie=await id("jamie@hanbeelms.edu"), morgan=await id("morgan@hanbeelms.edu");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asAnon = async () => { await c.query("reset role"); await c.query("set local role anon"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:"anon"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];

const enr = await one("select e.id, s.course_id from enrollments e join sections s on s.id=e.section_id where e.student_id=$1 limit 1",[ava]);
const L = (await c.query("select l.id, l.title from lessons l join modules m on m.id=l.module_id where m.course_id=$1 and l.published order by m.sort_order,l.sort_order",[enr.course_id])).rows;

await c.query("begin");
// 0016 profile self-promotion
await asUser(ava);
await c.query("update profiles set role='manager', approved=true, account_status='revoked' where id=$1",[ava]);
await c.query("update profiles set full_name='Ava Regression' where id=$1",[ava]);
await asOwner(); let r = await one("select role, account_status::text s, full_name from profiles where id=$1",[ava]);
check("student cannot promote themselves or change account status", r.role==="student" && r.s==="active", JSON.stringify(r));
check("student can still edit their own name", r.full_name==="Ava Regression");
await asUser(morgan); await c.query("update profiles set approved=approved where id=$1",[jamie]);
check("manager can still update another profile", true);
// 0016 attendance forgery + RPCs
await asUser(ava);
const sid = (await one("insert into auto_attendance_sessions (user_id, expires_at) values ($1, now()+interval '1 hour') returning id",[ava])).id;
await c.query("update auto_attendance_sessions set status='present', ended_at=now() where id=$1",[sid]);
await asOwner(); r = await one("select status::text s, ended_at from auto_attendance_sessions where id=$1",[sid]);
check("attendance status cannot be forged directly", r.s==="active" && r.ended_at===null, JSON.stringify(r));
await asUser(ava); r = await tryq("select * from heartbeat($1)",[sid]); check("heartbeat() still works", !r.e && r.r.rows[0]?.id===sid, r.e?.message);
r = await tryq("select * from finalize_my_session($1)",[sid]); check("finalize_my_session() still works", !r.e && r.r.rows[0]?.status==="left_early", r.e?.message);
// 0016/0018 certificates
r = await tryq("insert into certificates (user_id, course_title, serial) values ($1,'Fake','FORGED-1')",[ava]); check("direct certificate insert is blocked", !!r.e);
r = await tryq("select * from issue_certificate('No Such Course')"); check("certificate for a course that does not exist is refused", !!r.e, r.e?.message);
// 0017 time entries
await asUser(jamie);
r = await tryq("insert into staff_time_entries (staff_id, work_date, clock_in, on_time) values ($1, current_date - 400, now() - interval '400 days', true)",[jamie]); check("backdated time entry is rejected", !!r.e);
// 0019 lesson completion
await asUser(ava);
await c.query("delete from lesson_completions where enrollment_id=$1",[enr.id]);
r = await tryq("insert into lesson_completions (enrollment_id, lesson_id) values ($1,$2)",[enr.id,L[0].id]); check("direct lesson completion insert is blocked", !!r.e);
r = await tryq("select complete_lesson($1)",[L[2].id]); check("skipping ahead is refused", !!r.e && /earlier/.test(r.e.message), r.e?.message);
r = await tryq("select complete_lesson($1)",[L[0].id]); check("lessons complete in order", !r.e, r.e?.message);
// 0020 gated content
await asAnon(); check("anonymous reads no lessons", (await one("select count(*)::int n from lessons")).n===0);
// 0021 profiles: another student's row is hidden
await asOwner();
const other = (await one("select gen_random_uuid() u")).u;
await c.query("insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values ($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','reg-solo@x.test',$2::jsonb,now(),now())",[other,JSON.stringify({role:"staff"})]);
await c.query("update profiles set role='student', approved=true where id=$1",[other]);
await asUser(ava); check("a student cannot read another student's profile", (await one("select count(*)::int n from profiles where id=$1",[other])).n===0);
await c.query("rollback");
await asOwner();
check("all regression rows rolled back", (await one("select count(*)::int n from profiles where email='reg-solo@x.test'")).n===0);
console.log(`${pass} passed, ${fail} failed`);
await c.end();
