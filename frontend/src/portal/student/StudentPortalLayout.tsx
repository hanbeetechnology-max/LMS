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
import { convertToSolo, joinSchool } from "../../lib/portalApi";
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
  { label: "Reviews", to: "/student/lms/reviews", Icon: EnrollmentIcon },
  { label: "Certificates", to: "/student/lms/certificates", Icon: TrophyIcon },
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

/** Accepts a full /join/<token> link or just the token. */
function extractToken(input: string): string {
  const text = input.trim();
  const match = text.match(/\/join\/([^/?#\s]+)/);
  return (match ? match[1] : text.split(/[?#\s]/)[0]).trim();
}

function SchoolStateBanner() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const school = profile?.school;
  if (!profile || !school || profile.isSolo) return null;

  const closed = school.status === "closed" || school.memberStatus === "ended";
  const suspended = !closed && school.status === "suspended";
  if (!closed && !suspended) return null;

  async function join() {
    const token = extractToken(link);
    if (!token) {
      setMessage({ tone: "error", text: "This school link is not valid." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await joinSchool(token);
    if (res.ok) {
      await refreshProfile();
      showToast(`You joined ${res.schoolName ?? "the new school"}.`);
    } else {
      const raw = (res.error ?? "").toLowerCase();
      const text = raw.includes("invite") || raw.includes("email")
        ? "Your email has not been invited by that school."
        : "This school link is not valid.";
      setMessage({ tone: "error", text });
    }
    setBusy(false);
  }

  async function goSolo() {
    setBusy(true);
    setMessage(null);
    const ok = await convertToSolo();
    if (ok) {
      await refreshProfile();
      showToast("You now have a solo account.");
    } else {
      setMessage({ tone: "error", text: "Could not switch. Please try again in a moment." });
    }
    setBusy(false);
  }

  return (
    <div role="status" className="mt-4 rounded-xl border border-(--color-amber-deep)/30 bg-(--color-amber-soft) p-4 text-sm text-(--color-ink) sm:p-5">
      {closed ? (
        <>
          <p className="font-semibold">Your school is no longer active.</p>
          <p className="mt-1 text-(--color-ink-soft)">
            Your account stays, so paid participation and course progress are not lost, and your record stays under {school.name}. Choose what to do next.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-(--color-line) bg-(--color-card) p-4">
              <p className="font-medium">Join another school</p>
              <label htmlFor="join-link" className="mt-2 block text-xs text-(--color-slate)">
                Invitation link or code from the new school
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                <input
                  id="join-link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://.../join/abc123 or abc123"
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-(--color-line) bg-(--color-card) px-3 text-sm text-(--color-ink)"
                />
                <button
                  type="button"
                  onClick={() => void join()}
                  disabled={busy || !link.trim()}
                  className="min-h-11 rounded-lg bg-(--color-accent) px-5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Working..." : "Join school"}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-(--color-line) bg-(--color-card) p-4">
              <p className="font-medium">Continue as a solo account</p>
              <p className="mt-2 text-xs text-(--color-slate)">You keep your courses and can enter tournaments on your own.</p>
              <button
                type="button"
                onClick={() => void goSolo()}
                disabled={busy}
                className="mt-3 min-h-11 rounded-lg border border-(--color-line) px-5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-canvas) disabled:opacity-60"
              >
                Continue as solo
              </button>
            </div>
          </div>
          {message && (
            <p role={message.tone === "error" ? "alert" : "status"} className={`mt-3 font-medium ${message.tone === "error" ? "text-(--color-error)" : "text-(--color-teal-deep)"}`}>
              {message.text}
            </p>
          )}
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
      topSlot={
        <div>
          <SlideSwitcher label="Student area" tabs={TABS} value={side} onChange={(id) => navigate(id === "rc" ? "/student/rc" : "/student/lms")} />
          <SchoolStateBanner />
        </div>
      }
    />
  );
}
