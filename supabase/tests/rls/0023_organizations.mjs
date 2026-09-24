import { connect } from "./_db.mjs";
const c = await connect();
const id = async e => (await c.query("select id from profiles where email=$1",[e])).rows[0].id;
const ava=await id("ava@student.edu"), jamie=await id("jamie@hanbeelms.edu"), morgan=await id("morgan@hanbeelms.edu"), info=await id("info@hanbee.in");
let pass=0, fail=0; const check=(n,ok,x="")=>{(ok?pass++:fail++);console.log(ok?"PASS":"FAIL",n,x)};
const asUser = async (u) => { await c.query("reset role"); await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:u,role:"authenticated"})]); };
const asOwner = async () => { await c.query("reset role"); await c.query("select set_config('request.jwt.claims','',true)"); };
const tryq = async (sql,p)=>{ await c.query("savepoint s"); try{const r=await c.query(sql,p); await c.query("release savepoint s"); return {r};}catch(e){await c.query("rollback to savepoint s"); return {e};} };
const one = async (sql,p) => (await c.query(sql,p)).rows[0];

check("enum value school_staff exists", (await one("select count(*)::int n from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='user_role' and e.enumlabel='school_staff'")).n===1);

await c.query("begin");
await asUser(jamie); let r = await one("select is_hanbee_staff() h, is_manager() m, is_staff_or_manager() s");
check("Hanbee staff helpers", r.h===true && r.m===false && r.s===true, JSON.stringify(r));
await asUser(morgan); r = await one("select is_hanbee_staff() h, is_manager() m");
check("manager helpers", r.m===true && r.h===false, JSON.stringify(r));
await asUser(ava); r = await one("select is_hanbee_staff() h, is_manager() m, is_staff_or_manager() s, my_org_id() o");
check("student has no staff powers and no school", !r.h && !r.m && !r.s && r.o===null);
await c.query("rollback");

// suspension
await c.query("begin");
await asOwner(); await c.query("update profiles set account_status='suspended' where id=$1",[jamie]);
await asUser(jamie); r = await one("select my_role() r, is_staff_or_manager() s, is_hanbee_staff() h");
check("suspended staff loses every staff power at once", r.r===null && !r.s && !r.h, JSON.stringify(r));
r = await one("select count(*)::int n from courses where status='draft'");
check("suspended staff cannot read draft courses", r.n===0, `drafts visible=${r.n}`);
await c.query("rollback");
await c.query("begin");
await asOwner(); await c.query("update profiles set account_status='suspended' where id=$1",[ava]);
await asUser(ava); await c.query("update profiles set account_status='active', role='manager' where id=$1",[ava]);
await asOwner(); r = await one("select role, account_status from profiles where id=$1",[ava]);
check("suspended account cannot un-suspend or promote itself", r.account_status==="suspended" && r.role==="student", JSON.stringify(r));
await c.query("rollback");
await c.query("begin");
await asUser(ava); await c.query("update profiles set account_status='revoked' where id=$1",[ava]);
await asOwner(); r = await one("select account_status from profiles where id=$1",[ava]);
check("student cannot change own account_status", r.account_status==="active");
await c.query("rollback");

// schools: setup as owner, read as roles
await c.query("begin");
await asOwner();
const orgA = (await one("insert into organizations (name,status,registration_no,official_email,created_by) values ('Test School A','active','R-A','a@school.test',$1) returning id",[ava])).id;
const orgB = (await one("insert into organizations (name,status,registration_no,official_email,created_by) values ('Test School B','active','R-B','b@school.test',$1) returning id",[ava])).id;
const orgP = (await one("insert into organizations (name,status,registration_no,official_email,created_by) values ('Pending School','pending','R-P','p@school.test',$1) returning id",[ava])).id;
await c.query("update profiles set role='school_staff' where id=$1",[info]); // info plays school staff of A
await c.query("insert into organization_members (org_id,user_id,member_role) values ($1,$2,'owner')",[orgA,info]);
await c.query("insert into organization_members (org_id,user_id,member_role) values ($1,$2,'student')",[orgA,ava]);
await asUser(info);
r = await one("select count(*)::int n from organizations"); check("school staff sees only their own school", r.n===1, `n=${r.n}`);
r = await one("select count(*)::int n from organization_members"); check("school staff sees only their own school's members", r.n===2, `n=${r.n}`);
r = await one("select can_manage_org($1) a, can_manage_org($2) b", [orgA, orgB]); check("school staff manage own school, not another", r.a===true && r.b===false, JSON.stringify(r));
let w = await tryq("insert into organizations (name,registration_no,official_email,created_by) values ('x','x','x@x.x',$1)",[info]); check("school staff cannot create a school directly", !!w.e);
w = await tryq("update organizations set status='active' where id=$1",[orgP]); check("school staff cannot change a school's status", w.e || w.r.rowCount===0);
w = await tryq("insert into organization_members (org_id,user_id,member_role) values ($1,$2,'staff')",[orgB,info]); check("school staff cannot add themselves to another school", !!w.e);
await asUser(ava);
r = await one("select count(*)::int n from organizations"); check("student cannot read school rows (incl. join token)", r.n===0, `n=${r.n}`);
r = await one("select my_org_id() o"); check("student's school resolves while active", r.o===orgA);
await asOwner(); await c.query("update organizations set status='closed' where id=$1",[orgA]);
await asUser(ava); r = await one("select my_org_id() o"); check("student loses school once it closes", r.o===null);
await asUser(morgan); r = await one("select count(*)::int n from organizations where id in ($1,$2,$3)",[orgA,orgB,orgP]); check("manager reads every school", r.n===3);
await asUser(jamie); r = await one("select count(*)::int n from organizations where id in ($1,$2,$3)",[orgA,orgB,orgP]); check("Hanbee staff read every school", r.n===3);
await asOwner();
w = await tryq("insert into organization_members (org_id,user_id,member_role) values ($1,$2,'student')",[orgB,ava]); check("one active school per student is enforced", !!w.e, w.e?.message?.slice(0,60));
await c.query("rollback");
await asOwner();
check("all test rows rolled back", (await one("select count(*)::int n from organizations")).n===0);
check("info@hanbee.in role restored", (await one("select role from profiles where id=$1",[info])).role==="staff");
console.log(`${pass} passed, ${fail} failed`);
await c.end();
