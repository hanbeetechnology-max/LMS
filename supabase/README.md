# HanbeeLms — Supabase setup

This is fully prepared and ready to apply, but **not yet connected** — nothing
in the app calls Supabase yet (see `frontend/src/lib/supabaseClient.ts`,
currently unused). See `docs/PLAN.md` §10.35 for why.

## 1. Create the project

Go to [supabase.com](https://supabase.com) → New Project (free tier is
enough). Note the **database password** you set — you won't need it for
anything below, but Supabase asks for it upfront.

## 2. Apply the schema

Open your project's **SQL Editor** and run these three files **in order**
(copy-paste each one's contents and hit Run):

1. `migrations/0001_init.sql` — tables, enums, the profile-creation trigger
2. `migrations/0002_rls.sql` — Row Level Security policies (the app has no
   access to anything until these are applied)
3. `migrations/0003_functions.sql` — attendance heartbeat/finalize RPCs,
   idempotent certificate issuance, and the public certificate-verify RPC
4. `migrations/0004_role_signup_security.sql` — role and signup security
5. `migrations/0005_staff_approval.sql` — staff approval workflow
6. `migrations/0006_assessments.sql` — `assessments`, questions, options, and
   the student-safe options view
7. `migrations/0007_assessment_submissions.sql` — submissions, verification,
   auto-unlock, and notifications

If the app reports that assessment review is unavailable, apply the pending
migrations to the configured Supabase project with `supabase db push` (or run
`migrations/0007_assessment_submissions.sql` in the Supabase SQL editor), then
refresh the app. PostgREST will return 404 until the table migration has been
applied and its schema cache has refreshed.

(If you'd rather use the Supabase CLI: `supabase link` then `supabase db push`
picks these up automatically from this folder's naming convention.)

## 3. Get your API keys

Project → **Settings → API**:
- **Project URL**
- **anon / public key** — safe for frontend code
- **service_role key** — only for the seed script below; never put this in
  frontend code or commit it anywhere

## 4. Seed demo data (optional but recommended)

```
cd supabase
npm install
SUPABASE_URL=<your project URL> SUPABASE_SERVICE_ROLE_KEY=<your service role key> npm run seed
```

This creates the same three demo accounts the app has used all along
(`jamie@hanbeelms.edu` / `staff123`, `ava@student.edu` / `student123`,
`morgan@hanbeelms.edu` / `manager123`) plus a working course, one section, one
enrollment, one holiday, and one announcement — enough to sanity-check every
page. It's safe to re-run; it skips accounts that already exist.

## 5. Give me the URL + anon key

Once steps 1–4 are done, hand me the **Project URL** and **anon key** (the
service role key stays with you, not in chat) and I'll:
- Set `frontend/.env.local` from `frontend/.env.example`
- Wire `AuthProvider`, `AnnouncementsFeed`, attendance, and certificates over
  to real Supabase calls (replacing the `backend/` FastAPI prototype and the
  `mockAuth.ts` offline fallback)
- Re-run the full e2e suite against the real database and fix anything that
  breaks in the transition

## What's in this folder

- `migrations/0001_init.sql` — schema: profiles, courses/sections/modules/
  lessons/materials, enrollments, manual + autonomous attendance,
  announcements, certificates, discussions, messages, notifications, staff
  tasks/time entries, manager verifications/holidays, public applications,
  invitations. Field-for-field mirrors what's already in
  `frontend/src/lib/mock*.ts` and `backend/app/store.py`.
- `migrations/0002_rls.sql` — every table's access rules, explicit rather
  than assumed (Supabase denies all access by default once RLS is on).
- `migrations/0003_functions.sql` — the handful of things plain row-level
  policies can't express (idempotent certificate issuance, a public
  unauthenticated verify lookup, attendance heartbeat/finalize).
- `seed.mjs` — creates the demo accounts via the Admin API (not raw SQL,
  since seeding `auth.users` directly is fragile across Supabase versions)
  plus a working slice of course/roster/holiday/announcement data.
