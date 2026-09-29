# HanbeeLms — Supabase setup

Supabase is HanbeeLms's authoritative authentication and database backend.
Authorization lives in Postgres RLS policies and security-definer functions; the
frontend uses only the public anon key. Authentication, course progress,
certificates, teams, school operations, chat, announcements, staff attendance,
manager review pages and the AI assistant call Supabase directly. The separate
`backend/` Express routes are legacy and are not part of this Supabase-only
architecture.
## 1. Create the project

Go to [supabase.com](https://supabase.com) → New Project (free tier is
enough). Note the **database password** you set — you won't need it for
anything below, but Supabase asks for it upfront.

## 2. Apply the schema

Apply every file in `migrations/` in numeric order. The recommended method is
the Supabase CLI so migration history stays tracked:

```
supabase link --project-ref <your-project-ref>
supabase db push
```

Do not apply only the first few migrations; later migrations add role security,
tenant isolation, course assessments, chat, tournaments, attendance, and team
formation. Migration `0040_ai_daily_capacity.sql` adds the shared AI quota used
by the Edge Function. Migration `0041_solo_tournament_entries.sql` adds the
solo-student tournament submission path and the Hanbee review queue.
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

## 5. Configure the frontend

Copy `frontend/.env.example` to `frontend/.env.local` and fill in the Supabase
Project URL and anon key. Never put the service-role key in the frontend. No
Supabase project credentials are currently present in this workspace, so live
authentication and database requests require this setup. Set
`NEXT_PUBLIC_TOURNAMENT_PAYMENT_QR_URL` in the frontend environment to show the
hosted payment QR on the solo tournament entry page.
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

## AI Assistant deployment settings

The AI Edge Function requires an explicit browser-origin allow-list. Apply
`migrations/0040_ai_daily_capacity.sql` before deploying it, then set the
function secrets with your real site origins and Gemini key:

```
supabase secrets set ALLOWED_ORIGINS="https://your-site.example,https://www.your-site.example" GEMINI_API_KEY="your-key" GEMINI_DAILY_REQUEST_LIMIT="100"
supabase functions deploy ai-assistant
```

Add the local development origin to `ALLOWED_ORIGINS` when testing locally.
The shared daily limit defaults to 100 if `GEMINI_DAILY_REQUEST_LIMIT` is not
set; choose a limit that fits the provider quota for your project.
