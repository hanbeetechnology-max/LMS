# Database security tests

Each file in `rls/` logs in as real roles (student, school staff, Hanbee staff, manager, anonymous) using `set local role authenticated` and JWT claims, tries things each role must and must not be able to do, and prints PASS or FAIL. Everything runs inside a transaction that is **rolled back**, so no data is left behind.

One-time setup (from this folder, once: `npm install`), then create the restricted test login so the owner password is not needed for tests:

```
SUPABASE_OWNER_DB_URL=<owner connection string> node create-test-role.mjs
```

This writes the restricted connection string to the git-ignored `.env.test`; the suites use it automatically. Use `SUPABASE_OWNER_DB_URL` only for migrations (`apply-migration.mjs`) and creating that login. Backups: `node backup.mjs export` and `node backup.mjs verify` (see `docs/RECOVERY.md`).

Run a suite (set `SUPABASE_DB_URL` yourself only if you do not use `.env.test`):

```
SUPABASE_DB_URL="postgresql://postgres.<project-ref>:<url-encoded-password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" node rls/0028_tenant_scoping.mjs
```

Never commit the URL. Use the session pooler (the direct host is IPv6 only). Encode special characters in the password (`@` becomes `%40`).

| File | Proves |
|---|---|
| `0023_organizations.mjs` | Role helpers, suspension removes staff powers, schools and membership are read-only for clients, one active school per student |
| `0024_invite_only_signup.mjs` | Strangers cannot sign up, school registration, first verifier wins, invites (bulk, revoke, expiry, co-staff, solo), audit log cannot be forged |
| `0016_0021_regressions.mjs` | Role self-promotion, attendance/certificate/time-entry forgery, server-checked lesson completion, gated content, scoped profiles |
| `0026_chat_v2.mjs` | Who may message whom (27 allowed and 27 refused pairs), school groups, add/remove rules, unread counts, rate limit, forged system messages |
| `0027_tournaments_teams_applications.mjs` | Tournament visibility, teams, payment claims can never be client-set, leaderboard, course applications and enrollment |
| `0036_reviews_certificates.mjs` | Lesson reviews and certificates lists: who may see which |
| `0037_backend_hardening.mjs` | Join link rotation, append-only audit log, masked certificate name, chat history and profile limits, flood caps |
| `0029_overviews_status_solo.mjs` | Dashboard data functions and who may call them, suspend/close/revoke, solo conversion, joining a new school |
| `0028_tenant_scoping.mjs` | School A never sees school B: announcements, calendar, enrollments, discussions, profiles; revocation |

They rely on these live accounts existing: `ava@student.edu` (student with an enrollment), `jamie@hanbeelms.edu` (Hanbee staff), `morgan@hanbeelms.edu` (manager). Add a test file for every new migration, and rerun all of them after any policy change. To apply a migration: `SUPABASE_DB_URL=... node apply-migration.mjs ../migrations/<file>.sql` (all or nothing). To run everything: `for f in rls/0*.mjs; do node $f | tail -1; done`.
