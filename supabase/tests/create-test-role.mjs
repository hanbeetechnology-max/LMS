// Creates a restricted database login, `hanbee_test`, for the security test suites,
// so the tests no longer need the all-powerful owner password.
//
// The role can: act as each app role (authenticated, anon) and set up test data
// (it bypasses row-level rules like the owner). It cannot: create, alter or drop
// tables, functions, policies or triggers, change roles or extensions, or read
// other schemas such as storage or vault.
//
// Usage (needs the OWNER connection string once):
//   SUPABASE_OWNER_DB_URL=... node create-test-role.mjs            # create, write .env.test
//   SUPABASE_OWNER_DB_URL=... node create-test-role.mjs --reset    # new password
// The password goes ONLY into the git-ignored file supabase/tests/.env.test.
import fs from "fs";
import crypto from "crypto";
import pg from "pg";

const ownerUrl = process.env.SUPABASE_OWNER_DB_URL ?? process.env.SUPABASE_DB_URL;
if (!ownerUrl) throw new Error("Set SUPABASE_OWNER_DB_URL (owner connection string) to create the role.");
const RESET = process.argv.includes("--reset");
const ENV_FILE = new URL("./.env.test", import.meta.url);

const owner = new pg.Client({ connectionString: ownerUrl, ssl: { rejectUnauthorized: false } });
await owner.connect();
try {
  const exists = (await owner.query("select 1 from pg_roles where rolname = 'hanbee_test'")).rowCount > 0;
  if (exists && !RESET && fs.existsSync(ENV_FILE)) {
    console.log("hanbee_test already exists and .env.test is present. Use --reset to issue a new password.");
  } else {
    const password = crypto.randomBytes(24).toString("base64url");
    await owner.query("begin");
    if (!exists) await owner.query(`create role hanbee_test login password '${password}' nosuperuser nocreaterole nocreatedb noreplication`);
    else await owner.query(`alter role hanbee_test password '${password}'`);
    await owner.query("alter role hanbee_test bypassrls");
    await owner.query("grant authenticated, anon to hanbee_test");
    await owner.query("grant usage on schema public, auth to hanbee_test");
    await owner.query("grant select, insert, update, delete on all tables in schema public to hanbee_test");
    await owner.query("grant usage, select on all sequences in schema public to hanbee_test");
    await owner.query("grant execute on all functions in schema public to hanbee_test");
    await owner.query("revoke all on auth.users from hanbee_test");
    await owner.query("commit");

    // Same host, pooler user name is <role>.<project ref>.
    const u = new URL(ownerUrl);
    const ref = decodeURIComponent(u.username).split(".")[1];
    u.username = `hanbee_test.${ref}`;
    u.password = password;
    fs.writeFileSync(ENV_FILE, `# Local only, never commit. Created by create-test-role.mjs\nSUPABASE_DB_URL=${u.toString()}\n`);
    console.log("hanbee_test ready. Connection string saved to supabase/tests/.env.test (not printed).");
  }

  // Helpers for the two things the restricted login cannot do itself (auth.users
  // belongs to Supabase's auth system). Only hanbee_test may call them; the
  // normal signup rules (invite-only trigger) still apply to every user created.
  await owner.query(`
    create or replace function public.test_support_signup(p_id uuid, p_email text, p_meta jsonb) returns void as $$
      insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
      values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, p_meta, now(), now());
    $$ language sql security definer set search_path = public, auth`);
  await owner.query(`
    create or replace function public.test_support_banned(p_id uuid) returns boolean as $$
      select banned_until is not null from auth.users where id = p_id;
    $$ language sql security definer set search_path = public, auth`);
  await owner.query("revoke all on function public.test_support_signup(uuid, text, jsonb), public.test_support_banned(uuid) from public, anon, authenticated");
  await owner.query("grant execute on function public.test_support_signup(uuid, text, jsonb), public.test_support_banned(uuid) to hanbee_test");
} finally {
  await owner.end();
}
