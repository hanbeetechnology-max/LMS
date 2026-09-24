# HanbeeLms Security Plan

Rule for everything below: **the server decides, never the browser.** Anything the browser enforces (hidden buttons, URL redirects, disabled inputs) can be bypassed by calling the database directly, so every rule must also exist as a database policy, trigger or function. IDs in URLs are identifiers, not secrets, and are not a security boundary.

Status: `[ ]` todo, `[~]` in progress, `[x]` done and proven live. Each fix is proven by an exploit attempt (impersonated user, rolled back) before and after.

## A. Fix list (solve in this order)

### P0: stop people faking progress
- [x] **S1. Server-checked lesson completion.** DONE 2026-09-24, proven live (10 checks) and through the real browser flow. Confirmed exploit: a student marked all 3 lessons complete by a direct insert with no video, quiz or unlock. Replace the client INSERT on `lesson_completions` with a `complete_lesson(lesson_id)` function that requires: active enrollment in the course, every earlier lesson already complete, and an unlocked submission if the lesson has a quiz. Migration 0019. Update `coursesApi.markLessonComplete` to call it.
- [x] **S2. Enrollment-gated lesson content.** DONE 2026-09-24 (migration 0020). Proven live: anonymous visitors could read all lessons with no login, and non-enrolled students could read lessons and modules; both now see nothing. Enrolled students and staff unaffected; 12 browser tests pass. Today any logged-in user can read every published lesson. Restrict modules, lessons and materials to enrolled students (staff and managers unchanged). The public course catalog stays open.
- [x] **S3. Certificates rest on S1.** DONE: completions can no longer be inserted directly (S1) and `issue_certificate` checks them (0018), so a certificate now requires genuine, server-checked progress. The browser test 'completing a course issues a real, verifiable certificate' passes.

### P1: confidentiality
- [x] **S4. Profiles.** DONE 2026-09-24 (migration 0021), proven live (10 checks): students now read only their own row, approved staff and managers, people they share a conversation with, and classmates who posted in their course. Other students and unapproved staff accounts are hidden. Full browser suite run after the change. Note: 21 unapproved staff accounts exist from test signups and should be cleaned up. Every logged-in user can read every email. Students should see only their own row plus staff names.
- [ ] **S5. Seeded test accounts.** `ava@student.edu` and `jamie@hanbeelms.edu` exist live with passwords that are in the repo's test files. Rotate or remove before real users. Decision needed from the owner (tests log in with them).
- [ ] **S6. Rotate secrets** that were pasted into chat: database password, Gemini API key.
- [ ] **S7. Public application form.** Add rate limit and CAPTCHA to `course_applications`.
- [ ] **S8. AI function origin.** Replace `Access-Control-Allow-Origin: *` with the site's real address; add a shared daily cap.
- [ ] **S9. Private file storage** when lesson uploads are built: private bucket, signed time-limited links.

### P2: hardening
- [ ] **S10. Auth settings.** Email confirmation, stronger passwords, two-step login for staff and managers, CAPTCHA on signup, session length.
- [ ] **S11. Audit log.** Append-only record of role changes, approvals, verifications, completions and certificate issues.
- [ ] **S12. Security tests in CI.** Turn the live impersonation checks into repeatable tests, including "every table has access rules". Needs the staging project.
- [ ] **S13. Web security headers and clean-up.** CSP, HSTS, frame protection on the host; delete the dead `lib/api.ts` and `VITE_API_BASE_URL`.

## B. Types of security checking for this site

| Check | What it finds | Tool or method here | When | State |
|---|---|---|---|---|
| Authorization / access-control testing (IDOR, broken object level auth) | A user reading or changing another user's data, or skipping rules | Impersonated-user queries on the live database (`set local role` + JWT claims), rolled back. Playwright tests that hit URLs and API calls as the wrong role | Every schema change | Done by hand this session; automate in S12 |
| Row Level Security audit | Missing, recursive or over-broad policies | Read every policy, exploit each write path. Supabase dashboard Security Advisor | Every migration | Done once (found 9 issues); repeat after each change |
| Business-logic testing | Cheating the workflow: skipping lessons, forging attendance, certificates | Scripted attempts against each rule (completion, attendance, time entries, certificates, invites) | Every new feature | Ongoing |
| Authentication and session testing | Weak passwords, no lockout, session reuse, role self-promotion | Supabase Auth settings review, manual login abuse tests | Before launch | S10 |
| Input validation and injection testing | SQL/XSS/oversize input | Malformed and oversize payload tests. Check `dangerouslySetInnerHTML` use (announcements render markdown) | Before launch | Todo |
| Static code analysis (SAST) | Insecure code patterns | Semgrep (free) on frontend and Edge Function; ESLint security rules | Every pull request | Todo, S12 |
| Dependency scanning (SCA) | Known-vulnerable packages | `npm audit`, GitHub Dependabot | Weekly and per PR | Todo, S12 |
| Secret scanning | Keys or passwords in code or history | gitleaks, GitHub secret scanning, pre-commit hook | Every commit | Todo, S12 |
| Dynamic scanning (DAST) | Live-site weaknesses | OWASP ZAP baseline scan against staging | Before release | Todo, needs staging |
| Web security headers and TLS | Missing CSP/HSTS, weak TLS | securityheaders.com, Mozilla Observatory, SSL Labs | After deploy | S13 |
| Rate-limit and abuse testing | Spam, quota exhaustion, brute force | Scripted bursts on login, apply form, AI function | Before launch | S7, S8 |
| Privacy and PII review | Who can read emails, phones, ages | Table-by-table data map; check each read policy | Before real users | S4 |
| Configuration review | Wrong CORS, open buckets, weak keys | Checklist of Supabase, Edge Function, hosting settings | Before launch | S8, S9 |
| Penetration test | Chained attacks a checklist misses | Independent tester or bug-bounty style review | Before public launch | Later |
| Threat modeling | Design-level risks | STRIDE walk-through per role (student, staff, manager, anonymous) | Each major feature | Summary in section C |
| Logging, monitoring and backup drills | Attacks going unnoticed; data loss | Audit log (S11), Supabase logs, test a restore | Before launch | S11 |

Reference standards to measure against: OWASP Top 10 and OWASP ASVS for web apps; for privacy, India's DPDP Act (students may be minors, so guardian consent and data minimisation matter).

## C. Threat summary by role

- **Anonymous:** can submit the application form and tournament registration, verify a certificate. Risk: spam, scraping. Controls: S7.
- **Student:** wants to finish courses without doing them, see others' data, mint certificates. Controls: S1, S2, S3, S4.
- **Staff:** wants to inflate hours, invite privileged accounts. Controls: 0017 and 0018 (done), S11.
- **Manager:** highest privilege; account takeover is the worst case. Controls: S10 two-step login, S5.
- **Outsider:** targets secrets and the AI quota. Controls: S6, S8, S12.

## D. Already fixed (proven live)
Payment field trust (0010), messaging recursion (0015), role self-promotion, attendance forgery, certificate forgery (0016), time-entry forgery (0017), thread pin/lock, locked-thread posting, invite forgery and invite role escalation, certificate completion check (0018).


## E. Multi-school enforcement (added 2026-09-24)

Proven by `supabase/tests/rls/` (121 checks across 0023, 0024, 0028):
- [x] **Signup is invite-only in the database.** A stranger, or someone claiming the student role, is refused. Five allowed paths only (see `docs/MULTI_SCHOOL_PLATFORM.md` section 4).
- [x] **Cross-school isolation** for announcements, calendar, enrollments, discussions and profiles.
- [x] **Instant revocation:** suspended or revoked accounts lose staff powers, course content, announcements and lesson completion.
- [x] **Audit log** for privileged actions; clients cannot write it or call `log_audit`.
- [x] **First-verifier-wins** school verification (row locked); a second verifier is told who decided.
- [x] Junk accounts removed (33), including 10 approved staff with test passwords (this closes most of S5; the seeded `ava`, `jamie`, `morgan` accounts remain and must be replaced before launch).
- [ ] Known limit: without email confirmation, an invited email could be claimed by someone who holds the school link and knows that email. Mitigations in place: school sees who joined and can revoke. Real fix: SMTP and email confirmation.
- [ ] One manager only (unique index and recovery procedure) at final production.
