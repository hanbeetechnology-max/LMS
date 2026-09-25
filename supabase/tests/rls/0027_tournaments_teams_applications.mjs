import { connect } from "./_db.mjs";
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
const jamie=await id("jamie@hanbeelms.edu"), morgan=await id("morgan@hanbeelms.edu");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asAnon = async () => { await c.query("reset role"); await c.query("set local role anon"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:"anon"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];
const signup = async (email, meta) => { await asOwner(); const uid = (await one("select gen_random_uuid() u")).u;
  const r = await tryq("select test_support_signup($1,$2,$3::jsonb)",[uid,email,JSON.stringify(meta)]);
  return { ...r, uid }; };
const schoolMeta = (name) => ({role:"school_staff", full_name:"Owner "+name, school_name:name, registration_no:"REG-"+name, official_email:"office@"+name.toLowerCase().replace(/\W/g,"")+".test", guardian_consent:"true"});
const ok = (r)=>!r.e;
const auditN = async (a)=>{ await asOwner(); return (await one("select count(*)::int n from audit_log where action=$1",[a])).n; };

await c.query("begin");
const baseAudit = (await one("select count(*)::int n from audit_log")).n;
const baseT=(await one("select count(*)::int n from tournaments")).n, baseTT=(await one("select count(*)::int n from tournament_teams")).n, baseTR=(await one("select count(*)::int n from tournament_results")).n, baseO=(await one("select count(*)::int n from organizations")).n;
const baseAct={}; for (const a of ["create_tournament","decide_team","decide_course_application","enroll_student"]) baseAct[a]=(await one("select count(*)::int n from audit_log where action=$1",[a])).n;
const baseApp=(await one("select count(*)::int n from applications")).n;
// --- setup
const oA=(await signup("owner-a@x.test",schoolMeta("Alpha School"))).uid, oB=(await signup("owner-b@x.test",schoolMeta("Beta School"))).uid, oC=(await signup("owner-c@x.test",schoolMeta("Gamma School"))).uid;
const orgOf = async u=>(await one("select org_id from organization_members where user_id=$1",[u])).org_id;
const orgA=await orgOf(oA), orgB=await orgOf(oB), orgC=await orgOf(oC);
await asUser(jamie); for (const o of [orgA,orgB,orgC]) await c.query("select verify_school($1)",[o]);
const invite = async (owner, org, emails)=>{ await asUser(owner); await c.query("select * from invite_students($1,$2::text[])",[org,emails]); };
await invite(oA,orgA,["a1@x.test","a2@x.test","a3@x.test"]); await invite(oB,orgB,["b1@x.test"]); await invite(oC,orgC,["c1@x.test"]);
await asOwner(); const tok = async o=>(await one("select join_token t from organizations where id=$1",[o])).t;
const [tA,tB,tC]=[await tok(orgA),await tok(orgB),await tok(orgC)];
const a1=(await signup("a1@x.test",{join_token:tA,full_name:"Alice One"})).uid, a2=(await signup("a2@x.test",{join_token:tA,full_name:"Alan Two"})).uid, a3=(await signup("a3@x.test",{join_token:tA,full_name:"Susp Three"})).uid;
const b1=(await signup("b1@x.test",{join_token:tB,full_name:"Bea One"})).uid, c1=(await signup("c1@x.test",{join_token:tC,full_name:"Cy One"})).uid;
await asUser(jamie); await c.query("insert into invitations (email, role) values ('solo@x.test','student')");
await asOwner(); const soloTok=(await one("select token t from invitations where lower(email)='solo@x.test'")).t;
const solo=(await signup("solo@x.test",{invite_token:soloTok,full_name:"Solo Sam"})).uid;
check("solo flagged", (await one("select is_solo s from profiles where id=$1",[solo])).s===true);
const solo2=(await (async()=>{await asUser(jamie); await c.query("insert into invitations (email, role) values ('solo2@x.test','student')"); await asOwner(); const t=(await one("select token t from invitations where lower(email)='solo2@x.test'")).t; return signup("solo2@x.test",{invite_token:t,full_name:"Solo Two"});})()).uid;
await asOwner();
const course=(await one("insert into courses (title, status, owner_id) values ('Robotics 101','published',$1) returning id",[jamie])).id;
const draftCourse=(await one("insert into courses (title, status, owner_id) values ('Hidden','draft',$1) returning id",[jamie])).id;
const section=(await one("insert into sections (course_id,name,start_date,end_date) values ($1,'S1',current_date,current_date+30) returning id",[course])).id;
await asOwner(); await c.query("update profiles set account_status='suspended' where id=$1",[a3]);
const staffA=oA, staffB=oB;

// --- tournaments
await asUser(a1); let r=await tryq("select create_tournament('X','',now(),now(),'v')"); check("student cannot create tournament",!!r.e);
await asUser(staffA); r=await tryq("select create_tournament('X','',now(),now(),'v')"); check("school staff cannot create tournament",!!r.e);
await asAnon(); r=await tryq("select create_tournament('X','',now(),now(),'v')"); check("anon cannot create tournament",!!r.e);
await asUser(a1); r=await tryq("insert into tournaments (title,starts_at,ends_at) values ('X',now(),now())"); check("student direct insert tournament blocked",!!r.e);
await asUser(jamie); r=await tryq("select create_tournament('RC F1 Cup','desc',now()+interval '10 day',now()+interval '11 day','Hall') t"); check("Hanbee staff creates tournament",ok(r)); const T=r.r.rows[0].t;
await asUser(morgan); r=await tryq("select create_tournament('Second','',now()+interval '20 day',now()+interval '21 day','Hall') t"); check("manager creates tournament",ok(r)); const T2=r.r.rows[0].t;
await asUser(staffA); r=await tryq("select update_tournament($1,'H','',now(),now(),'',  'live')",[T]); check("school staff cannot update tournament",!!r.e);
r=await tryq("update tournaments set title='hax' where id=$1",[T]); check("school staff direct update blocked",!!r.e);
await asUser(a1); r=await tryq("select update_tournament($1,'H','',now(),now(),'','live')",[T]); check("student cannot update tournament",!!r.e);
await asUser(jamie); r=await tryq("select update_tournament($1,'RC F1 Cup','desc2',now()+interval '10 day',now()+interval '11 day','Hall','upcoming')",[T]); check("Hanbee staff updates tournament",ok(r));
r=await tryq("select create_tournament('bad','',now(),now()-interval '1 day','')"); check("end before start refused",!!r.e);

// --- visibility of tournaments
const cnt = async (sql,p)=>(await one(sql,p)).n;
for (const [n,u,exp] of [["school staff A",staffA,2+baseT],["student a1",a1,2+baseT],["solo student",solo,2+baseT],["manager",morgan,2+baseT],["Hanbee staff",jamie,2+baseT]]) { await asUser(u); check(`${n} sees tournaments`, await cnt("select count(*)::int n from tournaments")===exp); }
await asAnon(); r=await tryq("select count(*)::int n from tournaments"); check("anonymous sees no tournaments", !r.e ? r.r.rows[0].n===0 : true, r.e?.message);
await asUser(a3); check("suspended student sees none", await cnt("select count(*)::int n from tournaments")===0);
await asOwner(); await c.query("update organizations set status='pending' where id=$1",[orgB]); await asUser(staffB); check("staff of non-active school sees none", await cnt("select count(*)::int n from tournaments")===0);
await asOwner(); await c.query("update organizations set status='active' where id=$1",[orgB]);

// --- teams
await asUser(a1); r=await tryq("select create_team($1,'Hax')",[T]); check("student cannot create school team",!!r.e);
await asUser(solo); r=await tryq("select create_team($1,'Hax')",[T]); check("solo cannot create school team",!!r.e);
await asUser(jamie); r=await tryq("select create_team($1,'Hax')",[T]); check("Hanbee staff cannot create school team",!!r.e);
await asUser(staffA); r=await tryq("select create_team($1,'Alpha Racers') t",[T]); check("school A staff creates team",ok(r)); const teamA=r.r.rows[0].t;
r=await tryq("select create_team($1,'Alpha Racers')",[T]); check("duplicate team name refused",!!r.e, r.e?.message);
await asUser(staffB); r=await tryq("select create_team($1,'Beta Bots') t",[T]); const teamB=r.r.rows[0].t; check("school B staff creates team",ok(r));
await asUser(staffA); r=await tryq("select add_team_member($1,$2)",[teamA,a1]); check("add own student",ok(r));
r=await tryq("select add_team_member($1,$2)",[teamA,b1]); check("cannot add school B student",!!r.e,r.e?.message);
r=await tryq("select add_team_member($1,$2)",[teamA,solo]); check("cannot add solo student",!!r.e);
r=await tryq("select add_team_member($1,$2)",[teamA,a3]); check("cannot add suspended student",!!r.e);
r=await tryq("select add_team_member($1,$2)",[teamA,a1]); check("cannot add same student twice",!!r.e);
r=await tryq("select add_team_member($1,$2)",[teamB,a2]); check("school A cannot touch school B team",!!r.e);
r=await tryq("select apply_team($1,false)",[teamB]); check("school A cannot apply B's team",!!r.e);
r=await tryq("select remove_team_member($1,$2)",[teamB,b1]); check("school A cannot remove from B's team",!!r.e);
r=await tryq("insert into tournament_team_members (team_id,tournament_id,student_id) values ($1,$2,$3)",[teamA,T,a2]); check("direct member insert blocked",!!r.e);
await asUser(staffB); r=await tryq("select add_team_member($1,$2)",[teamB,b1]); check("B adds own student",ok(r));
await asUser(staffA); await c.query("select create_team($1,'Alpha Two')",[T]);
const teamA2=(await one("select id from tournament_teams where name='Alpha Two'")).id;
await asUser(staffA); await c.query("select add_team_member($1,$2)",[teamA,a2]); await asUser(staffA);
r=await tryq("select add_team_member($1,$2)",[teamA2,a2]); check("student already in another team of tournament refused",!!r.e,r.e?.message);
r=await tryq("select apply_team($1,true)",[teamA2]); check("empty team cannot apply",!!r.e,r.e?.message);
await c.query("select remove_team_member($1,$2)",[teamA,a2]); check("remove member works", await cnt("select count(*)::int n from tournament_team_members where team_id=$1",[teamA])===1);
await c.query("select add_team_member($1,$2)",[teamA,a2]);
// visibility of teams
await asUser(staffA); check("school A sees only its teams", await cnt("select count(*)::int n from tournament_teams")===2 && await cnt("select count(*)::int n from tournament_teams where org_id=$1",[orgB])===0);
check("school A list_visible_teams scoped", await cnt("select count(*)::int n from list_visible_teams()")===2);
await asUser(staffB); check("school B sees only its team", await cnt("select count(*)::int n from tournament_teams")===1);
await asUser(a1); check("student a1 sees only own team", await cnt("select count(*)::int n from tournament_teams")===1 && await cnt("select count(*)::int n from tournament_teams where id=$1",[teamA])===1);
check("student a1 sees team members' names", await cnt("select count(*)::int n from get_team_roster($1)",[teamA])===2);
check("student a1 roster of other team empty", await cnt("select count(*)::int n from get_team_roster($1)",[teamB])===0);
check("student a1 sees only own team members rows", await cnt("select count(*)::int n from tournament_team_members")===2);
await asUser(b1); check("student b1 does not see team A", await cnt("select count(*)::int n from tournament_teams where id=$1",[teamA])===0);
await asUser(jamie); check("Hanbee staff sees all teams", await cnt("select count(*)::int n from tournament_teams")===3+baseTT);
await asUser(morgan); check("manager sees all teams", await cnt("select count(*)::int n from tournament_teams")===3+baseTT);
await asAnon(); r=await tryq("select count(*)::int n from tournament_teams"); check("anon sees no teams", r.e || r.r.rows[0].n===0);
await asUser(staffA); check("list_addable_students excludes team members", await cnt("select count(*)::int n from list_addable_students($1)",[T])===0);

// --- apply + trust
await asUser(a1); r=await tryq("select apply_team($1,true)",[teamA]); check("student cannot apply team",!!r.e);
await asUser(staffA); r=await tryq("update tournament_teams set status='verified' where id=$1",[teamA]); check("direct update to verified blocked",!!r.e);
r=await tryq("insert into tournament_teams (tournament_id,org_id,name,status,payment_declared) values ($1,$2,'sneaky','verified',true)",[T,orgA]); check("direct insert blocked",!!r.e);
r=await tryq("select decide_team($1,'verified')",[teamA]); check("school staff cannot decide",!!r.e);
r=await tryq("select apply_team($1,true)",[teamA]); check("school A applies with payment declared",ok(r));
await asOwner(); let row=await one("select status,payment_declared from tournament_teams where id=$1",[teamA]); check("status payment_declared",row.status==="payment_declared"&&row.payment_declared===true);
await asUser(staffA); r=await tryq("select apply_team($1,false)",[teamA]); check("cannot re-apply to flip payment_declared",!!r.e);
r=await tryq("select add_team_member($1,$2)",[teamA,a2]); check("cannot change members after applying",!!r.e);
r=await tryq("update tournament_teams set payment_declared=false where id=$1",[teamA]); check("direct flip payment_declared blocked",!!r.e);
await asOwner(); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:staffA,role:"authenticated"})]);
// trigger-level check as a non-privileged-grant owner role with a uid
await c.query("update tournament_teams set status='verified', payment_declared=false where id=$1",[teamA]);
row=await one("select status,payment_declared from tournament_teams where id=$1",[teamA]); check("trust trigger pins status even for a privileged writer with a uid",row.status==="payment_declared"&&row.payment_declared===true);
await asUser(staffB); r=await tryq("select apply_team($1,false)",[teamB]); check("B applies without payment",ok(r));
await asOwner(); check("status applied", (await one("select status s from tournament_teams where id=$1",[teamB])).s==="applied");
// decisions
await asUser(a1); r=await tryq("select decide_team($1,'verified')",[teamA]); check("student cannot decide",!!r.e);
await asAnon(); r=await tryq("select decide_team($1,'verified')",[teamA]); check("anon cannot decide",!!r.e);
await asUser(jamie); r=await tryq("select decide_team($1,'bogus')",[teamA]); check("bad decision refused",!!r.e);
r=await tryq("select decide_team($1,'verified')",[teamA]); check("Hanbee staff verifies team A",ok(r));
await asUser(morgan); r=await tryq("select decide_team($1,'rejected')",[teamB]); check("manager rejects team B",ok(r));
await asUser(jamie); r=await tryq("select decide_team($1,'verified')",[teamB]); check("cannot decide twice",!!r.e);
r=await tryq("select decide_team($1,'verified')",[teamA2]); check("cannot decide a draft",!!r.e);
await asUser(staffA); check("school A sees verified status", (await one("select status s from tournament_teams where id=$1",[teamA])).s==="verified");
r=await tryq("select withdraw_team($1)",[teamB]); check("school A cannot withdraw B's team",!!r.e);
await asUser(staffA); r=await tryq("select withdraw_team($1)",[teamA2]); check("school withdraws its draft team",ok(r));
await asUser(staffB); r=await tryq("select withdraw_team($1)",[teamB]); check("rejected team cannot be withdrawn",!!r.e);

// --- results + leaderboard
await asUser(a1); r=await tryq("select set_result($1,$2,1,10,'x')",[T,teamA]); check("student cannot set result",!!r.e);
await asUser(staffA); r=await tryq("select set_result($1,$2,1,10,'x')",[T,teamA]); check("school staff cannot set result",!!r.e);
r=await tryq("insert into tournament_results (tournament_id,team_id,rank) values ($1,$2,1)",[T,teamA]); check("direct result insert blocked",!!r.e);
await asAnon(); r=await tryq("select set_result($1,$2,1,10,'x')",[T,teamA]); check("anon cannot set result",!!r.e);
await asUser(jamie); r=await tryq("select set_result($1,$2,1,10,'won')",[T,teamA]); check("Hanbee staff sets result",ok(r));
r=await tryq("select set_result($1,$2,2,5,'x')",[T,teamB]); check("result for non-verified team refused",!!r.e);
r=await tryq("select set_result($1,$2,0,5,'x')",[T,teamA]); check("rank 0 refused",!!r.e);
const lb = async (u)=>{ await (u==="anon"?asAnon():asUser(u)); const q=await tryq("select * from get_leaderboard($1)",[T]); return q.e?[]:q.r.rows; };
let rows=await lb(a1); check("student sees leaderboard with team + school name only", rows.length===1&&rows[0].team_name==="Alpha Racers"&&rows[0].school_name==="Alpha School"&&Object.keys(rows[0]).join()==="team_id,team_name,school_name,rank,points,notes", JSON.stringify(rows));
check("b1 sees leaderboard",(await lb(b1)).length===1); check("solo sees leaderboard",(await lb(solo)).length===1);
check("school staff sees leaderboard",(await lb(staffB)).length===1); check("manager sees leaderboard",(await lb(morgan)).length===1); check("Hanbee staff sees leaderboard",(await lb(jamie)).length===1);
check("anon sees no leaderboard",(await lb("anon")).length===0); check("suspended student sees no leaderboard",(await lb(a3)).length===0);
await asUser(a1); check("student cannot read raw results", await cnt("select count(*)::int n from tournament_results")===0);
await asUser(jamie); check("Hanbee staff reads raw results", await cnt("select count(*)::int n from tournament_results")===1+baseTR);
// closed school: student sees nothing until solo
await asOwner(); await c.query("update organizations set status='closed' where id=$1",[orgC]);
await asUser(c1); check("closed-school student sees no tournaments", await cnt("select count(*)::int n from tournaments")===0);
check("closed-school student sees no leaderboard",(await lb(c1)).length===0);
r=await tryq("select apply_for_course($1,true)",[course]); check("closed-school student cannot apply for course",!!r.e);
await asUser(oC); check("closed-school staff sees nothing", await cnt("select count(*)::int n from tournaments")===0);
await asOwner(); await c.query("update profiles set is_solo=true where id=$1",[c1]); await c.query("update organization_members set status='ended', ended_at=now() where user_id=$1",[c1]);
await asUser(c1); check("after converting to solo the student sees tournaments", await cnt("select count(*)::int n from tournaments")===2+baseT);

// --- solo team
await asUser(solo); r=await tryq("select create_solo_team($1) t",[T]); check("solo creates team of one",ok(r)); const soloTeam=r.r.rows[0].t;
r=await tryq("select create_solo_team($1)",[T]); check("solo cannot make a second team",!!r.e);
check("solo sees own team + roster of one", await cnt("select count(*)::int n from tournament_teams")===1 && await cnt("select count(*)::int n from get_team_roster($1)",[soloTeam])===1);
r=await tryq("select add_team_member($1,$2)",[soloTeam,solo2]); check("solo cannot add members",!!r.e);
await asUser(a1); r=await tryq("select create_solo_team($1)",[T2]); check("school student cannot create solo team",!!r.e);
await asUser(staffA); r=await tryq("select create_solo_team($1)",[T2]); check("school staff cannot create solo team",!!r.e);
await asUser(solo2); r=await tryq("select apply_team($1,true)",[soloTeam]); check("other solo cannot apply someone else's team",!!r.e);
await asUser(solo); r=await tryq("select apply_team($1,true)",[soloTeam]); check("solo applies own team",ok(r));
await asUser(jamie); await c.query("select decide_team($1,'verified')",[soloTeam]); check("Hanbee verifies solo team",(await one("select status s from tournament_teams where id=$1",[soloTeam])).s==="verified");
await asUser(solo2); check("solo2 does not see solo's team", await cnt("select count(*)::int n from tournament_teams")===0);

// --- courses
await asUser(a1); r=await tryq("select apply_for_course($1,true) a",[course]); check("school student applies for course",ok(r)); const app1=r.r.rows[0].a;
r=await tryq("select apply_for_course($1,true)",[course]); check("duplicate application refused",!!r.e);
r=await tryq("select apply_for_course($1,true)",[draftCourse]); check("unpublished course refused",!!r.e);
r=await tryq("update applications set status='verified' where id=$1",[app1]); check("direct application update blocked",!!r.e);
r=await tryq("insert into applications (course_id,applicant_id,status) values ($1,$2,'verified')",[draftCourse,a1]); check("direct application insert blocked",!!r.e);
await asUser(solo2); r=await tryq("select apply_for_course($1,true) a",[course]); check("solo applies for course",ok(r)); const app2=r.r.rows[0].a;
await asUser(a3); r=await tryq("select apply_for_course($1,true)",[course]); check("suspended student cannot apply",!!r.e);
await asUser(staffA); check("school A sees own student's application (read-only)", await cnt("select count(*)::int n from applications")===1 && await cnt("select count(*)::int n from list_course_applications()")===1);
r=await tryq("update applications set status='verified'",[]); check("school staff cannot update applications",!!r.e);
r=await tryq("select decide_course_application($1,'verified',$2)",[app1,section]); check("school staff cannot decide application",!!r.e);
await asUser(staffB); check("school B sees no A applications", await cnt("select count(*)::int n from applications")===0);
await asUser(a1); check("student sees own application only", await cnt("select count(*)::int n from applications")===1);
await asUser(b1); check("other student sees none", await cnt("select count(*)::int n from applications")===0);
await asUser(jamie); check("Hanbee staff sees all applications", await cnt("select count(*)::int n from applications")===2+baseApp);
r=await tryq("select decide_course_application($1,'verified',null)",[app1]); check("verify needs a section",!!r.e);
r=await tryq("select decide_course_application($1,'verified',$2)",[app1,section]); check("Hanbee staff verifies course application",ok(r));
await asOwner(); check("enrollment created", await cnt("select count(*)::int n from enrollments where student_id=$1 and section_id=$2 and status='active'",[a1,section])===1);
await asUser(a1); check("student sees enrollment", await cnt("select count(*)::int n from enrollments where section_id=$1",[section])===1);
check("org_id_at_join stored on application", (await one("select org_id_at_join o from applications where id=$1",[app1])).o===orgA);
await asUser(morgan); r=await tryq("select decide_course_application($1,'rejected')",[app2]); check("manager rejects application",ok(r));
await asOwner(); check("rejected creates no enrollment", await cnt("select count(*)::int n from enrollments where student_id=$1",[solo2])===0);
check("solo application org_id_at_join is null",(await one("select org_id_at_join o from applications where id=$1",[app2])).o===null);
// enroll_student
await asUser(jamie); r=await tryq("select enroll_student($1,$2)",[a3,section]); check("enroll_student refuses suspended student",!!r.e,r.e?.message);
r=await tryq("select enroll_student($1,$2)",[b1,section]); check("enroll_student enrolls active student",ok(r));
r=await tryq("select enroll_student($1,$2)",[jamie,section]); check("enroll_student refuses non-student",!!r.e);
await asUser(staffA); r=await tryq("select enroll_student($1,$2)",[a2,section]); check("school staff cannot enroll_student",!!r.e);
await asUser(a1); r=await tryq("select enroll_student($1,$2)",[a2,section]); check("student cannot enroll_student",!!r.e);
await asAnon(); r=await tryq("select enroll_student($1,$2)",[a2,section]); check("anon cannot enroll_student",!!r.e);

// --- snapshot survives school close
await asOwner(); await c.query("update organizations set status='closed' where id=$1",[orgA]);
row=await one("select org_id_at_join o from tournament_team_members where student_id=$1",[a1]); check("member org_id_at_join survives school close",row.o===orgA);
check("application org_id_at_join survives school close",(await one("select org_id_at_join o from applications where id=$1",[app1])).o===orgA);
await asUser(jamie); check("leaderboard still names the closed school",(await lb(jamie))[0].school_name==="Alpha School");
await asUser(a1); check("student of closed school sees nothing now", await cnt("select count(*)::int n from tournaments")===0 && await cnt("select count(*)::int n from tournament_teams")===0);

// --- audit + RLS
await asOwner();
const actions=["create_tournament","update_tournament","decide_team","set_result","decide_course_application","enroll_student","withdraw_team"];
for (const a of actions) { const n=await auditN(a); check(`audit row written: ${a}`, a==="withdraw_team"?n===0:n>=1, `n=${n}`); }
check("audit counts", (await auditN("create_tournament"))===2+baseAct.create_tournament && (await auditN("decide_team"))===3+baseAct.decide_team && (await auditN("decide_course_application"))===2+baseAct.decide_course_application && (await auditN("enroll_student"))===1+baseAct.enroll_student);
const rls=(await c.query("select relname, relrowsecurity from pg_class where relname in ('tournaments','tournament_teams','tournament_team_members','tournament_results','applications') and relnamespace='public'::regnamespace")).rows;
check("RLS enabled on all 5 new tables", rls.length===5 && rls.every(x=>x.relrowsecurity), JSON.stringify(rls));
await asAnon(); r=await tryq("select * from get_leaderboard($1)",[T]); check("anon cannot execute get_leaderboard",!!r.e);
await c.query("rollback");
await asOwner();
const left=await one("select (select count(*) from tournaments)::int t,(select count(*) from tournament_teams)::int tt,(select count(*) from applications)::int a,(select count(*) from organizations)::int o,(select count(*) from profiles where email like '%@x.test')::int p,(select count(*) from audit_log)::int al");
check("everything rolled back", left.t===baseT&&left.tt===baseTT&&left.a===baseApp&&left.o===baseO&&left.p===0&&left.al===baseAudit, JSON.stringify(left)+" base="+baseAudit);
console.log(`${pass} passed, ${fail} failed`);
await c.end();
