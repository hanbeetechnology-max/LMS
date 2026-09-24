import { connect } from "./_db.mjs";
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
const jamie=await id("jamie@hanbeelms.edu"), morgan=await id("morgan@hanbeelms.edu"), info=await id("info@hanbee.in");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];
const signup = async (email, meta) => { await asOwner(); const uid = (await one("select gen_random_uuid() u")).u;
  const r = await tryq("insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values ($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,$3::jsonb,now(),now())",[uid,email,JSON.stringify(meta)]);
  if (r.e) throw new Error("signup failed "+email+": "+r.e.message); return uid; };
const schoolMeta = (name) => ({role:"school_staff", full_name:"Owner "+name, school_name:name, registration_no:"REG-"+name, official_email:"office@x.test", guardian_consent:"true"});

await c.query("begin");
const ownerA = await signup("ownerA@x.test", schoolMeta("Alpha School")), ownerB = await signup("ownerB@x.test", schoolMeta("Beta School")), ownerC = await signup("ownerC@x.test", schoolMeta("Pending School"));
const orgOf = async u => (await one("select org_id from organization_members where user_id=$1",[u])).org_id;
const orgA = await orgOf(ownerA), orgB = await orgOf(ownerB), orgC = await orgOf(ownerC);
await asUser(jamie); await c.query("select verify_school($1)",[orgA]); await c.query("select verify_school($1)",[orgB]);
await asUser(ownerA); await c.query("select * from invite_students($1, array['sa1@x.test','sa2@x.test'])",[orgA]);
await asUser(ownerB); await c.query("select * from invite_students($1, array['sb1@x.test'])",[orgB]);
await asOwner(); const tokA = (await one("select join_token t from organizations where id=$1",[orgA])).t, tokB = (await one("select join_token t from organizations where id=$1",[orgB])).t;
const sA1 = await signup("sa1@x.test",{join_token:tokA}), sA2 = await signup("sa2@x.test",{join_token:tokA}), sB1 = await signup("sb1@x.test",{join_token:tokB});
await asOwner();
const course = (await one("insert into courses (title,status,owner_id) values ('T29 Course','published',$1) returning id",[jamie])).id;
const mod = (await one("insert into modules (course_id,title,sort_order) values ($1,'M',0) returning id",[course])).id;
const lessons = []; for (let i=0;i<3;i++) lessons.push((await one("insert into lessons (module_id,title,published,sort_order) values ($1,$2,true,$3) returning id",[mod,"L"+i,i])).id);
const section = (await one("insert into sections (course_id,name,start_date,end_date) values ($1,'Sec 1',current_date,current_date+30) returning id",[course])).id;
const enrA1 = (await one("insert into enrollments (section_id, student_id, status) values ($1,$2,'active') returning id",[section,sA1])).id;
await c.query("insert into enrollments (section_id, student_id, status) values ($1,$2,'active')",[section,sB1]);
await c.query("insert into lesson_completions (enrollment_id, lesson_id) values ($1,$2),($1,$3)",[enrA1,lessons[0],lessons[1]]);
const tour = (await one("insert into tournaments (title,description,starts_at,ends_at,venue,status,created_by) values ('T29 Cup','',now()+interval '1 day',now()+interval '2 days','Track','upcoming',$1) returning id",[jamie])).id;
const team = (await one("insert into tournament_teams (tournament_id,org_id,name,status,created_by) values ($1,$2,'Alpha Racers','applied',$3) returning id",[tour,orgA,ownerA])).id;
await c.query("insert into tournament_team_members (team_id,tournament_id,student_id,org_id_at_join) values ($1,$2,$3,$4)",[team,tour,sA1,orgA]);

// ---- overviews
await asUser(ownerA);
let r = await one("select school_overview($1) o",[orgA]); const o = r.o;
check("school overview: people", o.people.students===2 && o.people.owners===1 && o.people.pending_invites===0, JSON.stringify(o.people));
check("school overview: tournament", o.tournament.teams_total===1 && o.tournament.participants===1 && o.tournament.teams_by_status.applied===1 && o.tournament.next_tournament?.title==="T29 Cup", JSON.stringify(o.tournament));
check("school overview: lms progress", o.lms.students_enrolled===1 && o.lms.lessons_completed===2 && Number(o.lms.avg_completion_pct)===67, JSON.stringify(o.lms));
r = await tryq("select school_overview($1)",[orgB]); check("school A staff cannot read school B's overview", !!r.e);
await asUser(sA1); r = await tryq("select school_overview($1)",[orgA]); check("a student cannot read the school overview", !!r.e);
await asUser(jamie); r = await tryq("select school_overview($1)",[orgB]); check("Hanbee staff can read any school overview", !r.e);
await asUser(morgan); r = await tryq("select school_overview($1)",[orgA]); check("manager can read any school overview", !r.e);
await asUser(ownerA); let rows = (await c.query("select * from school_students($1)",[orgA])).rows;
const s1row = rows.find(x=>x.student_id===sA1);
check("school students: only this school, with team and progress", rows.length===2 && s1row.team_name==="Alpha Racers" && s1row.completion_pct===67 && s1row.courses_enrolled===1, JSON.stringify(s1row));
r = await tryq("select * from school_students($1)",[orgB]); check("school A staff cannot list school B's students", !!r.e);
rows = (await c.query("select * from school_course_participation($1)",[orgA])).rows; check("course participation for the school", rows.length===1 && rows[0].students===1 && rows[0].avg_completion_pct===67, JSON.stringify(rows));
rows = (await c.query("select * from course_students($1)",[course])).rows; check("school A staff see only their own students in a course", rows.length===1 && rows[0].student_id===sA1 && rows[0].org_name==="Alpha School", JSON.stringify(rows.map(x=>x.org_name)));
await asUser(ownerB); rows = (await c.query("select * from course_students($1)",[course])).rows; check("school B staff see only theirs", rows.length===1 && rows[0].student_id===sB1);
await asUser(jamie); rows = (await c.query("select * from course_students($1)",[course])).rows;
check("Hanbee staff see every student with school, progress and new flag", rows.length===2 && rows.find(x=>x.student_id===sA1).completed===2 && rows.every(x=>x.is_new===true) && rows.some(x=>x.org_name==="Beta School"));
await asUser(sA1); r = await tryq("select * from course_students($1)",[course]); check("a student cannot call course_students", !!r.e);
r = await tryq("select * from school_directory()"); check("a student cannot see the school directory", !!r.e);
await asUser(ownerA); r = await tryq("select * from school_directory()"); check("school staff cannot see the school directory", !!r.e);
await asUser(jamie); rows = (await c.query("select * from school_directory()")).rows; check("Hanbee staff see every school, pending first", rows.length===3 && rows[0].status==="pending" && rows.find(x=>x.name==="Alpha School").students===2, JSON.stringify(rows.map(x=>x.status)));
r = await one("select site_tournament_overview() t, site_lms_overview() l"); check("site overviews work for Hanbee staff", r.t.teams.applied===1 && r.l.courses.published>=1);
await asUser(ownerA); r = await tryq("select site_tournament_overview()"); check("school staff cannot read site overviews", !!r.e);
await asUser(sA1); r = await tryq("select site_lms_overview()"); check("students cannot read site overviews", !!r.e);
await asUser(morgan); rows = (await c.query("select * from hanbee_staff_overview()")).rows; check("manager sees Hanbee staff hours and tasks", rows.some(x=>x.staff_id===jamie));
await asUser(jamie); r = await tryq("select * from hanbee_staff_overview()"); check("Hanbee staff cannot see the staff overview", !!r.e);
await asUser(sA1); r = await tryq("select internal_enrollment_progress()"); check("internal progress function is not callable by clients", !!r.e);

// ---- account status
await asUser(jamie); r = await tryq("select set_account_status($1,'suspended','test')",[sA1]); check("Hanbee staff can suspend a student", !r.e, r.e?.message);
await asOwner(); r = await one("select p.account_status::text s, u.banned_until is not null b from profiles p join auth.users u on u.id=p.id where p.id=$1",[sA1]); check("suspension bans sign-in", r.s==="suspended" && r.b===true, JSON.stringify(r));
await asUser(sA1); r = await one("select is_active_account() a, my_org_id() o, (select count(*)::int from lessons) l"); check("a suspended student loses school and course access at once", r.a===false && r.o===null && r.l===0, JSON.stringify(r));
await asUser(jamie); await c.query("select set_account_status($1,'active')",[sA1]); await asOwner();
r = await one("select p.account_status::text s, u.banned_until is null b from profiles p join auth.users u on u.id=p.id where p.id=$1",[sA1]); check("reactivation restores the account", r.s==="active" && r.b===true);
await asUser(jamie);
r = await tryq("select set_account_status($1,'suspended')",[morgan]); check("Hanbee staff cannot suspend the manager", !!r.e);
r = await tryq("select set_account_status($1,'suspended')",[info]); check("Hanbee staff cannot suspend other Hanbee staff", !!r.e);
r = await tryq("select set_account_status($1,'suspended')",[jamie]); check("nobody can change their own status", !!r.e);
await asUser(ownerA); r = await tryq("select set_account_status($1,'suspended')",[sA1]); check("school staff cannot suspend anyone", !!r.e);
await asUser(morgan); r = await tryq("select set_account_status($1,'suspended','test')",[info]); check("manager can suspend Hanbee staff", !r.e, r.e?.message);
await asOwner(); check("suspended Hanbee staff has no role", (await one("select count(*)::int n from profiles where id=$1 and account_status='suspended'",[info])).n===1);

// ---- school status
await asUser(jamie); r = await tryq("select set_school_status($1,'active')",[orgC]); check("a pending school cannot be status-changed", !!r.e);
await c.query("select set_school_status($1,'suspended','test')",[orgA]);
await asUser(sA1); check("students lose the school while it is suspended", (await one("select my_org_id() o")).o===null);
await asUser(ownerA); check("school staff cannot manage a suspended school", (await one("select can_manage_org($1) m",[orgA])).m===false);
await asUser(jamie); await c.query("select set_school_status($1,'active')",[orgA]);
await asUser(sA1); check("reactivating the school restores access", (await one("select my_org_id() o")).o===orgA);
// conversion before close
r = await tryq("select convert_to_solo()"); check("a student still in a school cannot go solo alone", !!r.e);
await asUser(ownerA); r = await tryq("select convert_to_solo($1)",[sA2]); check("school staff cannot convert students", !!r.e);
await asUser(jamie); r = await tryq("select convert_to_solo($1)",[sA2]); check("Hanbee staff can convert a student to solo", !r.e, r.e?.message);
await asOwner(); r = await one("select p.is_solo s, (select count(*)::int from organization_members where user_id=p.id and status='active') m from profiles p where p.id=$1",[sA2]); check("conversion sets solo and ends the membership", r.s===true && r.m===0, JSON.stringify(r));
await asUser(ownerB); r = await tryq("select convert_to_solo($1)",[ownerB]); check("only students can become solo", !!r.e);
// close
await asUser(ownerA); r = await tryq("select set_school_status($1,'closed')",[orgA]); check("school staff cannot close their school themselves", !!r.e);
await asUser(morgan); await c.query("select set_school_status($1,'closed','left the programme')",[orgA]);
await asOwner(); r = await one("select (select count(*)::int from organization_members where org_id=$1 and status='active') a, (select count(*)::int from profiles where id=$2 and account_status='active') s",[orgA,sA1]);
check("closing ends every membership; student accounts stay active", r.a===0 && r.s===1, JSON.stringify(r));
await asUser(jamie); r = await tryq("select set_school_status($1,'active')",[orgA]); check("a closed school cannot reopen", !!r.e);
await asUser(sA1); check("the student's LMS access survives the school closing", (await one("select count(*)::int n from lessons")).n===3);
await asOwner(); r = await one("select tournament_id, org_id_at_join from tournament_team_members where student_id=$1",[sA1]); check("team record keeps the original school", r.org_id_at_join===orgA);
// solo then join a new school
await asUser(sA1); await c.query("select convert_to_solo()"); await asOwner();
check("a student whose school closed converts themself", (await one("select is_solo s from profiles where id=$1",[sA1])).s===true);
await asUser(ownerB); r = await one("select * from invite_students($1, array['sa1@x.test']) ",[orgB]); check("another school can invite the ex-student", r.result==="invited", JSON.stringify(r));
await asUser(sA2); r = await tryq("select join_school($1)",[tokB]); check("joining without an invite is refused", !!r.e);
await asUser(sA1); r = await tryq("select join_school('wrong')"); check("a wrong link is refused", !!r.e);
r = await one("select join_school($1) j",[tokB]); check("an invited solo student joins the new school", r.j.result==="joined", JSON.stringify(r.j));
await asOwner(); r = await one("select p.is_solo s, m.org_id from profiles p join organization_members m on m.user_id=p.id and m.status='active' where p.id=$1",[sA1]); check("joining clears solo and creates the membership", r.s===false && r.org_id===orgB, JSON.stringify(r));
await asUser(sA1); r = await tryq("select join_school($1)",[tokB]); check("a student already in a school cannot join another", !!r.e);
// audit
await asUser(morgan); r = await one("select count(*)::int n from audit_log where action in ('set_account_status','set_school_status','convert_to_solo','join_school')"); check("every status change is audit-logged", r.n>=6, `n=${r.n}`);
await c.query("rollback");
await asOwner();
check("all test rows rolled back", (await one("select count(*)::int n from organizations")).n===0 && (await one("select count(*)::int n from courses where title='T29 Course'")).n===0 && (await one("select account_status::text s from profiles where id=$1",[info])).s==="active");
console.log(`${pass} passed, ${fail} failed`);
await c.end();
