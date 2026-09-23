# HanbeeLms — Frontend Design Plan
### A design-system + page-by-page specification, in the spirit of a mature EMS design doc the user shared as a model — adapted to an LMS, not copied

**Status:** HanbeeLms's core product (Staff + Student, two roles) is built and running (React 19/Vite/TS/Tailwind v4, frontend-only, mock data — see `docs/PLAN.md` for the full as-built changelog, §10.1–§10.25). This document formalizes the existing design system as a real reference (§1–§10) and specs three new features from a pasted "RC Training Center" PRD the user asked to fold in — a **Manager** role, a real **roll-number verification workflow**, and a **Holidays** calendar (§14, Phases A–D). **All four phases (A–D) are now implemented and verified** — see `docs/PLAN.md` §10.26 (Phase A) and §10.27 (Phases B–D) for the as-built detail. This document remains the design reference going forward for any future work in this area.

**Relationship to `docs/PLAN.md`:** that file remains the as-built changelog (what shipped, when, why) — this document is the design reference (what the system *is* and what's coming next). Don't merge them.

**What this is *not*:** a copy of a corporate EMS's plan. HanbeeLms has no org chart, no 5,000-row virtualization story, no Students-as-a-sub-population module (here, students *are* the primary user), no separate Chat/Schedule modules (Messages and Calendar already cover those). Explicit out-of-scope list is in §15.

---

## Table of Contents

1. [Product Vision & Design Principles](#1-product-vision--design-principles)
2. [Roles & Permissions](#2-roles--permissions)
3. [Information Architecture](#3-information-architecture)
4. [Design System](#4-design-system)
5. [Global Shell](#5-global-shell)
6. [Page-by-Page Specifications](#6-page-by-page-specifications)
7. [Motion Catalogue](#7-motion-catalogue)
8. [Content & Voice Guidelines](#8-content--voice-guidelines)
9. [Accessibility Commitments](#9-accessibility-commitments)
10. [Responsive Strategy](#10-responsive-strategy)
11. [Dark Mode](#11-dark-mode)
12. [Scale Considerations](#12-scale-considerations)
13. [Implementation Notes](#13-implementation-notes)
14. [Build Roadmap — Manager Role & PRD Features](#14-build-roadmap--manager-role--prd-features)
15. [Explicitly Out of Scope](#15-explicitly-out-of-scope)
16. [Implementation Status Report](#16-implementation-status-report)

---

## 1. Product Vision & Design Principles

**Vision:** HanbeeLms should feel like the calmest tool in a small training center's day — the place that answers "what's my status, what do I need to do, how's my class doing" without ever feeling like a surveillance system watching staff or students.

This tone isn't aspirational — it's already how the app is written. This session's own content decisions prove it out concretely:

| Principle | Where it's already true in the codebase |
|---|---|
| **Status is stated as fact, never flagged as failure** | `StaffAttendancePage`'s "Late" status uses the same neutral amber pill as every other status — no red alarm styling. `TimeLogTable` labels a late clock-in "Late" in a plain amber pill next to the time, not a warning icon. |
| **Honest data over flattering fabrication** | `StaffRosterPage`'s invited (not-yet-active) students show "—" for attendance/completion, not a fabricated "0%" that would misleadingly imply poor performance ([docs/PLAN.md §10.25](../docs/PLAN.md)). |
| **One glance, then one click** | The Staff Dashboard's Quick Actions row (Take attendance, Post announcement, Invite students, New course, Course inquiries) puts every common next-step one click from login. |
| **Reuse the established pattern, don't invent a new one per page** | Every list-with-actions screen (Roster, Invitations, Inquiries) shares the same `StaggerGroup`/status-pill/row-menu shape. Every history list (Student Attendance, Time Log) shares the same stat-tiles-then-list shape. |
| **No modals — full-page or inline-panel flows only** | Confirmed zero uses of a modal/dialog pattern anywhere in the app. Course creation is a 3-step wizard page; section management is an inline expandable panel on Roster, not a popup. This is a real, deliberate constraint, not an oversight — see §7. |

## 2. Roles & Permissions

Today the app models **two** roles, additive:

- **Student** — the baseline. Views own courses, lessons, attendance, calendar, announcements, discussions, messages.
- **Staff** — adds course/roster/attendance ownership for their own sections, invitations, course inquiries, discussion moderation, and self-service time-clock/performance.

**Current implementation:** `frontend/src/lib/mockAuth.ts` defines `export type Role = "staff" | "student"` and two demo accounts (`jamie@hanbeelms.edu`/staff, `ava@student.edu`/student). `routes/router.tsx`'s `<ProtectedRoute role="staff">`/`<ProtectedRoute role="student">` gate the two route trees.

**Planned third role — Manager** (Phase A, §14): org-wide oversight above Staff, additive per the same pattern:

| Area | Student | Staff | Manager (planned) |
|---|---|---|---|
| Own courses/lessons/attendance/calendar | Full | — | — |
| Own section's Roster/Attendance/Course Editor/Invitations | — | Full | View (any section) |
| Discussions/Announcements (post) | Read + reply | Full (+ moderate) | View (any section) |
| Messages | Full (with staff) | Full (with students) | Full (with staff + students) |
| Own time clock / performance | — | Full | Full |
| **All staff's time logs/performance** (`/manager/staff`) | — | — | Full |
| **Verification inbox** (`/manager/verifications`) | — | — | Full — supersedes Staff's read-only view of `/staff/inquiries` for the *verify-and-generate-roll-no* action specifically |
| **Holidays** (`/manager/holidays`) | View own | View own | Full (create/edit/delete, both scopes) |
| Course inquiries (initial triage: mark contacted/decline) | — | Full (unchanged) | Full |

This is a real auth/routing change, not just a new page — `Role` grows to `"staff" | "student" | "manager"`, `ProtectedRoute` needs a manager case, and `mockAuth.ts` needs a third demo account. Flagged as Phase A's first task in §14.

## 3. Information Architecture

**Current route tree** (from `frontend/src/routes/router.tsx`, verified against the live file):

```text
HanbeeLms
├── /                          (marketing landing page)
├── /login, /signup, /reset-password, /accept-invite
├── /apply                     (public course-interest form)
├── /about, /contact, /privacy, /terms
├── /not-authorized
├── /staff                     (ProtectedRoute role="staff")
│   ├── /staff/dashboard
│   ├── /staff/courses, /staff/courses/new, /staff/courses/:id/edit
│   ├── /staff/roster
│   ├── /staff/students/:studentId
│   ├── /staff/invitations
│   ├── /staff/inquiries
│   ├── /staff/performance
│   ├── /staff/attendance
│   ├── /staff/calendar
│   ├── /staff/announcements
│   ├── /staff/forums
│   ├── /staff/messages
│   └── /staff/settings
└── /student                   (ProtectedRoute role="student")
    ├── /student/dashboard
    ├── /student/courses, /student/courses/:id/lessons/:lessonId
    ├── /student/enrollments
    ├── /student/attendance
    ├── /student/calendar
    ├── /student/announcements
    ├── /student/forums
    ├── /student/messages
    └── /student/settings
```

**Planned addition — `/manager`** (Phase A–D, §14):

```text
/manager                        (ProtectedRoute role="manager")
├── /manager/dashboard          (Phase A/B)
├── /manager/verifications      (Phase B — roll-no verification inbox)
├── /manager/holidays           (Phase C)
└── /manager/staff              (Phase D — time/performance rollup)
```

Design intent, matching the existing pattern where `StaffLayout`/`StudentLayout` both parameterize the one shared `AppShell` (§5): `ManagerLayout` is a third thin wrapper passing its own `navItems`, not a shell rewrite.

## 4. Design System

Everything below is transcribed from the live codebase, not invented — this section is a reference, not a redesign.

### 4.1 Color tokens (`frontend/src/index.css`)

| Token | Value (OKLCH) | Usage |
|---|---|---|
| `--color-ink` | `oklch(0.16 0.012 265)` | Primary text, primary buttons |
| `--color-ink-soft` | `oklch(0.32 0.014 265)` | Secondary headings, body-strong text |
| `--color-slate` | `oklch(0.48 0.014 265)` | Body copy, descriptions |
| `--color-mist` | `oklch(0.54 0.012 265)` | Captions, timestamps, meta text |
| `--color-paper` | `oklch(0.99 0.002 265)` | Page/card background |
| `--color-cloud` | `oklch(0.965 0.004 265)` | Sunken panels, table header rows, hover states |
| `--color-line` | `oklch(0.16 0.012 265 / 0.08)` | Borders, dividers |
| `--color-violet` (+`-soft`/`-deep`) | `oklch(0.55 0.21 288)` | Primary brand accent — staff/active nav, primary icons |
| `--color-teal` (+`-soft`/`-deep`) | `oklch(0.72 0.13 175)` | Positive/success — present, published, on-time, completed |
| `--color-amber` (+`-soft`/`-deep`) | `oklch(0.8 0.15 85)` | Caution/pending — late, draft, pending status |
| `--color-error` (+`-soft`) | `oklch(0.54 0.19 25)` | Destructive/negative — absent, dropped, delete actions |

**No new color tokens are needed for the Manager-role work in §14.** Verification states map cleanly onto the existing semantic trio: pending = amber, verified = teal, declined = error. This is a deliberate restraint decision, not an oversight — matching the same "reuse before inventing" discipline already applied throughout this project (e.g. this session's roster-category-badge fix moved a color *off* teal rather than adding a new hue, specifically to avoid a collision — see `docs/PLAN.md` §10.23).

### 4.2 Typography

Three families: **Space Grotesk** (display — page titles, headings), **Inter** (body/UI — everything else), **JetBrains Mono** (numeric/timestamps — clock times, roll numbers, IDs). Scale in actual use:

| Style | Class pattern | Used for |
|---|---|---|
| Page title | `font-display text-2xl font-semibold tracking-tight` | Every page's `<h2>` |
| Section heading | `font-display text-lg font-semibold` | Card/panel titles |
| Stat number | `font-display text-2xl`–`text-3xl font-semibold`, via `CountUp` | Dashboard/Performance stat tiles |
| Body | `text-[15px]` / `text-sm` | Descriptions, list rows |
| Meta/caption | `text-xs text-(--color-mist)` | Timestamps, helper text |
| Mono | `font-mono text-xs`/`text-sm` | Roll numbers, avatar initials, clock times, IDs |

### 4.3 Spacing, radius, motion

- Cards: `rounded-2xl border border-(--color-line)`, consistently, everywhere.
- Pills/badges: `rounded-full px-2.5 py-0.5 text-xs font-medium`.
- Standard easing: `EASE_OUT_STRONG = [0.16, 1, 0.3, 1]`, used identically across every animated component.
- Entrance primitives (`components/ui/Reveal.tsx`): `Reveal` (single-element fade+offset), `StaggerGroup`/`StaggerItem` (list reveals with per-item stagger) — the *only* entrance-animation mechanism in the app. New Manager pages reuse these, not a new animation library.

### 4.4 Icon set (`components/landing/icons.tsx`)

A **closed set** — no external icon library (unlike a typical `lucide-react`-based stack). Every icon is a hand-drawn, self-animating stroke SVG (`motion.path` with `initial`/`animate`, not `variants` — a deliberate choice documented in-file to avoid a variant-propagation bug). Current inventory: `CoursesIcon`, `EnrollmentIcon`, `AttendanceIcon`, `SchedulingIcon`, `AnnouncementIcon`, `DashboardIcon`, `DiscussionIcon` (redesigned this session — a threaded-list glyph, deliberately *not* a speech bubble, to stay visually distinct from `MessagingIcon`), `MessagingIcon`, `UploadIcon`, `FileIcon`, `ClockIcon`, `BellIcon`. No new icon is needed for Manager/Verification/Holidays — `EnrollmentIcon` (verification = an enrollment-adjacent action), `SchedulingIcon` (holidays = calendar-adjacent), and `DashboardIcon` cover the new nav items.

### 4.5 Component library (what's real today)

| Component | File | Role |
|---|---|---|
| `TextField` | `components/ui/TextField.tsx` | Labeled input with inline error |
| `FilterBar` | `components/ui/FilterBar.tsx` | Multi-group chip filter (new this session) — one consistent selection style across all groups |
| `Reveal`/`StaggerGroup`/`StaggerItem` | `components/ui/Reveal.tsx` | Entrance animation |
| `CountUp` | `components/ui/CountUp.tsx` | Animated stat numbers |
| Toast | `lib/ToastProvider.tsx` (`useToast()`) | Transient confirmation |
| `MessagesInbox` | `components/app/MessagesInbox.tsx` | Role-aware two-pane inbox (staff/student conversation sets) |
| `DiscussionForums` | `components/app/DiscussionForums.tsx` | Thread list + detail, `canModerate` prop |
| `CalendarAgenda` | `components/app/CalendarAgenda.tsx` | Grouped agenda list, `canCreateEvents` prop |
| `TimeLogTable` | `components/app/TimeLogTable.tsx` | Day-by-day clock-in/out log with status pill |
| `NotificationBell` | in `layouts/AppShell.tsx` | Topbar dropdown, role-aware notification list |
| Section-management inline panel | `StaffRosterPage.tsx`'s `SectionsPanel` | Toggle-open inline CRUD panel — the established "no modal" pattern for admin-ish actions |

### 4.6 New primitives for Phase B/C only (per user's explicit scoping decision)

Two net-new components, used **only** on the Verification Inbox and Holidays pages — not retrofitted onto Roster, Course Editor, Settings, or any other existing page:

- **`UndoToast`** — extends the existing `ToastProvider` with an optional action button and a longer 7-second hold. Holds the pre-action snapshot in the calling page's own local state (not a new global store — see §14's architecture note) and reverts it if "Undo" is clicked before the window closes.
- **`InlineEditText`/`InlineEditSelect`** — a text/select that renders as plain styled text until clicked/focused, then becomes an editable field, committing on blur/Enter. Used on the Verification Inbox's applicant-detail review and the Holidays modal's quick edits.

Both are plain React state + existing Tailwind conventions — no new dependency.

## 5. Global Shell

`layouts/AppShell.tsx` — the shared frame for every authenticated page, parameterized by a `navItems` array so `StaffLayout`/`StudentLayout` don't duplicate sidebar/topbar code:

- Fixed left sidebar (off-canvas below `lg`, toggled via `mobileOpen`), persistent topbar.
- Topbar: page-title fallback (with the `isIdLikeSegment()` fix so `/staff/students/1` reads "Students," not "1"), `GlobalSearch` (fuzzy nav search), `NotificationBell` (role-aware, added this session), `ProfileMenu`.
- Active nav item styled `bg-(--color-ink) text-(--color-paper)`.

**Planned: `ManagerLayout`** — a third thin wrapper passing a Manager-specific `navItems` array (Dashboard, Verifications, Holidays, Staff) to the same `AppShell`. No shell code changes required.

## 6. Page-by-Page Specifications

### 6.1 Existing pages (built, tested — summarized, not re-designed)

Each already follows the schema below in practice; full detail lives in `docs/PLAN.md`'s per-round sections. Listed here for completeness of the design reference:

| Page | Purpose | Key pattern reused |
|---|---|---|
| Staff/Student Dashboard | Greeting + quick actions + stat strip + activity feed | `Reveal`/`StaggerGroup`, `CountUp` |
| Courses (both roles) | Browse/manage courses with status/type/subject filters | `FilterBar` (this session), card/list rows |
| Course Editor / New Course Wizard | Author modules/lessons, content-type-aware editing | 3-step wizard, no-modal full-page flow |
| Roster | Manage section membership, CRUD sections | `SectionsPanel` inline panel, roll-no column (this session) |
| Attendance (staff mark / student view) | Mark or view session attendance | Roster-sourced student list (single source of truth, this session's fix) |
| Calendar | Agenda-style upcoming events | `CalendarAgenda`, grouped by Today/Tomorrow/This week |
| Announcements | Feed + composer | Pinned-first ordering |
| Discussions | Threaded forum, moderation for staff | `DiscussionForums`, Staff-pill on staff-authored posts (this session) |
| Messages | Role-aware 1:1 inbox | `MessagesInbox`, staff↔students / student↔instructors (this session's fix) |
| Invitations / Inquiries | Send invites / review applicants | List-with-row-actions, `prefillEmail` handoff between the two |
| Performance | Self-service time/task summary | `TimeLogTable`, hours-chart, task list |
| Settings | Profile/password/notifications | Role-aware notification-toggle categories (this session) |
| Student Profile (staff view) | One student's detail record | Aligned table headers, Roll No/Age/Institution/Phone (this session) |
| Apply (public) | Prospective-student interest form | Card course-picker, confirmation panel not a toast |

### 6.2 New pages — full detail (Phase A–D, §14)

#### Manager Dashboard (`/manager/dashboard`)

- **Purpose:** answer "how's the whole center doing today" in one glance — the Manager-scope equivalent of the Staff Dashboard.
- **Layout:** greeting header; org-wide stat strip (active courses across all staff, total students, pending verifications, staff clocked-in-now count) via `CountUp`; an activity feed pulling from the same seeded-notification pattern as `mockNotifications.ts` but org-scoped (new applicant, staff clock-in/out, holiday added).
- **Key components:** reuses the exact Dashboard bento-grid shape already built for Staff — same `StaggerGroup` card grid, same "View all →" link convention.
- **Interactions & motion:** identical to the existing Dashboard's stagger-reveal.
- **States:** zero pending verifications → calm empty note, not a "0" stat that reads as a problem.
- **Responsive:** same grid-collapse behavior as the existing Staff Dashboard (already tested at 390px).

#### Verification Inbox (`/manager/verifications`)

- **Purpose:** evolves `StaffInquiriesPage`'s existing pattern into a real verify-and-enroll workflow, closing the loop the PRD's "roll number auto-generation protocol" describes.
- **Layout:** same list-with-row-actions shape as `StaffInquiriesPage`, but clicking a row opens the applicant's full detail inline (reusing the Age/Institution/Phone fields already added to `Student` this session) with a "Verify & Enroll" primary action.
- **Key components:** `InlineEditText` for any quick corrections to the applicant's details before verifying; on verify, generates `rollNo` in the existing neutral format already established this session (`STU-{year}-{seq}`, continuing the section's highest existing sequence — **not** the PRD's literal "RC-" prefix, since HanbeeLms isn't domain-named RC).
- **Interactions & motion:** "Verify & Enroll" triggers an `UndoToast` ("Student verified — Roll No: STU-2026-014. Undo", 7s) that, if clicked, reverts the enrollment and releases the sequence number back — matching the PRD's stated failsafe, implemented in this page's own local state per the architecture note below.
- **States:** an applicant missing a required field (e.g. no institution) blocks "Verify & Enroll" with an inline validation message, not a silent no-op.
- **Responsive:** stacks to the same single-column detail-below-list pattern as `StaffStudentProfilePage` at 390px.
- **Architecture note:** HanbeeLms has **no single global store** like a Redux/Context "AppContext" — state lives per-page/component plus a handful of shared `lib/mock*.ts` files, a deliberate decision made explicitly earlier this session ("no shared cross-page store... that plumbing would be thrown away the moment real queries land"). This plan **keeps that decision**: the undo logic lives in the Verification Inbox page's own local state, not a new global store.

#### Holidays (`/manager/holidays`)

- **Purpose:** a center-wide holiday calendar, closing the PRD's "Center Calendar" ask.
- **Layout:** a month-grid calendar reusing `CalendarAgenda`'s visual language (extended with click-to-add-holiday), a segmented **Staff Holidays | Student Holidays** toggle above it, and a holiday form (name, date, scope).
- **Key components:** the holiday form's scope field is Staff Only / Students Only / Center-wide. The PRD's "cascade" rule (a Staff Holiday auto-creating a matching Student Holiday for that staff's sections) is implemented as an **explicit checkbox** ("Also close affected sections") rather than an invisible cascade — more honest and testable than silent magic, given there's no real backend to resolve scheduling conflicts.
- **Interactions & motion:** day-cell click opens the add-holiday form inline (no modal, per §7); month navigation crossfades like `StaffAttendanceHistory`-style month switches elsewhere in the app.
- **States:** a day with an existing holiday shows a small colored dot + label; hovering shows the full name.
- **Responsive:** calendar grid keeps its shape down to ~390px with smaller cells, matching the existing tested pattern for the app's other calendar-grid-adjacent screens.

#### Manager — Staff Time & Performance Rollup (`/manager/staff`)

- **Purpose:** org-wide visibility into every staff member's time and performance — the Manager-scope superset of the individual `/staff/performance` page.
- **Layout:** a staff picker (chip row or dropdown) above the **exact same `TimeLogTable` component** already built for the individual Performance page, just rendered per selected staff member — not a new table design.
- **Key components:** `TimeLogTable`, reused verbatim; a compact stat strip per staff member (hours this week, on-time rate, task completion) matching `StaffPerformancePage`'s existing tiles.
- **Interactions & motion:** switching the staff picker crossfades the table content, matching the app's existing tab-switch conventions (e.g. Roster's section tabs).
- **States:** a staff member with no clock history yet shows the same empty-state language pattern used elsewhere ("No time logged yet").
- **Responsive:** table already has a tested mobile-stacking pattern from `StaffPerformancePage`; reused as-is.

## 7. Motion Catalogue

| Trigger | Animation | Notes |
|---|---|---|
| Page/section entrance | `Reveal` — opacity + y-offset | `EASE_OUT_STRONG`, staggered delay per section |
| List reveal | `StaggerGroup`/`StaggerItem` | Used on every list-shaped page (Roster, Invitations, Discussions, Time Log) |
| Toast | Slide/fade in, auto-dismiss | Standard `ToastProvider`; `UndoToast` (new, Phase B) extends the hold to 7s with an action button |
| Filter chip select | Background color transition, 200ms | `FilterBar` |
| Dropdown/menu (Notification bell, Profile menu, Row menu) | Fade + backdrop click-away, `useDismissOnEscape` for keyboard | No modal anywhere in the app — this is the closest thing to an overlay, and it's a lightweight anchored dropdown, not a centered dialog |
| Course wizard / multi-step flows | Full-page navigation between steps, no transition library | Deliberately plain — a wizard is a sequence of real pages, not an animated single-page stepper |

**No `Modal`/`Drawer` component exists or is planned** — every admin-ish action (section CRUD, course creation, the new Verification/Holidays flows) is a full page or an inline expandable panel, consistent with the whole app's established pattern.

## 8. Content & Voice Guidelines

Extracted from real copy decisions already made this session, not invented for this document:

- **Status is fact, not failure.** "Late," "Absent," "Invited" render in the same neutral pill treatment as "Present"/"Active" — never a warning icon or red modal for a routine state.
- **Honesty over flattery.** An invited student shows "—" for attendance, not a misleading "0%." A not-yet-verified applicant shows "Roll no. pending," not a fabricated number.
- **Empty states are calm, specific, and actionable** — e.g. "No students enrolled in this section yet," never a generic blank.
- **Toast copy is brief and specific** — "Ava Chen removed from Intro to Design — Section B.", never "Success."
- **New rule for Phase B/C only:** undo-toast copy follows `"{Action}. [Undo]"` (e.g. "Student verified — Roll No: STU-2026-014. Undo"), 7-second hold, used **only** for the Verification and Holidays flows — not applied to routine saves elsewhere, per the user's explicit scoping decision in §14.

## 9. Accessibility Commitments

Reconciled against real audit work already completed this session (`docs/PLAN.md` §10.14, §10.8), not aspirational claims:

- **Contrast:** a real WCAG AA audit found and fixed genuine failures this session (teal/amber `-deep` variants added specifically for text-on-soft-background contrast) — documented in `docs/PLAN.md` §10.14.
- **Keyboard:** every dropdown/menu (Notification bell, Profile menu, Row menus) uses `useDismissOnEscape` (`lib/useDismissOnEscape.ts`) — Escape closes and returns focus to the trigger. Verified via `tests/e2e/accessibility.spec.ts`.
- **Color-blind safety:** status is never color-only — every status pill pairs color with a text label (e.g. "Late" in amber, not just an amber dot).
- **New pages (Phase A–D) must pass the same bar**: reuse existing accessible primitives (`useDismissOnEscape`, labeled `TextField`, pill+label status) rather than introducing new unaudited patterns.

## 10. Responsive Strategy

The app has a single tested pair of widths — **390px** (mobile) and **1440px** (desktop) — used consistently across every manual verification pass this session (Playwright screenshots at both widths for every new feature). No tablet-specific behavior has ever been needed distinct from "mobile" or "desktop" at this app's complexity. New Manager pages (§14) are held to the same two-width verification standard, not a new breakpoint system.

## 11. Dark Mode

**Built.** What was sketched here as a future pass is now implemented — see `docs/PLAN.md` §10.28 for the as-built detail. Kept as a design reference:

- `--color-paper`/`--color-ink` swap roles (dark background, near-white — not pure-white — text), exactly as sketched.
- `--color-cloud`/`--color-line` are darker, low-opacity variants for sunken panels/borders.
- The violet/teal/amber/error accents get a lightness lift to stay legible against the dark background, following the same "never pure black, elevation via lightness steps" principle the reference EMS doc's own §11 describes.
- Three states — Light / Dark / System — via `lib/ThemeProvider.tsx`, toggled from a new `ThemeToggle` in the `AppShell` topbar, persisted to `localStorage`. "System" defers to `prefers-color-scheme` with no JS involved; an explicit choice sets `data-theme` on `<html>`.
- Because the whole app already referenced `var(--color-*)` tokens rather than hardcoded colors, the entire component tree repaints correctly from the `index.css` token overrides alone — **zero page/component files needed to change**, confirming the token architecture documented in §4 was sound.
- Scoped to the authenticated `AppShell` (Staff/Student/Manager) — no manual toggle on the public marketing/auth pages, though they still inherit the OS-level `prefers-color-scheme` automatically since the CSS applies globally.

## 12. Scale Considerations

Right-sized for what HanbeeLms actually is: a **single small-to-mid training center**, not a 5,000-person organization. Concretely:

- Roster/Attendance/Directory-style lists render tens to low hundreds of rows at most (today's mock data: 7 students, 2 sections) — **no virtualization or server-side pagination is needed**, and none is planned for Phase A–D.
- The Manager role's "all staff" rollup (§6.2) covers a handful of staff members, not thousands — a simple picker/dropdown is sufficient, not a searchable-at-scale directory.
- This is a deliberate, stated scoping decision, not an oversight — revisit only if the product's actual usage pattern changes materially.

## 13. Implementation Notes

No new dependency is required for anything in this plan. Current stack (`frontend/package.json`), all already in use:

| Concern | In use today |
|---|---|
| Framework | React 19 + Vite |
| Routing | react-router-dom v7, `ProtectedRoute` pattern |
| Styling | Tailwind CSS v4, `@theme` tokens in `index.css` |
| Motion | framer-motion (`Reveal`/`Stagger*`, self-animating icons) |
| SEO | `react-helmet-async` (`lib/Seo.tsx`) |
| Icons | closed hand-drawn set, `components/landing/icons.tsx` |

`UndoToast` and `InlineEditText`/`InlineEditSelect` (§4.6) are both plain React state + existing Tailwind conventions.

## 14. Build Roadmap — Manager Role & PRD Features

Phased, each phase independently planned (its own plan-mode pass) and verified (`tsc -b --noEmit`, `npm run test:e2e`, manual Playwright screenshots at 390px/1440px, `docs/PLAN.md` entry) before the next begins — the same discipline every feature this session has followed:

1. **Phase A — Manager role foundation.** Extend `Role` to include `"manager"` in `mockAuth.ts`; add a manager demo account; extend `ProtectedRoute` for the manager case; build `ManagerLayout` (thin `AppShell` wrapper with manager `navItems`); register the `/manager` route tree in `router.tsx` with a placeholder Dashboard. *No verification/holiday logic yet — this phase only makes the role and shell real.*
2. **Phase B — Verification Inbox + roll-no workflow + `UndoToast`.** Build `UndoToast` (extends `ToastProvider`). Build `/manager/verifications`, evolving `StaffInquiriesPage`'s pattern into the real verify-and-generate-roll-no flow described in §6.2.
3. **Phase C — Holidays.** Build `InlineEditText`/`InlineEditSelect`. Build `/manager/holidays` per §6.2.
4. **Phase D — Staff rollup.** Build `/manager/staff`, reusing `TimeLogTable` per §6.2.
5. **Phase E — Documentation.** A `docs/PLAN.md` entry (new §10.26 or later, following the existing numbering) documenting the whole Manager-role addition, matching this session's standing convention.

## 15. Explicitly Out of Scope

Named on purpose, so this plan reads as deliberately scoped:

- **Org chart** — not applicable at this org size.
- **Students-as-a-sub-population module** — not applicable; in HanbeeLms, students are the primary end-user, not a dependent population HR manages.
- **Payroll / Leave / PTO management** — out of scope, consistent with the original app plan's own precedent (`docs/PLAN.md`'s earlier "Deferred Feature Backlog" section).
- **Retrofitting `UndoToast`/inline-edit onto existing pages** (Roster, Course Editor, Settings, etc.) — explicitly scoped to *only* the three new Phase B/C screens, per the user's decision. Existing pages keep their current save-button + confirm-toast pattern.
- **Any Supabase/FastAPI backend work** — still blocked pending the user providing the Supabase project URL, per the standing instruction earlier in this project's history. Everything in this document remains frontend/mock-data-only.

## 16. Implementation Status Report

**What's built today** (full detail in `docs/PLAN.md` §10.1–§10.27): the complete two-role (Staff/Student) frontend — marketing site, auth, both dashboards, course creation/editing, roster + section CRUD, attendance (class + self time-clock), calendar, announcements, discussions, role-aware messaging, invitations, a public apply/inquiry flow, staff performance + time log, notifications, and a settings panel — plus the full third **Manager** role from §14 (Phases A–D): auth/routing/shell, a Verification Inbox with real roll-number generation and an `UndoToast`, a Holidays calendar, and a Staff time/performance rollup. All of it mock-data-driven, fully tested (`tests/e2e/`, `tsc -b --noEmit` clean), and manually verified via Playwright at 390px/1440px.

**What this document adds on top:** a formal design-system reference (§1–§13, describing what already exists) that stays the reference for any future work in this area — no further gap between this document and the codebase as of Phase D's completion.

## 17. Real-World LMS Feature Gap Analysis

Researched against production LMS platforms (Canvas, Moodle, Google Classroom, Schoology) and a 2026 "must-have LMS features" checklist (eLeap's 15-item list: AI personalization, mobile access, advanced reporting, gamification, social/collaborative learning, SCORM/xAPI/LTI interoperability, security/compliance, content authoring, branding, eCommerce, microlearning, certification tracking, blended learning, UX/accessibility, AR/VR-future-tech). The goal here is an honest reconciliation, not a checklist-completion exercise — most of that list targets enterprise/university or course-marketplace LMS products at a different scale and business model than HanbeeLms's single-training-center, staff-run model.

**Already covered by the existing build** (verified against `docs/PLAN.md`, not re-built): course/content management, user management (3 roles), progress tracking (lesson completion, attendance), notifications (in-app bell + settings categories), discussion forums (social/collaborative learning), messaging, mobile-responsive layout (390px verified throughout), dark mode + WCAG-audited accessibility, role-based access control (security).

**Added this round — frontend-only, no scope renegotiation needed:**

- **Sequential lesson locking.** Real LMS platforms (Canvas modules, Moodle "restrict access") gate content until prerequisites are met — a well-established async-learning pattern, not a live/graded feature. Implemented client-side in `StudentLessonViewerPage.tsx`: a lesson beyond the first incomplete one redirects back (`<Navigate replace />`), and the "next" footer link is replaced with a locked, non-clickable label until the current lesson is marked complete.
- **Course completion certificates.** A near-universal LMS feature (Coursera, Udemy, Moodle's Certificate activity) and one that was already sitting in this project's own deferred backlog. Implemented as `StudentCertificatePage.tsx` (`/student/courses/:id/certificate`), reachable once all lessons are complete, with a print-ready layout (`AppShell`'s sidebar/header now carry `print:hidden`, and the certificate card gets a print-specific border) using `window.print()` — "Save as PDF" needs no backend. **Update (§10.34):** now backed by a real, idempotent backend record (`backend/app/routers/certificates.py`) with a public, unauthenticated verification page (`/verify/:certificateId`) — a real employer/third party can confirm it without an account.

**Explicitly NOT added — would reverse this project's standing scope exclusion.** The original plan (`docs/PLAN.md`) states "assignments/quizzes/grading and live video are explicitly excluded from this MVP — async content delivery only." Several eLeap/Canvas-style items fall squarely inside that exclusion and are flagged here rather than silently built:

- **Quizzes / assessments / gradebook** — the biggest gap vs. Canvas/Moodle/Schoology, and also the biggest scope change (needs a question-bank data model, scoring, and a gradebook UI). Deliberately not started.
- **Gamification (badges/leaderboards/points)** — plausible as a frontend-only addition later, but was not requested and adds a points/ranking data model; left for a future explicit ask.
- **AI personalization, eCommerce/monetization, AR/VR** — enterprise/marketplace-LMS features with no clear fit for a single training center's async course delivery; not pursued.
- **SCORM/xAPI/LTI interoperability** — meaningful only once there's a real backend to import/export against; blocked on the same standing Supabase/FastAPI hold as the rest of the backend work.

If the user wants any of the "explicitly not added" items pursued, that's a scope decision to make deliberately (as Manager-role/dark-mode/undo-toast were), not something to infer from a research instruction alone.

**What remains entirely unstarted:** the original `docs/PLAN.md` §6 backend phases (Supabase auth/DB/storage/Realtime, FastAPI reporting service) — this whole project, including everything in this document, is frontend-only against mock data.
