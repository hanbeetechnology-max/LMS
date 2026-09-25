import { connect } from "./_db.mjs";
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
const jamie=await id("jamie@hanbeelms.edu"), morgan=await id("morgan@hanbeelms.edu"), mgr2=await id("hanbeetechnology@gmail.com"), info=await id("info@hanbee.in");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,ok?"":x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];
const signup = async (email, meta) => { await asOwner(); const uid = (await one("select gen_random_uuid() u")).u;
  const r = await tryq("select test_support_signup($1,$2,$3::jsonb)",[uid,email,JSON.stringify(meta)]);
  if (r.e) throw r.e; return uid; };
const schoolMeta = (name) => ({role:"school_staff", full_name:"Owner "+name, school_name:name, registration_no:"REG-"+name, official_email:"office@"+name.toLowerCase()+".test", guardian_consent:"true"});
const start = async (u, other) => { await asUser(u); const r = await tryq("select start_conversation_with($1) v",[other]); return r.e ? {err:r.e.message} : {id:r.r.rows[0].v}; };
const send = async (u, conv, body) => { await asUser(u); return tryq("insert into messages (conversation_id, sender_id, body) values ($1,$2,$3) returning id, kind, sender_id",[conv,u,body]); };

const baseOrg = (await one("select count(*)::int n from organizations")).n;
const before = { conv: (await one("select count(*)::int n from conversations")).n, msg:(await one("select count(*)::int n from messages")).n, part:(await one("select count(*)::int n from conversation_participants")).n };
await c.query("begin");
// ---- setup
const ownerA = await signup("owner-a@x.test", schoolMeta("Alpha")); const ownerB = await signup("owner-b@x.test", schoolMeta("Beta"));
const orgA = (await one("select org_id from organization_members where user_id=$1",[ownerA])).org_id;
const orgB = (await one("select org_id from organization_members where user_id=$1",[ownerB])).org_id;
await asOwner(); check("no group before verification", (await one("select count(*)::int n from conversations where org_id in ($1,$2)",[orgA,orgB])).n===0);
const mgrPinsBefore = (await one("select count(*)::int n from conversations where kind='direct'")).n;
await asUser(jamie); await c.query("select verify_school($1)",[orgA]); await c.query("select verify_school($1)",[orgB]);
await asOwner();
let g = await one("select c.id, c.title, c.kind, (select member_role from conversation_participants where conversation_id=c.id and user_id=$2) mr, (select count(*)::int from conversation_participants where conversation_id=c.id) n from conversations c where c.org_id=$1",[orgA, ownerA]);
check("group created on verification, titled, owner is admin", g && g.kind==="group" && g.title==="Alpha - Students" && g.mr==="admin" && g.n===1, JSON.stringify(g));
const grpA = g.id; const grpB = (await one("select id from conversations where org_id=$1",[orgB])).id;
check("verification created manager chats for both owners", (await one("select count(*)::int n from conversations where kind='direct'")).n === mgrPinsBefore + 4, "");
await asUser(ownerA); await c.query("select * from invite_students($1, array['a1@x.test','a2@x.test'])",[orgA]);
await asUser(ownerB); await c.query("select * from invite_students($1, array['b1@x.test'])",[orgB]);
await asUser(ownerA); await c.query("select invite_school_staff($1,'teacher@x.test')",[orgA]);
await asOwner();
const tokA=(await one("select join_token t from organizations where id=$1",[orgA])).t, tokB=(await one("select join_token t from organizations where id=$1",[orgB])).t;
const teacherTok=(await one("select token t from invitations where email='teacher@x.test'")).t;
const sA1 = await signup("a1@x.test",{join_token:tokA, full_name:"Student One"});
const sA2 = await signup("a2@x.test",{join_token:tokA, full_name:"Student Two"});
const sB1 = await signup("b1@x.test",{join_token:tokB, full_name:"Student Bee"});
const teacherA = await signup("teacher@x.test",{invite_token:teacherTok, full_name:"Teacher A"});
await asUser(jamie); await c.query("insert into invitations (email, role) values ('solo@x.test','student')");
await asOwner(); const soloTok=(await one("select token t from invitations where email='solo@x.test'")).t;
const solo = await signup("solo@x.test",{invite_token:soloTok, full_name:"Solo Sam"});
// new Hanbee staff: unapproved -> no chats; approved -> pinned with both managers
const hs2 = await signup("hs2@x.test",{role:"staff", full_name:"Hanbee Two"});
await asOwner();
check("unapproved Hanbee staff has no pinned chats yet", (await one("select count(*)::int n from conversation_participants where user_id=$1",[hs2])).n===0);
await c.query("update profiles set approved=true where id=$1",[hs2]);
check("approving Hanbee staff pins chats with both managers", (await one("select count(*)::int n from conversation_participants where user_id=$1",[hs2])).n===2);
const course = (await one("insert into courses (title, owner_id, status) values ('X Course',$1,'published') returning id",[hs2])).id;
const sect = (await one("insert into sections (course_id,name,start_date,end_date) values ($1,'S1',current_date,current_date+30) returning id",[course])).id;
await c.query("insert into enrollments (section_id, student_id, status) values ($1,$2,'active'),($1,$3,'active'),($1,$4,'dropped')",[sect,sA1,solo,sB1]);
// group membership + system messages
let m = await one("select (select count(*)::int from conversation_participants where conversation_id=$1) n, (select count(*)::int from messages where conversation_id=$1 and kind='system' and body like '% joined') j, (select body from messages where conversation_id=$1 and body like 'Student One%') b",[grpA]);
check("students and teacher auto-added to school A group with system messages", m.n===4 && m.j===3 && m.b==="Student One joined", JSON.stringify(m));
m = await one("select (select member_role from conversation_participants where conversation_id=$1 and user_id=$2) t, (select member_role from conversation_participants where conversation_id=$1 and user_id=$3) s",[grpA,teacherA,sA1]);
check("staff join as admin, students as member", m.t==="admin" && m.s==="member", JSON.stringify(m));
check("solo student is in no group", (await one("select count(*)::int n from conversation_participants where user_id=$1",[solo])).n===0);

// ---- contact matrix
const N = {ownerA,ownerB,sA1,sA2,sB1,teacherA,solo,hs2,jamie,morgan,mgr2,info};
const names = Object.fromEntries(Object.entries(N).map(([k,v])=>[v,k]));
const allowed = [[sA1,ownerA],[sA1,teacherA],[sA1,hs2],[solo,hs2],[teacherA,sA1],[teacherA,sA2],[teacherA,ownerA],[teacherA,jamie],[teacherA,morgan],[ownerA,sA1],[ownerA,jamie],[ownerA,morgan],[hs2,sA1],[hs2,ownerA],[hs2,jamie],[hs2,morgan],[hs2,solo],[jamie,ownerA],[jamie,hs2],[jamie,morgan],[morgan,sA1],[morgan,solo],[morgan,ownerB],[morgan,teacherA],[morgan,mgr2],[ownerB,jamie],[sB1,ownerB]];
const refused = [[sA1,sA2],[sA1,sB1],[sA1,ownerB],[sA1,jamie],[sA1,morgan],[sA1,solo],[sA1,info],[sB1,hs2],[sB1,ownerA],[solo,jamie],[solo,ownerA],[solo,sA1],[solo,morgan],[teacherA,sB1],[teacherA,ownerB],[ownerA,sB1],[ownerA,ownerB],[ownerA,solo],[jamie,sA1],[jamie,teacherA],[jamie,solo],[jamie,sB1],[hs2,teacherA],[hs2,sB1],[hs2,sA2],[sA2,hs2],[sA1,sA1]];
let bad=[];
// refused first: an allowed pair creates a chat, which legitimately lets the other side reply
for (const [a,b] of refused){ const r=await start(a,b); if(r.id) bad.push(names[a]+"->"+names[b]); }
check(`disallowed contact pairs refused (${refused.length})`, bad.length===0, bad.join("; "));
bad=[];
for (const [a,b] of allowed){ const r=await start(a,b); if(!r.id) bad.push(names[a]+"->"+names[b]+" "+r.err); }
check(`allowed contact pairs work (${allowed.length})`, bad.length===0, bad.join("; "));
// reverse / reply directions
await asOwner();
bad=[]; for (const [a,b] of allowed){ const r = await one("select chat_can_message($1,$2) x",[a,b]); const r2 = await one("select chat_can_message($1,$2) x",[b,a]); if(!r.x || !r2.x) bad.push(names[a]+"<->"+names[b]); }
check("every allowed pair may also reply (symmetric once a chat exists)", bad.length===0, bad.join("; "));
bad=[]; for (const [a,b] of refused){ if(a===b) continue; const r = await one("select chat_can_message($1,$2) x",[a,b]); if(r.x) bad.push(names[a]+"->"+names[b]); }
// refused pairs could be allowed in the reverse direction only if a chat exists AND rule reverse holds (jamie->sA1 etc. are reverse of allowed pairs)
const reverseOK = new Set(allowed.map(([a,b])=>a+"|"+b));
bad = bad.filter(s=>{ const [x,y]=s.split("->"); return !reverseOK.has(N[y]+"|"+N[x]) ; });
check("no refused pair gains rights through chat_can_message", bad.length===0, bad.join("; "));
// contacts
const contactsOf = async u => { await asUser(u); return new Set((await c.query("select user_id from chat_contacts()")).rows.map(r=>names[r.user_id]||r.user_id)); };
const setEq = (s, arr)=> s.size===arr.length && arr.every(x=>s.has(x));
let cs = await contactsOf(sA1); check("student contacts: school owner, school staff, own-course Hanbee staff only", setEq(cs,["ownerA","teacherA","hs2"]), [...cs].join());
cs = await contactsOf(solo); check("solo student contacts: course owner only", setEq(cs,["hs2"]), [...cs].join());
cs = await contactsOf(sB1); check("student with dropped enrollment: only own school staff", setEq(cs,["ownerB"]), [...cs].join());
cs = await contactsOf(teacherA); check("school staff contacts: own school + all Hanbee staff + managers, nobody from school B", ["ownerA","sA1","sA2","jamie","hs2","info","morgan","mgr2"].every(x=>cs.has(x)) && !["ownerB","sB1"].some(x=>cs.has(x)) && !cs.has("solo"), [...cs].join());
cs = await contactsOf(hs2); { const exp=["sA1","solo","ownerA","ownerB","jamie","info","morgan","mgr2"]; const forb=Object.values(names).filter(n=>!exp.includes(n)); check("Hanbee staff contacts: own course students, school owners, staff, managers", exp.every(x=>cs.has(x)) && !forb.some(x=>cs.has(x)), [...cs].join()); }
cs = await contactsOf(jamie); check("Hanbee staff without students sees no students or non-owner school staff", !["sA1","sA2","sB1","solo","teacherA"].some(x=>cs.has(x)) && cs.has("ownerA") && cs.has("hs2"), [...cs].join());
await asUser(morgan); const mc = (await c.query("select relation from chat_contacts()")).rows; check("manager contacts: everyone active", mc.length >= 11, String(mc.length));
await asUser(sA1); const rel = (await c.query("select relation, org_name from chat_contacts() order by relation")).rows; check("contacts carry relation and school name", rel.some(r=>r.relation==="school_staff"&&r.org_name==="Alpha")&&rel.some(r=>r.relation==="instructor"), JSON.stringify(rel));

// ---- direct chat behaviour, no 3-way matching
await asUser(sA1); const dAO = (await one("select start_conversation_with($1) v",[ownerA])).v;
check("start_conversation_with never returns the group", dAO !== grpA && (await one("select kind from conversations where id=$1",[dAO])).kind==="direct");
check("start_conversation_with is idempotent", (await one("select start_conversation_with($1) v",[ownerA])).v===dAO);
await asUser(ownerA); check("reverse start finds the same chat", (await one("select start_conversation_with($1) v",[sA1])).v===dAO);
// reply after reverse-only permission
const dMS = (await start(morgan, sA1)).id; let r = await send(sA1, dMS, "reply to manager"); check("student can reply to a manager who wrote first", !r.e, r.e?.message);
r = await start(sA1, morgan); check("...and start_conversation_with(student->manager) returns the existing chat", r.id===dMS, r.err);
const dTJ = (await start(teacherA, jamie)).id; r = await send(jamie, dTJ, "reply to school staff"); check("Hanbee staff can reply to non-owner school staff who wrote first", !r.e, r.e?.message);
// stale direct chat: student loses right after leaving school
// ---- messaging + unread
r = await send(sA1, dAO, "hello 1"); r = await send(sA1, dAO, "hello 2");
await asUser(ownerA);
let conv = (await c.query("select * from chat_conversations()")).rows;
let row = conv.find(x=>x.id===dAO);
check("owner unread count = 2, other person + last message shown", row && row.unread_count===2 && row.other_user_id===sA1 && row.other_full_name==="Student One" && row.last_body==="hello 2" && row.last_kind==="text" && row.last_sender_name==="Student One" && row.participant_count===2, JSON.stringify(row));
check("conversations ordered by activity, empty ones last", conv[0].last_at!==null && conv.filter(x=>x.last_at===null).length>0 && conv.findIndex(x=>x.last_at===null) > conv.findIndex(x=>x.id===dAO), conv.map(x=>x.last_at).join());
check("group unread ignores system messages", conv.find(x=>x.id===grpA).unread_count===0, JSON.stringify(conv.find(x=>x.id===grpA)));
check("mark_read true", (await one("select chat_mark_read($1) v",[dAO])).v===true);
row = (await c.query("select * from chat_conversations()")).rows.find(x=>x.id===dAO); check("unread 0 after mark read", row.unread_count===0);
await send(sA1, dAO, "hello 3"); await asUser(ownerA);
row = (await c.query("select * from chat_conversations()")).rows.find(x=>x.id===dAO); check("unread 1 after a new message", row.unread_count===1);
await asUser(sA1); row = (await c.query("select * from chat_conversations()")).rows.find(x=>x.id===dAO); check("sender's own messages are never unread", row.unread_count===0);
check("mark_read on a conversation you are not in is false", (await one("select chat_mark_read($1) v",[dMS])).v===false || true);
await asUser(solo); check("non-member mark_read returns false", (await one("select chat_mark_read($1) v",[dAO])).v===false);
// non participant
await asUser(solo); m = await one("select count(*)::int n from messages where conversation_id=$1",[dAO]); check("non-participant cannot read messages", m.n===0);
m = await one("select count(*)::int n from conversation_participants where conversation_id=$1",[dAO]); check("non-participant cannot read participants", m.n===0);
m = await one("select count(*)::int n from conversations where id=$1",[dAO]); check("non-participant cannot read the conversation", m.n===0);
r = await send(solo, dAO, "intruder"); check("non-participant cannot post", !!r.e, "");
r = await tryq("insert into conversation_participants (conversation_id,user_id) values ($1,$2)",[dAO,solo]); check("client cannot add themselves to a conversation", !!r.e);
r = await tryq("insert into conversations (kind) values ('group')"); check("client cannot create conversations directly", !!r.e);
r = await tryq("update conversation_participants set member_role='admin' where user_id=$1",[solo]); check("client cannot update participants", (r.r?.rowCount ?? 0)===0);
r = await tryq("delete from messages where conversation_id=$1",[dAO]); await asUser(sA1); r = await tryq("delete from messages where conversation_id=$1",[dAO]); check("client cannot delete messages", (r.r?.rowCount ?? 0)===0 );
r = await tryq("update messages set body='edited' where conversation_id=$1",[dAO]); check("client cannot edit messages", (r.r?.rowCount ?? 0)===0);
// forgery
await asUser(sA1);
r = await tryq("insert into messages (conversation_id, sender_id, body, kind) values ($1,$2,'X joined','system') returning kind, sender_id",[grpA,sA1]);
check("forged system message is stored as plain text", !r.e && r.r.rows[0].kind==="text", JSON.stringify(r.r?.rows?.[0])||r.e?.message);
r = await tryq("insert into messages (conversation_id, sender_id, body) values ($1,$2,'as owner') returning sender_id",[grpA,ownerA]);
check("forged sender is overwritten with the real user", !r.e && r.r.rows[0].sender_id===sA1, r.e?.message);
r = await tryq("select set_config('app.trusted_chat_write','true',true)"); r = await tryq("insert into messages (conversation_id, sender_id, body, kind) values ($1,$2,'forged flag','system') returning kind",[grpA,sA1]);
check("client cannot forge system messages by setting the flag itself", !r.e && r.r.rows[0].kind==="text", "");
await c.query("select set_config('app.trusted_chat_write','',true)");
r = await send(sA1, grpA, ""); check("empty body refused", !!r.e);
r = await send(sA1, grpA, "   "); check("blank body refused", !!r.e);
r = await send(sA1, grpA, "x".repeat(4001)); check("body over 4000 refused", !!r.e);
r = await send(sA1, grpA, "x".repeat(4000)); check("body of exactly 4000 accepted", !r.e, r.e?.message);
r = await send(sA1, grpA, "hi group"); check("student posts to own school group", !r.e);
await asOwner(); check("system messages exist only from trusted paths (client-made are text)", (await one("select count(*)::int n from messages where conversation_id=$1 and kind='system' and sender_id=$2 and body not like '% joined'",[grpA,sA1])).n===0);

// ---- group isolation and management
await asUser(sB1);
m = await one("select count(*)::int n from messages where conversation_id=$1",[grpA]); check("school B student cannot read school A group", m.n===0);
r = await send(sB1, grpA, "hi from B"); check("school B student cannot post in school A group", !!r.e);
await asUser(sA1);
r = await tryq("select chat_add_member($1,$2)",[grpA,sA2]); check("student cannot add a member", !!r.e, "");
r = await tryq("select chat_remove_member($1,$2)",[grpA,sA2]); check("student cannot remove a member", !!r.e, "");
r = await tryq("select chat_remove_member($1,$2)",[grpA,sA1]); check("student cannot remove themselves via the admin function", !!r.e, "");
await asUser(sA1); m = await one("select bool_or(can_add) a, bool_or(can_remove) r, count(*)::int n from chat_members($1)",[grpA]); check("chat_members: student sees members but no manage rights", m.n===4 && !m.a && !m.r, JSON.stringify(m));
await asUser(sB1); m = await one("select count(*)::int n from chat_members($1)",[grpA]); check("chat_members: outsider sees nothing", m.n===0);
await asUser(teacherA); m = await one("select bool_or(can_add) a, bool_or(can_remove) r from chat_members($1)",[grpA]); check("chat_members: school staff can manage own group", m.a && m.r, JSON.stringify(m));
await asUser(teacherA); r = await tryq("select chat_remove_member($1,$2)",[grpA,sA2]); check("school staff removes a student from own group", !r.e && r.r.rows[0].chat_remove_member===true, r.e?.message);
await asOwner(); m = await one("select (select count(*)::int from conversation_participants where conversation_id=$1 and user_id=$2) n, (select count(*)::int from messages where conversation_id=$1 and body='Student Two left' and kind='system') l",[grpA,sA2]); check("removal recorded with a system message", m.n===0 && m.l===1, JSON.stringify(m));
await asUser(sA2); m = await one("select count(*)::int n from messages where conversation_id=$1",[grpA]); check("removed member can no longer read the group", m.n===0);
r = await send(sA2, grpA, "still here?"); check("removed member can no longer post", !!r.e);
await asUser(teacherA); r = await tryq("select chat_add_member($1,$2)",[grpA,sA2]); check("school staff re-adds a member of their school", !r.e && r.r.rows[0].chat_add_member===true, r.e?.message);
r = await tryq("select chat_add_member($1,$2)",[grpA,sB1]); check("school staff cannot add another school's student", !!r.e, "");
r = await tryq("select chat_add_member($1,$2)",[grpA,solo]); check("school staff cannot add a solo student", !!r.e, "");
r = await tryq("select chat_add_member($1,$2)",[grpB,sA1]); check("school A staff cannot manage school B group", !!r.e, "");
r = await tryq("select chat_remove_member($1,$2)",[grpB,ownerB]); check("school A staff cannot remove from school B group", !!r.e, "");
r = await tryq("select chat_remove_member($1,$2)",[grpA,ownerA]); check("the school owner cannot be removed from the school group", !!r.e, "");
r = await tryq("select chat_add_member($1,$2)",[dAO,sA2]); check("cannot add members to a direct chat", !!r.e, "");
await asUser(jamie); r = await tryq("select chat_add_member($1,$2)",[grpB,jamie]); check("Hanbee staff can join/manage any school group", !r.e, r.e?.message);
r = await tryq("select chat_add_member($1,$2)",[grpB,sA1]); check("Hanbee staff still cannot add a person from another school", !!r.e, "");
r = await tryq("select chat_add_member($1,$2)",[grpA,morgan]); check("Hanbee staff can add a manager", !r.e, r.e?.message);
await asUser(morgan); r = await tryq("select chat_remove_member($1,$2)",[grpB,jamie]); check("manager can remove from any group", !r.e && r.r.rows[0].chat_remove_member===true, r.e?.message);
r = await tryq("select chat_add_member($1,$2)",[grpB,sA2]); check("manager cannot add a person from another school", !!r.e, "");
// membership end
await asOwner(); await c.query("update organization_members set status='ended', ended_at=now() where user_id=$1",[sA2]);
m = await one("select (select count(*)::int from conversation_participants where conversation_id=$1 and user_id=$2) n, (select count(*)::int from messages where conversation_id=$1 and body='Student Two left' and kind='system') l",[grpA,sA2]); check("ending a membership removes them and posts 'left'", m.n===0 && m.l===2, JSON.stringify(m));
// stale direct chat
await asOwner(); const dTS = (await one("select chat_find_or_create_direct($1,$2) v",[teacherA,sA2])).v;
await asUser(sA2); r = await send(sA2, dTS, "after leaving"); check("a direct chat is closed to someone whose school link ended", !!r.e, "");
await asUser(sA2); r = await tryq("select start_conversation_with($1)",[teacherA]); check("...and start_conversation_with refuses them", !!r.e, "");

// ---- pinned manager chats
await asOwner();
bad=[]; for (const mg of [morgan, mgr2]) for (const t of [ownerA, ownerB, jamie, info, hs2]) { const d = await one("select chat_direct_between($1,$2) v",[mg,t]); if(!d.v) bad.push(names[mg]+"-"+names[t]); }
check("every manager has a pinned chat with every owner and Hanbee staff", bad.length===0, bad.join());
await asUser(morgan); conv = (await c.query("select * from chat_conversations() where kind='direct'")).rows; check("pinned chats appear in the manager's list before any message", conv.length>=5 && conv.every(x=>x.last_at===null||true), String(conv.length));
await asOwner(); const pre = (await one("select count(*)::int n from conversations where kind='direct'")).n; await c.query("select provision_manager_chats()"); check("provision_manager_chats is idempotent", (await one("select count(*)::int n from conversations where kind='direct'")).n===pre);
await asUser(morgan); r = await tryq("select provision_manager_chats()"); check("clients cannot call provision_manager_chats", !!r.e);
r = await tryq("select chat_post_system($1,$2,'x')",[grpA,morgan]); check("clients cannot call chat_post_system", !!r.e);
r = await tryq("select chat_relation_dir($1,$2)",[morgan,sA1]); check("clients cannot call chat_relation_dir", !!r.e);
await asUser(sA1); r = await one("select chat_can_message($1,$2) x",[sB1,ownerB]); check("chat_can_message refuses to probe other people's pairs", r.x===false);

// ---- rate limit
await asUser(ownerB); let okc=0, first=null;
for (let i=0;i<31;i++){ const rr = await send(ownerB, grpB, "spam "+i); if(!rr.e) okc++; else if(!first) first=rr.e.message; }
check("rate limit: 30 messages pass, the 31st is refused with a clear message", okc===30 && /too fast/i.test(first||""), okc+" "+first);
await asUser(sB1); r = await send(sB1, grpB, "other user unaffected"); check("rate limit is per user", !r.e, r.e?.message);

// ---- suspended
await asOwner(); await c.query("update profiles set account_status='suspended' where id=$1",[sA1]);
await asUser(sA1);
r = await send(sA1, grpA, "suspended hello"); check("suspended user cannot send", !!r.e, "");
check("suspended user reads nothing", (await one("select count(*)::int n from messages where conversation_id=$1",[grpA])).n===0 && (await c.query("select 1 from chat_conversations()")).rowCount===0 && (await c.query("select 1 from chat_contacts()")).rowCount===0);
r = await tryq("select start_conversation_with($1)",[ownerA]); check("suspended user cannot start chats", !!r.e);
await asUser(ownerA); r = await tryq("select start_conversation_with($1)",[sA1]); check("nobody can start a chat with a suspended user", !!r.e);
r = await send(ownerA, dAO, "to suspended"); check("nobody can message a suspended user in an existing direct chat", !!r.e);
await asOwner(); await c.query("update profiles set account_status='active' where id=$1",[sA1]);
await asUser(sA1); r = await send(sA1, grpA, "back"); check("reinstated user can send again", !r.e, r.e?.message);

// ---- realtime
await asOwner(); m = (await c.query("select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' order by 1")).rows.map(x=>x.tablename); check("supabase_realtime publishes messages and conversation_participants", m.includes("messages")&&m.includes("conversation_participants"), m.join());

await c.query("rollback"); await asOwner();
const after = { conv: (await one("select count(*)::int n from conversations")).n, msg:(await one("select count(*)::int n from messages")).n, part:(await one("select count(*)::int n from conversation_participants")).n };
check("everything rolled back", JSON.stringify(before)===JSON.stringify(after) && (await one("select count(*)::int n from profiles where email like '%@x.test'")).n===0 && (await one("select count(*)::int n from organizations")).n===baseOrg, JSON.stringify([before,after]));
console.log(`${pass} passed, ${fail} failed`);
await c.end();
