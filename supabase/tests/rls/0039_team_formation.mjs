import { connect } from "./_db.mjs";
// Team formation (migrations 0038/0039): slots, size 5, invitations, one team per tournament,
// same-school only, submit / send back / apply, team chat sync, statistics access.
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
  if (r.e) throw new Error("signup failed "+email+": "+r.e.message); return uid; };
const schoolMeta = (name) => ({role:"school_staff", full_name:"Owner "+name, school_name:name, registration_no:"REG-"+name, official_email:"office@x.test", guardian_consent:"true"});

await c.query("begin");
const ownerA = await signup("ownerA39@x.test", schoolMeta("Alpha39")), ownerB = await signup("ownerB39@x.test", schoolMeta("Beta39"));
const orgOf = async u => (await one("select org_id from organization_members where user_id=$1",[u])).org_id;
const orgA = await orgOf(ownerA), orgB = await orgOf(ownerB);
await asUser(jamie); await c.query("select verify_school($1)",[orgA]); await c.query("select verify_school($1)",[orgB]);
const emails = ["s1","s2","s3","s4","s5","s6"].map(s=>s+"a39@x.test");
await asUser(ownerA); await c.query("select * from invite_students($1,$2)",[orgA,emails]);
await asUser(ownerB); await c.query("select * from invite_students($1, array['sb39@x.test'])",[orgB]);
await asOwner();
const tokA=(await one("select join_token t from organizations where id=$1",[orgA])).t, tokB=(await one("select join_token t from organizations where id=$1",[orgB])).t;
const S=[]; for (const [i,e] of emails.entries()) S.push(await signup(e,{join_token:tokA, full_name:"Stu"+(i+1)+" A39"}));
const sB = await signup("sb39@x.test",{join_token:tokB, full_name:"Stu B39"});
await asOwner();
const tour = (await one("insert into tournaments (title,status,starts_at,ends_at,venue) values ('T39 Cup','upcoming',now()+interval '30 days',now()+interval '31 days','Arena') returning id")).id;
check("team size defaults to 5", (await one("select team_size from tournaments where id=$1",[tour])).team_size===5);

// slots
await asUser(S[0]); let r = await tryq("select student_start_team($1,'Early')",[tour]);
check("a student cannot start a team before the school opens slots", !!r.e, r.e?.message);
r = await tryq("select set_team_slots($1,$2,2)",[tour,orgA]); check("a student cannot set slots", !!r.e);
await asUser(ownerB); r = await tryq("select set_team_slots($1,$2,2)",[tour,orgA]); check("another school's staff cannot set my school's slots", !!r.e);
await asUser(ownerA); r = await tryq("select set_team_slots($1,$2,2)",[tour,orgA]); check("school staff set 2 team slots", !r.e, r.e?.message);
r = await tryq("select set_team_slots($1,$2,0)",[tour,orgA]); check("0 slots is refused", !!r.e);
await asUser(S[0]); let st = (await one("select team_slot_status($1) s",[tour])).s;
check("a student sees the slot status", st.max_teams===2 && st.used===0 && st.team_size===5, JSON.stringify(st));

// start, invite
r = await tryq("select student_start_team($1,'Rockets') t",[tour]); check("student starts a team", !r.e, r.e?.message);
const team = r.r?.rows[0]?.t;
await asOwner();
const tm = await one("select captain_id, status::text s, org_id from tournament_teams where id=$1",[team]);
check("the starter is captain, team is a draft of their school", tm.captain_id===S[0] && tm.s==="draft" && tm.org_id===orgA);
check("the starter is a member", (await one("select count(*)::int n from tournament_team_members where team_id=$1",[team])).n===1);
const chat = await one("select id, org_id from conversations where team_id=$1",[team]);
check("a team chat exists with no org_id (school group untouched)", !!chat && chat.org_id===null);
check("captain and school staff are in the team chat", (await one("select count(*)::int n from conversation_participants where conversation_id=$1 and user_id in ($2,$3)",[chat.id,S[0],ownerA])).n===2);
await asUser(S[0]); r = await tryq("select student_start_team($1,'Again')",[tour]); check("one team per student per tournament", !!r.e);
r = await tryq("select invite_to_team($1,$2)",[team,sB]); check("cannot invite a student of another school", !!r.e, r.e?.message);
await asUser(S[1]); r = await tryq("select invite_to_team($1,$2)",[team,S[2]]); check("a non-member cannot invite", !!r.e);
await asUser(S[0]);
const inv = {};
for (const k of [1,2,3]) { r = await tryq("select invite_to_team($1,$2) i",[team,S[k]]); check("captain invites classmate "+k, !r.e, r.e?.message); inv[k]=r.r?.rows[0]?.i; }
r = await tryq("select invite_to_team($1,$2)",[team,S[1]]); check("duplicate invitation refused", !!r.e);
r = await tryq("select invite_to_team($1,$2)",[team,S[4]]); check("invitations can fill the 4 open spots", !r.e, r.e?.message);
r = await tryq("select invite_to_team($1,$2)",[team,S[5]]); check("no more invitations than open spots", !!r.e);
let f = (await one("select my_team_formation($1) f",[tour])).f;
check("captain view lists members and pending invites", f.my_team.members.length===1 && f.my_team.pending_invites.length===4 && f.my_team.is_captain===true, JSON.stringify(f.my_team));
await asUser(S[1]);
f = (await one("select my_team_formation($1) f",[tour])).f; check("invited student sees the invitation", f.invitations.length===1 && f.invitations[0].team_name==="Rockets");
await asUser(sB); check("another school's student sees no invitation", (await one("select count(*)::int n from team_invitations")).n===0);
await asUser(S[1]); r = await tryq("select respond_team_invitation($1,true)",[inv[2]]); check("cannot answer someone else's invitation", !!r.e);
r = await tryq("select respond_team_invitation($1,false)",[inv[1]]); check("decline works", !r.e, r.e?.message);
await asUser(S[0]); r = await tryq("select invite_to_team($1,$2)",[team,S[1]]); check("a decliner can be invited again", !r.e, r.e?.message);
await asUser(S[1]); f = (await one("select my_team_formation($1) f",[tour])).f;
r = await tryq("select respond_team_invitation($1,true)",[f.invitations[0].id]); check("accept works", !r.e, r.e?.message);
await asUser(S[2]); await c.query("select respond_team_invitation($1,true)",[inv[2]]);
await asUser(S[3]); await c.query("select respond_team_invitation($1,true)",[inv[3]]);
await asUser(S[0]);
r = await tryq("select submit_team($1)",[team]); check("cannot submit with fewer than 5 players", !!r.e, r.e?.message);
await asUser(S[4]); f=(await one("select my_team_formation($1) f",[tour])).f; await c.query("select respond_team_invitation($1,true)",[f.invitations[0].id]);
await asOwner();
check("chat participants follow members (5 students + owner)", (await one("select count(*)::int n from conversation_participants where conversation_id=$1",[chat.id])).n===6);
check("joins are posted as system messages", (await one("select count(*)::int n from messages where conversation_id=$1 and kind='system'",[chat.id])).n>=4);
r = await tryq("insert into tournament_team_members (team_id,tournament_id,student_id,org_id_at_join) values ($1,$2,$3,$4)",[team,tour,S[5],orgA]); check("a sixth player is blocked even by the database", !!r.e);
await asUser(S[1]); r = await tryq("select submit_team($1)",[team]); check("only the captain can submit", !!r.e);
await asUser(S[0]); r = await tryq("select submit_team($1)",[team]); check("captain submits a full team", !r.e, r.e?.message);
r = await tryq("select invite_to_team($1,$2)",[team,S[5]]); check("a submitted team cannot change", !!r.e);
r = await tryq("select leave_team($1)",[team]); check("captain cannot leave a submitted team", !!r.e);
await asUser(ownerB); r = await tryq("select return_team($1,'x')",[team]); check("other school's staff cannot send it back", !!r.e);
r = await tryq("select apply_team($1,false)",[team]); check("other school's staff cannot apply it", !!r.e);
r = await tryq("select team_statistics($1)",[team]); check("other school's staff cannot read its statistics", !!r.e);
await asUser(ownerA);
let ov = (await c.query("select * from team_formation_overview($1,$2)",[tour,orgA])).rows;
check("school staff see the proposed team with captain and 5 players", ov[0].status==="proposed" && ov[0].member_count===5 && ov[0].captain_name==="Stu1 A39", JSON.stringify(ov[0]));
r = await tryq("select return_team($1,'Please swap Stu5')",[team]); check("school staff send the team back with a note", !r.e, r.e?.message);
await asUser(S[0]); f=(await one("select my_team_formation($1) f",[tour])).f; check("captain sees the note and a draft again", f.my_team.status==="draft" && f.my_team.staff_note==="Please swap Stu5");
await asUser(S[4]); r = await tryq("select leave_team($1)",[team]); check("a member leaves a draft team", !r.e, r.e?.message);
await asUser(S[0]); await c.query("select invite_to_team($1,$2)",[team,S[5]]);
await asUser(S[5]); f=(await one("select my_team_formation($1) f",[tour])).f; await c.query("select respond_team_invitation($1,true)",[f.invitations[0].id]);
await asUser(S[0]); await c.query("select submit_team($1)",[team]);
await asUser(S[0]); r = await tryq("select apply_team($1,true)",[team]); check("a captain cannot apply on the school's behalf", !!r.e);
await asUser(ownerA); r = await tryq("select apply_team($1,true)",[team]); check("school staff approve: the team applies with payment declared", !r.e, r.e?.message);
await asOwner(); check("status is payment_declared", (await one("select status::text s from tournament_teams where id=$1",[team])).s==="payment_declared");
await asUser(S[0]); await tryq("update tournament_teams set status='verified' where id=$1",[team]); await asOwner();
check("a student cannot mark their own team verified", (await one("select status::text s from tournament_teams where id=$1",[team])).s==="payment_declared");

// statistics
await asUser(S[1]); r = await tryq("select team_statistics($1) s",[team]); check("a member reads team statistics", !r.e, r.e?.message);
const stats = r.r?.rows[0]?.s;
check("statistics list 5 members and the tournament", stats?.members?.length===5 && stats?.tournament?.title==="T39 Cup" && stats?.team?.team_size===5, JSON.stringify(stats)?.slice(0,300));
await asUser(ownerA); r = await tryq("select team_statistics($1)",[team]); check("own school staff read statistics", !r.e, r.e?.message);
await asUser(morgan); r = await tryq("select team_statistics($1)",[team]); check("the manager reads statistics", !r.e, r.e?.message);
await asUser(jamie); r = await tryq("select team_statistics($1)",[team]); check("Hanbee staff read statistics", !r.e, r.e?.message);
await asUser(sB); r = await tryq("select team_statistics($1)",[team]); check("a student of another school cannot", !!r.e);
await asAnon(); r = await tryq("select team_statistics($1)",[team]); check("anonymous cannot", !!r.e);
r = await tryq("select my_team_formation($1)",[tour]); check("anonymous cannot use the formation view", !!r.e);

// second team and quota
await asUser(S[4]); r = await tryq("select student_start_team($1,'Comets') t",[tour]); check("a student who left can start another team", !r.e, r.e?.message);
await asUser(ownerA); r = await tryq("select set_team_slots($1,$2,1)",[tour,orgA]); check("cannot cut slots below the teams already made", !!r.e);
await asUser(S[5]); r = await tryq("select student_start_team($1,'Third')",[tour]); check("a student already in a team cannot start another", !!r.e);
await asUser(ownerA); await c.query("select set_team_slots($1,$2,2)",[tour,orgA]);
await asUser(S[4]);
await asUser(ownerA); r = await tryq("select create_team($1,'Staff built')",[tour]); check("the slot limit also stops school staff building a third team", !!r.e, r.e?.message);

await c.query("rollback"); await asOwner();
check("all test rows rolled back", (await one("select count(*)::int n from tournaments where title='T39 Cup'")).n===0 && (await one("select count(*)::int n from profiles where email like '%39@x.test'")).n===0);
console.log(`${pass} passed, ${fail} failed`);
await c.end();
