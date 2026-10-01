import { connect } from "./_db.mjs";
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
// info@hanbee.in is now the one real manager (migration 0048); morgan@hanbeelms.edu
// was demoted to Hanbee staff. The variable NAMES below still mean "the manager
// actor" (morgan) and "a Hanbee staff account" (info) throughout this file, so
// only the email->variable binding is swapped here, not the logic below.
const jamie=await id("jamie@hanbeelms.edu"), morgan=await id("info@hanbee.in"), ava=await id("ava@student.edu"), info=await id("morgan@hanbeelms.edu");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];

await c.query("begin");
// ---- tasks
await asUser(jamie);
let r = await tryq("insert into staff_tasks (staff_id, title, priority) values ($1,'T33 high','high') returning id, status::text s, done, priority::text p",[jamie]);
const t1 = r.r.rows[0]; check("new task defaults: todo, not done, chosen priority", t1.s==="todo" && t1.done===false && t1.p==="high", JSON.stringify(t1));
await c.query("update staff_tasks set status='in_progress' where id=$1",[t1.id]);
r = await one("select status::text s, done from staff_tasks where id=$1",[t1.id]); check("in progress keeps done false", r.s==="in_progress" && r.done===false);
await c.query("update staff_tasks set status='done' where id=$1",[t1.id]);
r = await one("select status::text s, done from staff_tasks where id=$1",[t1.id]); check("status done sets done true", r.s==="done" && r.done===true);
await c.query("update staff_tasks set done=false where id=$1",[t1.id]);
r = await one("select status::text s, done from staff_tasks where id=$1",[t1.id]); check("clearing done moves it back to todo (old checkbox still works)", r.s==="todo" && r.done===false);
await c.query("update staff_tasks set done=true where id=$1",[t1.id]);
r = await one("select status::text s from staff_tasks where id=$1",[t1.id]); check("ticking done moves it to done", r.s==="done");
await c.query("update staff_tasks set staff_id=$1 where id=$2",[morgan,t1.id]).catch(()=>{});
r = await one("select staff_id from staff_tasks where id=$1",[t1.id]); check("a task cannot be handed to someone else", r?.staff_id===jamie);
r = await tryq("insert into staff_tasks (staff_id, title, priority) values ($1,'x','urgent')",[jamie]); check("unknown priority is refused", !!r.e);
await asUser(morgan); r = await one("select count(*)::int n from staff_tasks where id=$1",[t1.id]); check("manager can read every staff task", r.n===1);
r = await tryq("update staff_tasks set title='hacked' where id=$1",[t1.id]); check("manager cannot edit staff tasks", r.e || r.r.rowCount===0);
await asUser(ava); r = await one("select count(*)::int n from staff_tasks"); check("a student sees no staff tasks", r.n===0);

// ---- working hours
await asUser(morgan); r = await tryq("update staff_work_settings set start_time='10:00', grace_minutes=10"); check("manager can change working hours", !r.e && r.r.rowCount===1, r.e?.message);
await asUser(jamie); r = await tryq("update staff_work_settings set start_time='23:00'"); check("Hanbee staff cannot change working hours", r.e || r.r.rowCount===0);
r = await one("select count(*)::int n from staff_work_settings"); check("Hanbee staff can read working hours", r.n===1);
await asUser(ava); r = await one("select count(*)::int n from staff_work_settings"); check("students cannot read working hours", r.n===0);

// ---- lateness is computed by the server
await asOwner(); await c.query("delete from staff_time_entries where staff_id=$1 and work_date=current_date",[info]);
await c.query("update staff_work_settings set start_time='00:00', grace_minutes=0");
await asUser(info); await c.query("insert into staff_time_entries (staff_id, work_date, clock_in, on_time) values ($1,current_date, now(), true)",[info]);
r = await one("select on_time from staff_time_entries where staff_id=$1 and work_date=current_date",[info]); check("a clock-in after the start time is late, even if the client says on time", r.on_time===false);
await asOwner(); await c.query("delete from staff_time_entries where staff_id=$1 and work_date=current_date",[info]);
await c.query("update staff_work_settings set start_time='23:59', grace_minutes=0");
await asUser(info); await c.query("insert into staff_time_entries (staff_id, work_date, clock_in, on_time) values ($1,current_date, now(), false)",[info]);
r = await one("select on_time from staff_time_entries where staff_id=$1 and work_date=current_date",[info]); check("a clock-in before the start time is on time, even if the client says late", r.on_time===true);

// ---- attendance rows
await asOwner();
await c.query("update staff_work_settings set start_time='09:30', grace_minutes=15, work_days='{1,2,3,4,5,6,7}'");
await c.query("delete from staff_time_entries where staff_id=$1",[info]);
await c.query("insert into staff_time_entries (staff_id, work_date, clock_in, clock_out, on_time) values ($1, current_date-3, now()-interval '3 days', now()-interval '3 days' + interval '8 hours', true), ($1, current_date-2, now()-interval '2 days', now()-interval '2 days' + interval '6 hours', false)",[info]);
await c.query("delete from holidays where holiday_date between current_date-4 and current_date"); // real holidays may fall in this range; rolled back with everything else
await c.query("insert into holidays (name, holiday_date, scope) values ('T33 Holiday', current_date-1, 'center')");
await asUser(info);
let rows = (await c.query("select * from staff_attendance(null, current_date-4, current_date)")).rows; const by = Object.fromEntries(rows.map(x=>[(new Date(x.work_date)).toDateString(), x]));
const day = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toDateString(); };
check("attendance covers each day in the range", rows.length===5, `rows=${rows.length}`);
check("present day has hours", by[day(3)].status==="present" && Number(by[day(3)].hours)===8, JSON.stringify(by[day(3)]));
check("late day is late", by[day(2)].status==="late");
check("a holiday is not counted as absent", by[day(1)].status==="holiday" && by[day(1)].holiday_name==="T33 Holiday");
check("today with no clock-in is 'today', not absent", by[day(0)].status==="today");
check("a past day with no entry is absent", by[day(4)].status==="absent");
r = await tryq("select * from staff_attendance($1, current_date-1, current_date)",[jamie]); check("Hanbee staff cannot read another person's attendance", !!r.e);
r = await tryq("select * from staff_attendance(null, current_date-1000, current_date)"); check("an over-long range is refused", !!r.e);
await asUser(morgan); rows = (await c.query("select * from staff_attendance($1, current_date-3, current_date-2)",[info])).rows; check("manager can read a staff member's attendance", rows.length===2);
await asUser(ava); r = await tryq("select * from staff_attendance()"); check("a student cannot call staff_attendance", !!r.e);
await asUser(morgan); const ov = (await c.query("select * from hanbee_staff_overview()")).rows.find(x=>x.staff_id===info);
check("manager overview counts late and absent days", ov && ov.late_days_last_30===1 && ov.absent_days_last_30>=1 && ov.days_worked_last_30===2, JSON.stringify(ov && {late:ov.late_days_last_30, absent:ov.absent_days_last_30, worked:ov.days_worked_last_30}));
await asUser(jamie); r = await tryq("select * from hanbee_staff_overview()"); check("Hanbee staff cannot read the performance overview", !!r.e);

// ---- clocking in on a holiday or a day off is never late (migration 0034)
await asOwner();
await c.query("update staff_work_settings set start_time='00:00', grace_minutes=0, work_days='{1,2,3,4,5,6,7}'");
await c.query("delete from staff_time_entries where staff_id=$1",[info]);
await c.query("delete from holidays where holiday_date between current_date-4 and current_date");
await c.query("insert into holidays (name, holiday_date, scope) values ('T34 Holiday', current_date, 'center')");
await c.query("insert into staff_time_entries (staff_id, work_date, clock_in, on_time) values ($1, current_date, now(), false)",[info]);
await asUser(info);
r = await one("select status from staff_attendance(null, current_date, current_date)"); check("a holiday clock-in counts as present, not late", r.status==="present", JSON.stringify(r));
await asOwner();
await c.query("delete from holidays where name='T34 Holiday'");
await c.query("update staff_work_settings set work_days = array_remove('{1,2,3,4,5,6,7}'::int[], extract(isodow from current_date)::int)");
await asUser(info);
r = await one("select status from staff_attendance(null, current_date, current_date)"); check("a clock-in on a day off counts as present, not late", r.status==="present", JSON.stringify(r));
await asOwner();
await c.query("update staff_work_settings set work_days='{1,2,3,4,5,6,7}'");
await asUser(info);
r = await one("select status from staff_attendance(null, current_date, current_date)"); check("a normal working day past the start time is still late", r.status==="late", JSON.stringify(r));

// ---- days before the account existed are not absences (migration 0035)
await asOwner();
await c.query("update staff_work_settings set start_time='09:30', grace_minutes=15, work_days='{1,2,3,4,5,6,7}'");
await c.query("delete from staff_time_entries where staff_id=$1",[info]);
await c.query("delete from holidays where holiday_date between current_date-6 and current_date");
const created = (await one("select created_at::date d from profiles where id=$1",[info])).d;
await c.query("update profiles set created_at = (current_date - 3)::timestamp where id=$1",[info]);
await asUser(info);
rows = (await c.query("select work_date::text d, status from staff_attendance(null, current_date-6, current_date-1)")).rows;
check("days before the account existed are off, not absent", rows.filter(x=>x.status==="absent").length===3 && rows.filter(x=>x.status==="off").length===3, JSON.stringify(rows.map(x=>x.status)));
await asOwner(); await c.query("update profiles set created_at=$2 where id=$1",[info, created]);
await c.query("rollback");
await asOwner();
const s = await one("select start_time::text st, grace_minutes g from staff_work_settings"); check("all changes rolled back (settings unchanged)", s.st==="09:30:00" && s.g===15, JSON.stringify(s));
check("no test rows left", (await one("select count(*)::int n from staff_tasks where title like 'T33%'")).n===0 && (await one("select count(*)::int n from holidays where name='T33 Holiday'")).n===0);
console.log(`${pass} passed, ${fail} failed`);
await c.end();
