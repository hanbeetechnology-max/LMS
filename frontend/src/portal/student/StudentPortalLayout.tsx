import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppShell, type NavItem } from "../../layouts/AppShell";
import {
  AnnouncementIcon,
  AttendanceIcon,
  CoursesIcon,
  DashboardIcon,
  EnrollmentIcon,
  MessagingIcon,
  TrophyIcon,
} from "../../components/landing/icons";
import { useAuth } from "../../lib/AuthProvider";
import { convertToSolo } from "../../lib/portalApi";
import { useToast } from "../../lib/ToastProvider";
import { SlideSwitcher } from "../kit";

function AiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
    </svg>
  );
}

const RC_NAV: NavItem[] = [
  { label: "Overview", to: "/student/rc", Icon: TrophyIcon, end: true },
  { label: "Leaderboard", to: "/student/rc/leaderboard", Icon: DashboardIcon },
  { label: "My team", to: "/student/rc/team", Icon: EnrollmentIcon },
  { label: "Announcements", to: "/student/announcements", Icon: AnnouncementIcon },
  { label: "Chat", to: "/student/chat", Icon: MessagingIcon },
];

const LMS_NAV: NavItem[] = [
  { label: "Overview", to: "/student/lms", Icon: DashboardIcon, end: true },
  { label: "My courses", to: "/student/lms/courses", Icon: CoursesIcon },
  { label: "Attendance", to: "/student/lms/attendance", Icon: AttendanceIcon },
  { label: "AI Assistant", to: "/student/lms/ai", Icon: AiIcon },
  { label: "Announcements", to: "/student/announcements", Icon: AnnouncementIcon },
  { label: "Chat", to: "/student/chat", Icon: MessagingIcon },
];

const TABS = [
  { id: "rc", label: "Tournament" },
  { id: "lms", label: "Learning" },
];

type Side = "rc" | "lms";

function SchoolStateBanner() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const school = profile?.school;
  if (!profile || !school || profile.isSolo) return null;

  const closed = school.status === "closed" || school.memberStatus === "ended";
  const suspended = !closed && school.status === "suspended";
  if (!closed && !suspended) return null;

  async function switchToSolo() {
    setBusy(true);
    const ok = await convertToSolo();
    if (ok) {
      await refreshProfile();
      showToast("You now have a solo account.");
    } else {
      showToast("Could not switch. Please try again in a moment.", "error");
    }
    setBusy(false);
  }

  return (
    <div role="status" className="mt-3 rounded-2xl border border-(--color-amber-deep)/30 bg-(--color-amber-soft) px-4 py-3 text-sm text-(--color-ink)">
      {closed ? (
        <>
          <p className="font-semibold">Your school is no longer active.</p>
          <p className="mt-1 text-(--color-ink-soft)">
            You can keep learning. To take part in the tournament, switch to a solo account or wait for another school to invite you.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void switchToSolo()}
              disabled={busy}
              className="min-h-11 rounded-full bg-(--color-ink) px-5 text-sm font-semibold text-(--color-paper) disabled:opacity-60"
            >
              {busy ? "Switching..." : "Switch to solo account"}
            </button>
            <span className="text-xs text-(--color-slate)">Your record stays under {school.name}.</span>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold">Your school's access is paused.</p>
          <p className="mt-1 text-(--color-ink-soft)">{school.name} is suspended for now. Some features may be unavailable until HANBEE turns it back on.</p>
        </>
      )}
    </div>
  );
}

export function StudentPortalLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastSide = useRef<Side>("rc");

  const path = location.pathname;
  if (path.startsWith("/student/rc")) lastSide.current = "rc";
  else if (path.startsWith("/student/lms") || path.startsWith("/student/courses")) lastSide.current = "lms";
  const side = lastSide.current;

  return (
    <AppShell
      navItems={side === "rc" ? RC_NAV : LMS_NAV}
      settingsPath="/student/settings"
      mainClassName={side === "rc" ? "rc-theme bg-(--color-paper) text-(--color-ink)" : ""}
      topSlot={
        <div>
          <div className="flex justify-center sm:justify-start">
            <SlideSwitcher label="Student area" tabs={TABS} value={side} onChange={(id) => navigate(id === "rc" ? "/student/rc" : "/student/lms")} />
          </div>
          <SchoolStateBanner />
        </div>
      }
    />
  );
}
