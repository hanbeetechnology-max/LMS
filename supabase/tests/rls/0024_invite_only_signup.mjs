import { connect } from "./_db.mjs";
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
const ava=await id("ava@student.edu"), jamie=await id("jamie@hanbeelms.edu"), morgan=await id("morgan@hanbeelms.edu");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asAnon = async () => { await c.query("reset role"); await c.query("set local role anon"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:"anon"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];
const baseOrg = (await c.query("select count(*)::int n from organizations")).rows[0].n;
const signup = async (email, meta) => { await asOwner(); const uid = (await one("select gen_random_uuid() u")).u;
  const r = await tryq("select test_support_signup($1,$2,$3::jsonb)",[uid,email,JSON.stringify(meta)]);
  return { ...r, uid }; };
const schoolMeta = (name) => ({role:"school_staff", full_name:"Owner "+name, school_name:name, registration_no:"REG-"+name, official_email:"office@"+name.toLowerCase().replace(/\W/g,"")+".test", guardian_consent:"true"});

await c.query("begin");
// 1 strangers
let r = await signup("stranger1@x.test", {}); check("stranger with no invite is refused", !!r.e, r.e?.message);
r = await signup("stranger2@x.test", {role:"student"}); check("stranger claiming role student is refused", !!r.e, r.e?.message);
r = await signup("stranger3@x.test", {role:"manager"}); check("second manager via public signup is refused", !!r.e, r.e?.message);
r = await signup("stranger4@x.test", {role:"school_staff", school_name:"X"}); check("school registration without required data is refused", !!r.e);
// 2 school registration
r = await signup("owner-a@x.test", schoolMeta("Alpha School")); check("school registration works", !r.e, r.e?.message);
const ownerA = r.uid;
let row = await one("select p.role, p.approved, o.status, m.member_role from profiles p join organization_members m on m.user_id=p.id join organizations o on o.id=m.org_id where p.id=$1",[ownerA]);
check("registration makes a pending school and an unapproved owner", row && row.role==="school_staff" && row.approved===false && row.status==="pending" && row.member_role==="owner", JSON.stringify(row));
r = await signup("owner-b@x.test", schoolMeta("Beta School")); const ownerB = r.uid;
const orgA = (await one("select org_id from organization_members where user_id=$1",[ownerA])).org_id;
const orgB = (await one("select org_id from organization_members where user_id=$1",[ownerB])).org_id;
r = await signup("hstaff@x.test", {role:"staff", full_name:"New Hanbee Staff"}); check("Hanbee staff application works and is unapproved", !r.e && (await one("select approved from profiles where id=$1",[r.uid])).approved===false);
// 3 pending school cannot invite
await asUser(ownerA);
r = await tryq("select * from invite_students($1, array['s1@x.test'])",[orgA]); check("pending school cannot invite", !!r.e, r.e?.message);
// 4 verification: first wins
await asUser(jamie); r = await one("select verify_school($1) v",[orgA]); check("Hanbee staff verifies a pending school", r.v.result==="verified", JSON.stringify(r.v));
await asUser(morgan); r = await one("select verify_school($1) v",[orgA]); check("second verifier is told who won", r.v.result==="already_decided" && !!r.v.by, JSON.stringify(r.v));
await asOwner(); check("owner became approved after verification", (await one("select approved from profiles where id=$1",[ownerA])).approved===true);
await asUser(morgan); await c.query("select verify_school($1)",[orgB]);
await asUser(ownerA); r = await tryq("select verify_school($1)",[orgA]); check("school staff cannot verify a school", !!r.e);
await asUser(ava); r = await tryq("select verify_school($1)",[orgA]); check("student cannot verify a school", !!r.e);
// 5 bulk invite
await asUser(ownerA);
const res = (await c.query("select * from invite_students($1, array['s1@x.test','not-an-email','S1@x.test','s2@x.test','jamie@hanbeelms.edu'])",[orgA])).rows;
const byEmail = Object.fromEntries([...res].reverse().map(x=>[x.email,x.result]));
check("bulk invite: valid, invalid, duplicate, staff-email results", byEmail["s1@x.test"]==="invited" && byEmail["not-an-email"]==="invalid_email" && res.filter(x=>x.result==="duplicate_in_list").length===1 && byEmail["jamie@hanbeelms.edu"]==="unavailable" && byEmail["s2@x.test"]==="invited", JSON.stringify(byEmail));
r = await tryq("select * from invite_students($1, array['z@x.test'])",[orgB]); check("school A cannot invite into school B", !!r.e, r.e?.message);
r = await tryq("select * from invite_students($1, $2::text[])",[orgA, Array.from({length:201},(_,i)=>`b${i}@x.test`)]); check("batch over 200 is refused", !!r.e);
await asAnon(); r = await tryq("select * from invite_students($1, array['a@x.test'])",[orgA]); check("anonymous cannot call invite_students", !!r.e);
// 6 student join
await asOwner(); const tokA = (await one("select join_token t from organizations where id=$1",[orgA])).t; const tokB = (await one("select join_token t from organizations where id=$1",[orgB])).t;
await asAnon(); r = await one("select preflight_join($1,'s1@x.test') p",[tokA]); check("preflight: invited email ok", r.p==="ok");
r = await one("select preflight_join($1,'nobody@x.test') p",[tokA]); check("preflight: uninvited email refused", r.p==="not_invited");
r = await one("select preflight_join('bad','s1@x.test') p"); check("preflight: bad link refused", r.p==="invalid_link");
r = await one("select count(*)::int n from get_join_info($1)",[tokA]); check("join page shows the school name for a valid link", r.n===1);
r = await signup("s1@x.test", {join_token: tokA, full_name:"Student One"}); check("invited student can join with the link", !r.e, r.e?.message);
const s1 = r.uid;
row = await one("select p.role, m.member_role, m.org_id, i.accepted from profiles p join organization_members m on m.user_id=p.id join invitations i on lower(i.email)='s1@x.test' and i.org_id=m.org_id where p.id=$1",[s1]);
check("student is a student member of the right school, invite accepted", row && row.role==="student" && row.member_role==="student" && row.org_id===orgA && row.accepted===true, JSON.stringify(row));
r = await signup("uninvited@x.test", {join_token: tokA}); check("uninvited email cannot use the school link", !!r.e, r.e?.message);
r = await signup("s2@x.test", {join_token: tokB}); check("invite for school A cannot be used through school B's link", !!r.e, r.e?.message);
r = await signup("s2@x.test", {join_token: "wrong"}); check("wrong link token refused", !!r.e);
// 7 revoke + expiry
await asUser(ownerA); await c.query("select revoke_invitation((select id from invitations where lower(email)='s2@x.test' and org_id=$1))",[orgA]);
r = await signup("s2@x.test", {join_token: tokA}); check("revoked invite cannot be used", !!r.e);
await asUser(ownerA); await c.query("select * from invite_students($1, array['s3@x.test'])",[orgA]);
await asOwner(); await c.query("update invitations set expires_at = now() - interval '1 day' where lower(email)='s3@x.test'");
r = await signup("s3@x.test", {join_token: tokA}); check("expired invite cannot be used", !!r.e);
// 8 co-staff
await asUser(ownerA); r = await one("select invite_school_staff($1,'teacher@x.test') v",[orgA]); check("owner invites a co-staff member", r.v==="invited");
await asOwner(); const tTok = (await one("select token t from invitations where lower(email)='teacher@x.test'")).t;
r = await signup("teacher@x.test", {invite_token:"wrong"}); check("co-staff signup with wrong invite token refused", !!r.e);
r = await signup("teacher@x.test", {invite_token:tTok}); check("co-staff joins with their invite token", !r.e, r.e?.message);
const teacherId = r.uid;
row = await one("select p.role, p.approved, m.member_role from profiles p join organization_members m on m.user_id=p.id where p.id=$1",[teacherId]); check("co-staff is approved school staff member", row.role==="school_staff" && row.approved===true && row.member_role==="staff", JSON.stringify(row));
await asUser(teacherId); const tr = await tryq("select invite_school_staff($1,'more@x.test')",[orgA]); check("non-owner school staff cannot invite more staff", !!tr.e);
// 9 direct inserts / role escalation via invites
await asUser(ownerA); r = await tryq("insert into invitations (email, role, org_id) values ('x1@x.test','student',$1)",[orgA]); check("school staff cannot insert invitations directly", !!r.e);
await asUser(jamie); r = await tryq("insert into invitations (email, role) values ('solo@x.test','student') returning token"); check("Hanbee staff can create a solo-student invite", !r.e, r.e?.message);
r = await tryq("insert into invitations (email, role) values ('mgr@x.test','manager')"); check("Hanbee staff cannot invite a manager", !!r.e);
r = await tryq("insert into invitations (email, role) values ('st@x.test','staff')"); check("Hanbee staff cannot invite Hanbee staff", !!r.e);
await asUser(morgan); r = await tryq("insert into invitations (email, role) values ('st2@x.test','staff') returning token"); check("manager can invite Hanbee staff", !r.e, r.e?.message);
await asOwner(); const soloTok = (await one("select token t from invitations where lower(email)='solo@x.test'")).t;
r = await signup("solo@x.test", {invite_token: soloTok}); check("solo student joins with a personal token and has no school", !r.e && !(await one("select 1 x from organization_members where user_id=$1",[r.uid])), r.e?.message);
r = await signup("someoneelse@x.test", {invite_token: soloTok}); check("a personal token only works for its own email", !!r.e);
// 10 audit
await asUser(morgan); r = await one("select count(*)::int n from audit_log"); check("manager reads the audit log with entries", r.n>=3, `n=${r.n}`);
await asUser(ava); r = await one("select count(*)::int n from audit_log"); check("student sees no audit log", r.n===0);
r = await tryq("insert into audit_log (action,target_type) values ('x','y')"); check("clients cannot write the audit log", !!r.e);
r = await tryq("select log_audit('x','y',null)"); check("clients cannot call log_audit directly", !!r.e);
await c.query("rollback");
await asOwner();
check("everything rolled back", (await one("select count(*)::int n from organizations")).n===baseOrg && (await one("select count(*)::int n from profiles where email like '%@x.test'")).n===0);
console.log(`${pass} passed, ${fail} failed`);
await c.end();
