# Frontend Contract: HanbeeLms Portal

The shared spec for the portal screens (student, school staff, Hanbee staff, manager, chat, auth). It is also the handover document for the polished redesign: keep pages thin, keep data logic in `frontend/src/lib/*Api.ts`, and a new skin can replace the screens without touching the rules. Read `docs/MULTI_SCHOOL_PLATFORM.md` first for the product rules.

## Principles

1. **Simple, working, replaceable.** Clear layout, real data, every state handled. Not a polished redesign; that comes later from another developer.
2. **Real data only.** No mock data, no fake numbers. If the database has nothing, show an honest empty state.
3. **The database decides.** The screens never enforce security. If a call is refused, show a plain message. Never hide a rule only in the UI.
4. **Every screen handles** loading (`LoadingBlock`), error with retry (`ErrorBlock`), empty (`EmptyState`), and success feedback (`useToast()` from `lib/ToastProvider`).
5. **Accessible and responsive**: labelled inputs, buttons at least 44px tall, visible focus, works at 390px wide with no sideways page scroll (tables scroll inside their own box), no colour-only meaning.
6. **Styling**: Tailwind v4 with the existing tokens, written like `text-(--color-ink)`, `bg-(--color-cloud)`, `border-(--color-line)`, `font-display`. Use `Reveal`/`StaggerGroup` from `components/ui/Reveal` sparingly. Do not hard-code colours. No emoji. The tournament side may wrap in the scoped `.rc-theme` class (dark racing look); the learning side stays light. Frontend work follows the `awwwards` skill per CLAUDE.md, kept restrained.
7. **Plain language.** Short labels, no jargon. Error messages say what to do next.

## Routes and owners

Each role's routes live in `src/portal/<role>/routes.tsx`. `src/routes/router.tsx` only composes them (owner: lead). Layouts wrap `AppShell` (`src/layouts/AppShell.tsx`, takes `navItems` and `settingsPath`). Stubs exist for every page; replace them, keep the exported names.

| Area | Folder | Routes | Owner |
|---|---|---|---|
| Auth and public | `portal/auth/`, plus existing `pages/LoginPage`, `SignupPage`, `AcceptInvitePage`, `PendingApprovalPage`, `ManagerSetupPage`, `ResetPasswordPage`, `layouts/AuthLayout`, landing components, `pages/TournamentPage` | `/login`, `/signup` (Hanbee staff application), `/register-school`, `/join/:token`, `/accept-invite`, `/setup`, `/reset-password`, `/pending-approval`, `/account-suspended`, `/school-inactive`, `/tournament` (marketing only) | auth agent |
| Chat | `portal/chat/` | `ChatPage` used at `/student/chat`, `/school/chat`, `/staff/chat`, `/manager/chat` | chat agent |
| Shared pages | `portal/shared/` | `AnnouncementsPage`, `SchedulePage`, `TasksPage`, `SettingsPage` (role-aware, no props) | shared agent |
| Student | `portal/student/` | `/student/rc`, `rc/leaderboard`, `rc/team`, `lms`, `lms/courses`, `lms/attendance`, `lms/ai`, `announcements`, `chat`, `settings`, plus existing lesson viewer and certificate | student agent (also the only one allowed to touch `layouts/AppShell.tsx`, additive optional props only) |
| School staff | `portal/school/` | `/school/overview`, `students`, `teams`, `announcements`, `schedule`, `chat`, `courses`, `settings` | school agent |
| Hanbee staff | `portal/hanbee/` | `/staff/my-space`, `tournament`, `lms`, `schools`, `schools/:orgId`, `courses`, `courses/new`, `courses/:id/edit`, `applications`, `announcements`, `schedule`, `chat`, `settings` | Hanbee agent (`SchoolDetailPage` is reused by the manager) |
| Manager | `portal/manager/` | `/manager/monitor`, `verifications`, `schools`, `schools/:orgId`, `staff`, `announcements`, `tasks`, `chat`, `settings` | manager agent |

Post-login home per role: `ROLE_HOME` in `portal/paths.ts` (student `/student/rc`, school staff `/school/overview`, Hanbee staff `/staff/my-space`, manager `/manager/monitor`). Account states are handled by `routes/ProtectedRoute.tsx`: suspended goes to `/account-suspended`, pending Hanbee staff or pending school goes to `/pending-approval`, suspended or closed school goes to `/school-inactive`.

## File ownership rules (avoid collisions)

- Edit only your own folder, your own `routes.tsx`, and the existing files listed for you above.
- **Read-only for everyone:** `portal/kit/*`, `lib/portalApi.ts`, `lib/inviteMail.ts`, `lib/chatApi.ts`, `lib/tournamentPortalApi.ts`, `lib/AuthProvider.tsx`, `routes/ProtectedRoute.tsx`, `routes/router.tsx`, `portal/paths.ts`. If one is missing something, build a small helper inside your own folder and tell the lead in your report.
- Existing `lib/*Api.ts` modules (`calendarApi`, `staffTasksApi`, `staffTimeApi`, `courseManagementApi`, `rosterApi`, `attendanceApi`, `holidaysApi`, `certificatesApi`, `coursesApi`, `coursesAdminApi`) may be extended only by the agent that needs them, additively (new functions or optional fields; never change an existing signature).
- Do not edit migrations or `supabase/`. If the database is missing something, report it to the lead.
- Do not touch payment logic. The apply step reuses `components/ui/ScanToPayCard.tsx` as is.

## Data modules (all typed, in `frontend/src/lib/`)

| Module | Use |
|---|---|
| `portalApi.ts` | Signup paths (`registerSchool`, `joinWithSchoolLink`, `acceptPersonalInvite`, `applyAsHanbeeStaff`, `getJoinInfo`, `preflightJoin`, `joinSchool`), `fetchMySchool`, `fetchMyCourseProgress`, invites (`inviteStudents`, `inviteSchoolStaff`, `revokeInvitation`, `fetchSchoolInvitations`, `fetchSchoolJoinLink`), verification (`verifySchool`, `rejectSchool`, `fetchPendingHanbeeStaff`, `approveHanbeeStaff`), overviews (`fetchSchoolOverview`, `fetchSchoolStudents`, `fetchSchoolCourseParticipation`, `fetchCourseStudents`, `fetchCourseStats`, `fetchSchoolDirectory`, `fetchSiteTournamentOverview`, `fetchSiteLmsOverview`, `fetchHanbeeStaffOverview`), status (`setAccountStatus`, `setSchoolStatus`, `convertToSolo`), `fetchAuditLog` |
| `inviteMail.ts` | `buildInviteMessage`, `buildMailBatches` (mailto, Outlook web, Gmail links, students in BCC, batches of 40), `emailsAsText` |
| `tournamentPortalApi.ts` | Tournaments, teams, members, apply, decide, leaderboard, results, course applications, `enrollStudent` |
| `chatApi.ts` | Conversations, messages, contacts, members, realtime subscribe, presence and typing |
| `calendarApi.ts`, `staffTasksApi.ts`, `staffTimeApi.ts` | Schedule events, personal tasks, clock in/out (the shared agent extends calendar for `org_id` and personal `owner_id`) |
| `courseManagementApi.ts`, `coursesAdminApi.ts`, `coursesApi.ts` | Course, module, lesson CRUD; student lesson access |
| `AuthProvider.tsx` (`useAuth()`) | `profile` with `role`, `approved`, `accountStatus`, `isSolo`, `school`; `signIn`, `signOut`, `refreshProfile` |

Announcements are read and written directly with the Supabase client on the `announcements` table (`org_id` null means site-wide; school announcements set `org_id`; RLS enforces who may). Existing `components/app/AnnouncementsFeed.tsx` shows the pattern.

## UI kit (`portal/kit`, import from `"../kit"`)

`PageHeader`, `Card`, `StatCard`, `EmptyState`, `LoadingBlock`, `ErrorBlock`, `Badge`, `StatusBadge` (maps statuses to tones), `Avatar`, `SlideSwitcher` and `SlidePanel` (the slide-style tab switch), `DataTable` (sortable, scrolls sideways inside its own box), `useAsync(load, deps)` (`{data, loading, error, reload}`), and formatters `formatDate`, `formatDateTime`, `formatTime`, `relativeTime`, `initials`.

## Demo accounts (live database)

Created by `supabase/tests/seed-demo.mjs` through the real signup rules. Password for every `@hanbee.test` account: `Demo#12345`.

| Who | Email |
|---|---|
| School owner, Demo Public School | `demo.owner1@hanbee.test` |
| School co-teacher, same school | `demo.teacher1@hanbee.test` |
| Students, same school (team Alpha Racers, verified) | `demo.s1@hanbee.test`, `demo.s2@hanbee.test`, `demo.s3@hanbee.test`, `demo.s4@hanbee.test` |
| School owner, Sample Academy | `demo.owner2@hanbee.test` |
| Students, Sample Academy (team Sample Speed, payment declared) | `demo.t1@hanbee.test`, `demo.t2@hanbee.test` |
| Solo student | `demo.solo@hanbee.test` |
| Hanbee staff | `jamie@hanbeelms.edu` / `staff123` |
| Manager | `morgan@hanbeelms.edu` / `manager123` |
| Older seeded student | `ava@student.edu` / `student123` |

Existing data: tournament "Hanbee RC Cup 2026" (about three weeks out), team Alpha Racers verified with a result, four demo students enrolled in the course "Intro to Design", one site-wide and one school-only announcement, an automatic student chat group per school. Rerun the seed any time; it reuses what exists.

**Test data etiquette:** the database is shared by every builder and there is no staging copy. Prefer read-only checks. When a test must write (post an announcement, send a chat message, create a team), use a clearly named row such as "TEST portal-<role> <timestamp>" and delete it (or set it back) at the end. Never delete or rename the demo accounts, schools, tournament or teams. Never change a password.

## Testing protocol (every agent)

1. `cd frontend && npx tsc -b --noEmit` must be clean. (Plain `npx tsc --noEmit` checks nothing in this project: the root tsconfig only references the real configs.)
2. Run the app on your assigned port (`npm run dev -- --port <port> --strictPort`) and use each screen in a real browser with the `playwright-skill` (screenshots at 1280px and 390px, read them). Check the empty, error and loading states, not only the happy path.
3. Save a Playwright spec for your area at `frontend/tests/e2e/portal/<area>.spec.ts` covering the golden path plus one refusal (for example a school owner cannot see another school). Use the demo accounts. Run with `--workers=1` and the port you were given (`BASE_URL` or the config's `baseURL`; check `playwright.config.ts`).
4. The database security suites already prove the rules; do not re-prove them, but if a screen shows data it should not, that is a bug to report.

## Handover notes for the redesign

A new skin replaces each `portal/<role>/*Page.tsx` and the kit; the rules, data modules and routes stay. Keep exported page names stable, keep the route map above, and keep calling the `lib` modules so nothing security-relevant moves into the UI.

## Demo data (full)

Run in `supabase/tests` (needs `SUPABASE_DB_URL`): `node seed-demo.mjs` then `node seed-demo-full.mjs` (both idempotent). Password for `@hanbee.test`: `Demo#12345`.

New accounts: `demo.staff2@hanbee.test` (Priya Nair, approved Hanbee staff, invited by the manager), `demo.staffapp@hanbee.test` (Hanbee staff application, unapproved), `demo.owner3@hanbee.test` (owner of "Riverside School (demo)", pending), `demo.invitee1/2@hanbee.test` (pending invitations) and `demo.invitee3` (expired). Existing accounts are unchanged.

Data: courses "RC Car Basics (demo)", "Race Strategy (demo)", "Pit Stop Practice (demo)" (open to apply) with varied student progress, a certificate, two applications waiting and one approved; tournament "Hanbee Winter Cup (demo)" (completed, two results), team "Alpha Sprint" awaiting a decision and draft "Sample Juniors" in the RC Cup; site and school announcements, events, a holiday, tasks for four people; student attendance history; 20 days of Hanbee staff clock history (jamie backdated account start, staff2 too); chat conversations with unread badges for demo.s1 and morgan.

Clean up: `node cleanup-demo.mjs` (dry run, rolls back, prints counts), `--rollback-test` (also proves the rows are gone in the transaction), `--yes` (deletes), `--include-seeded` (also ava, jamie, morgan, "Intro to Design", "Hanbee RC Cup 2026"; final launch clean-up only). Default keeps the RC Cup, Intro to Design, the seeded accounts, `info@hanbee.in`, `hanbeetechnology@gmail.com` and the holiday "Founders' Day".

Browser proof: `cd frontend && DEMO_CONTENT=1 npx playwright test tests/e2e/portal/demo-content.spec.ts --workers=1` (screenshots in `test-results/demo/`).
