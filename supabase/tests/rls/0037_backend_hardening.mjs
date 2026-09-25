import { connect } from "./_db.mjs";
// Migration 0037: join-link rotation, append-only audit log, masked certificate
// name, chat history and profile limits, and flood caps.
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
const pendingBefore = (await one("select count(*)::int n from organizations where status='pending'")).n;

await c.query("begin");
const ownerA = await signup("ownerA37@x.test", schoolMeta("Alpha37")), ownerB = await signup("ownerB37@x.test", schoolMeta("Beta37"));
const orgOf = async u => (await one("select org_id from organization_members where user_id=$1",[u])).org_id;
const orgA = await orgOf(ownerA), orgB = await orgOf(ownerB);
await asUser(jamie); await c.query("select verify_school($1)",[orgA]); await c.query("select verify_school($1)",[orgB]);
await asUser(ownerA); await c.query("select * from invite_students($1, array['sa37@x.test','sa37b@x.test'])",[orgA]);
await asOwner(); const tokA = (await one("select join_token t from organizations where id=$1",[orgA])).t;
const sA1 = await signup("sa37@x.test",{join_token:tokA, full_name:"Aarav Kumar Sharma"}), sA2 = await signup("sa37b@x.test",{join_token:tokA, full_name:"Diya Menon"});

// ---- 11 join link rotation
await asAnon(); let r = await one("select preflight_join($1,'sa37@x.test') p",[tokA]); check("the old link works before rotation (email already joined counts as not invited)", ["ok","not_invited"].includes(r.p), r.p);
await asUser(sA1); r = await tryq("select rotate_school_join_link($1)",[orgA]); check("a student cannot rotate the link", !!r.e);
await asUser(ownerB); r = await tryq("select rotate_school_join_link($1)",[orgA]); check("another school's owner cannot rotate it", !!r.e);
await asUser(ownerA); await c.query("select * from invite_students($1, array['late37@x.test'])",[orgA]);
r = await one("select rotate_school_join_link($1) t",[orgA]); const tokNew = r.t;
check("the owner gets a new token", typeof tokNew==="string" && tokNew.length===32 && tokNew!==tokA);
await asAnon();
r = await one("select preflight_join($1,'late37@x.test') p",[tokA]); check("the old link stops working", r.p==="invalid_link", r.p);
r = await one("select preflight_join($1,'late37@x.test') p",[tokNew]); check("the new link works", r.p==="ok", r.p);
await asOwner(); r = await tryq("select test_support_signup(gen_random_uuid(),'late37@x.test',$1::jsonb)",[JSON.stringify({join_token:tokA})]);
check("signing up with the old link is refused", !!r.e);
await asUser(jamie); r = await tryq("select rotate_school_join_link($1)",[orgB]); check("Hanbee staff can rotate any school's link", !r.e);
r = await one("select count(*)::int n from audit_log where action='rotate_join_link' and target_id=$1",[orgA]); check("rotation is written to the audit log", r.n===1);
check("students already in the school keep their membership", (await one("select count(*)::int n from organization_members where user_id=$1 and status='active'",[sA1])).n===1);

// ---- 12 append-only audit log
await asUser(morgan);
r = await tryq("update audit_log set action='x'"); check("a client cannot edit audit rows", r.e || r.r.rowCount===0);
r = await tryq("delete from audit_log"); check("a client cannot delete audit rows", r.e || r.r.rowCount===0);
await asOwner();
r = await tryq("update audit_log set action=action where true"); check("even the database owner cannot edit without saying so", !!r.e);
r = await tryq("delete from audit_log where id is not null"); check("even the database owner cannot delete without saying so", !!r.e);
r = await tryq("truncate audit_log"); check("truncate is blocked", !!r.e);
await c.query("select set_config('app.audit_maintenance','true',true)");
const n0 = (await one("select count(*)::int n from audit_log where action='zz_test'")).n;
await c.query("insert into audit_log (action, target_type) values ('zz_test','t')");
r = await tryq("delete from audit_log where action='zz_test'"); check("the owner can clear rows only with the explicit maintenance flag", !r.e && r.r.rowCount===1);
await c.query("select set_config('app.audit_maintenance','',true)");
await asUser(jamie); await c.query("select set_account_status($1,'suspended','t37')",[sA2]);
await asOwner();
r = await one("select meta from audit_log where action='profile_changed' and target_id=$1 order by created_at desc limit 1",[sA2]); check("a status change on a profile is audit-logged with old and new values", r && r.meta.status?.[1]==="suspended", JSON.stringify(r?.meta));
check("a membership addition is audit-logged", (await one("select count(*)::int n from audit_log where action='membership_added' and target_id=$1",[orgA])).n>=2);
await c.query("update organizations set status='suspended' where id=$1",[orgB]);
check("a school status change is audit-logged (verification and suspension)", (await one("select count(*)::int n from audit_log where action='school_status_changed' and target_id=$1",[orgB])).n>=2);
await c.query("update organizations set status='active' where id=$1",[orgB]);

// ---- 13 certificate name
await c.query("insert into certificates (user_id, course_title, serial) values ($1,'T37 Course','T37-1')",[sA1]);
const certId = (await one("select id from certificates where serial='T37-1'")).id;
await asAnon(); r = await one("select user_name, serial from verify_certificate($1)",[certId]);
check("the public check shows first name and last initial only", r.user_name==="Aarav S." && r.serial==="T37-1", JSON.stringify(r));
await asOwner(); await c.query("update profiles set full_name='Diya' where id=$1",[sA1]);
await asAnon(); r = await one("select user_name from verify_certificate($1)",[certId]); check("a single name is shown as is", r.user_name==="Diya", r.user_name);
r = await tryq("select * from verify_certificate('00000000-0000-0000-0000-000000000000')"); check("an unknown certificate returns nothing", !r.e && r.r.rowCount===0);

// ---- 14 chat: history and profile visibility
await asOwner(); await c.query("update profiles set full_name='Aarav Kumar Sharma' where id=$1",[sA1]); await c.query("update profiles set account_status='active' where id=$1",[sA2]);
const grp = (await one("select id from conversations where kind='group' and org_id=$1",[orgA])).id;
await c.query("insert into messages (conversation_id, sender_id, body, created_at) values ($1,$2,'T37 old message', now() - interval '1 hour'), ($1,$2,'T37 new message', now() + interval '1 minute')",[grp, ownerA]);
await c.query("update conversation_participants set joined_at = now() - interval '2 hours' where conversation_id=$1 and user_id in ($2,$3)",[grp,sA1,ownerA]);
await c.query("update conversation_participants set joined_at = now() where conversation_id=$1 and user_id=$2",[grp,sA2]);
await asUser(sA1); r = await one("select count(*)::int n from messages where conversation_id=$1 and body like 'T37 %'",[grp]); check("a long-standing member reads the whole history", r.n===2, `n=${r.n}`);
await asUser(sA2); r = await one("select array_agg(body order by created_at) b from messages where conversation_id=$1 and body like 'T37 %'",[grp]); check("a member who joined later reads only what came after", r.b?.length===1 && r.b[0]==="T37 new message", JSON.stringify(r.b));
await asUser(ownerA); r = await one("select count(*)::int n from messages where conversation_id=$1 and body like 'T37 %'",[grp]); check("the school owner reads everything", r.n===2);
await asUser(sA1); r = await one("select count(*)::int n from profiles where id=$1",[sA2]); check("classmates in a group can no longer read each other's profile rows", r.n===0, `n=${r.n}`);
r = await one("select count(*)::int n from chat_members($1)",[grp]); check("group member names still come through the chat function", r.n>=3, `n=${r.n}`);
r = await one("select count(*)::int n from profiles where id=$1",[ownerA]); check("a student still sees their school's staff", r.n===1);
r = await one("select chat_topic_allowed('chat-presence:'||$1::text) a, chat_topic_allowed('chat-presence:not-a-uuid') b, chat_topic_allowed('other:'||$1::text) d",[grp]);
check("the presence room is open to members only for its own topic", r.a===true && r.b===false && r.d===false, JSON.stringify(r));
await asUser(ownerB); r = await one("select chat_topic_allowed('chat-presence:'||$1::text) a",[grp]); check("a non-member cannot use another conversation's presence room", r.a===false);
await asAnon(); r = await one("select chat_topic_allowed('chat-presence:'||$1::text) a",[grp]).catch(()=>({a:false})); check("anonymous cannot use a presence room", r.a===false);

// ---- 15 floods
await asOwner(); await c.query("update organizations set status='active' where id=$1",[orgA]);
await asUser(ownerA);
const emails = n => Array.from({length:200},(_,i)=>`f${n}-${i}@x.test`);
await c.query("select * from invite_students($1,$2::text[])",[orgA,emails(1)]);
await c.query("select * from invite_students($1,$2::text[])",[orgA,emails(2).slice(0,190)]);
r = await tryq("select * from invite_students($1,$2::text[])",[orgA,emails(3)]); check("more than 400 invitations in an hour are refused", !!r.e, r.e?.message);
await asOwner();
let made = 0, refused = false;
for (let i=0;i<30 && !refused;i++) { const q = await tryq("insert into organizations (name,status,registration_no,official_email,created_by) values ($1,'pending','R','r@x.test',$2)",["Cap37 "+i, ownerA]); if (q.e) refused = true; else made++; }
check("too many schools waiting for verification are refused", refused, `made=${made}, pending before=${pendingBefore}`);
await c.query("rollback"); await asOwner();
check("all test rows rolled back", (await one("select count(*)::int n from organizations where status='pending'")).n===pendingBefore && (await one("select count(*)::int n from organizations where name like 'Alpha37%' or name like 'Cap37%'")).n===0);
console.log(`${pass} passed, ${fail} failed`);
await c.end();
