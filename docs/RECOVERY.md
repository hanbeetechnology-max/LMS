# Recovery and Incident Guide

What to do when data is lost, the manager is locked out, or a secret leaks. Keep this where more than one person can find it.

## 1. Backups

| Layer | What it protects | Status |
|---|---|---|
| Supabase automatic backups | The whole database including accounts and passwords | **Check in the Supabase dashboard under Database, then Backups.** Daily backups and point-in-time recovery depend on your plan (paid plans). Until the plan is confirmed, treat this layer as unproven. |
| Manual data export (`supabase/tests/backup.mjs`) | Every table in the public schema (people, schools, courses, progress, chat, results) | Working. Does **not** include passwords: those live in Supabase's auth system. |

Run a manual export weekly, and always before a risky change:

```
cd supabase/tests
node backup.mjs export      # writes backups/<timestamp>/ with a manifest
node backup.mjs verify      # proves the newest backup is intact and compares it with the live data
```

The `backups/` folder is git-ignored and holds personal data. Copy it somewhere safe and private (not into the repo, not into chat).

**A backup you have not restored is a guess.** Do the restore drill below once, and again after any big schema change.

## 2. Restore drill (do this once, in a scratch project)

1. Create a new, empty Supabase project (a free one is fine). Never do this in production.
2. Apply the migrations in order with the owner login of the scratch project:
   `SUPABASE_OWNER_DB_URL=<scratch owner url> node apply-migration.mjs ../migrations/0001_init.sql`, then 0002, 0003 and so on up to the newest. This also proves the migrations rebuild the whole database from nothing.
3. Load the exported rows (`backups/<timestamp>/*.ndjson`, one JSON object per line) into the scratch database in table order, parents before children (organizations before organization_members, courses before modules, and so on). Because several tables have protective triggers, load as the database owner and expect to disable a table's user triggers while loading it.
4. Accounts: passwords are not in the export. After a restore people must use "forgot password", or you restore the Supabase-level backup instead.
5. Sign in as the manager and click through Monitor, Schools, Courses.
6. Write down what was awkward and fix this guide. **This drill has not been done yet.**

## 3. Manager locked out (break-glass)

Only the database owner can do this, in the Supabase dashboard SQL editor. Owner statements are allowed to change roles; the change is written to the audit log with no actor, which is your evidence.

```sql
update profiles
   set role = 'manager', approved = true, account_status = 'active'
 where email = 'the-real-manager@example.com';
```

Then have that person reset their password from the login page. Before final launch keep exactly one manager (see the launch checklist in `docs/MULTI_SCHOOL_PLATFORM.md`).

## 4. Suspected leak (password, key or token)

Do these in order, without waiting to be sure:

1. **Database password**: Supabase dashboard, Project Settings, Database, reset the password. Then create a new restricted test login: `node create-test-role.mjs --reset`.
2. **Sign everyone out**: run `delete from auth.sessions;` in the SQL editor. Everyone signs in again.
3. **Other keys**: rotate the Gemini key in Google AI Studio and `supabase secrets set GEMINI_API_KEY=...`; if the service key may be exposed, rotate the API keys in the Supabase dashboard (Project Settings, API).
4. **Look at what happened**: the manager's Monitor page shows recent activity; the full record is the `audit_log` table (it cannot be edited or deleted).
5. **Suspend suspicious accounts**: the Schools and Hanbee staff pages have Suspend and Revoke, which end sessions at once.

## 5. Scripts and logins at a glance

| Login | Used for | Where it lives |
|---|---|---|
| Owner (`postgres`) | Migrations only | Your head or a password manager. Never in files or chat. |
| `hanbee_test` (restricted) | Security tests, backups, demo seed reads | `supabase/tests/.env.test` (git-ignored). Cannot change tables, policies, roles or read `auth.users`. |
