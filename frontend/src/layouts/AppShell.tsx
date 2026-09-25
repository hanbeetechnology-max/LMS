import { type ComponentType, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Logo } from "../components/landing/Logo";
import { BellIcon, SunIcon, MoonIcon, LaptopIcon } from "../components/landing/icons";
import { useAuth } from "../lib/AuthProvider";
import { useAttendanceHeartbeat } from "../lib/useAttendanceHeartbeat";
import { useDismissOnEscape } from "../lib/useDismissOnEscape";
import { useTheme, type ThemePreference } from "../lib/ThemeProvider";
import { STAFF_NOTIFICATIONS, STUDENT_NOTIFICATIONS, MANAGER_NOTIFICATIONS, type Notification } from "../lib/mockNotifications";
import { supabase } from "../lib/supabaseClient";

export interface NavItem {
  label: string;
  to: string;
  Icon: ComponentType;
  /** Only highlight when the path matches exactly (for overview links). */
  end?: boolean;
}

interface AppShellProps {
  navItems: NavItem[];
  settingsPath: string;
  /** Optional bar under the header (e.g. the student side switcher). */
  topSlot?: React.ReactNode;
  /** Optional extra classes for the main content area (e.g. a scoped theme). */
  mainClassName?: string;
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function GlobalSearch({ navItems }: { navItems: NavItem[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = query.trim()
    ? navItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  function go(to: string) {
    navigate(to);
    setQuery("");
    setFocused(false);
  }

  return (
    <div className="relative hidden w-full max-w-xs sm:block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--color-mist)">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery("");
        }}
        placeholder="Search..."
        className="w-full rounded-full border border-(--color-line) bg-(--color-cloud) py-2 pl-9 pr-4 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet) focus:bg-(--color-paper)"
      />
      {focused && query.trim() && (
        <div
          role="listbox"
          className="absolute left-0 top-11 z-40 w-full overflow-hidden rounded-xl border border-(--color-line) bg-(--color-paper) py-1 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.35)]"
        >
          {results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.to}
                type="button"
                onMouseDown={() => go(item.to)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-(--color-ink-soft) transition-colors hover:bg-(--color-cloud)"
              >
                <item.Icon />
                {item.label}
              </button>
            ))
          ) : (
            <p className="px-4 py-2.5 text-sm text-(--color-mist)">No matches for "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: LaptopIcon },
];

function ThemeToggle() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useDismissOnEscape(open, () => setOpen(false), triggerRef);

  const TriggerIcon = resolvedTheme === "dark" ? MoonIcon : SunIcon;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Theme settings"
        className="flex h-11 w-11 items-center justify-center rounded-full text-(--color-ink-soft) transition-colors hover:bg-(--color-cloud)"
      >
        <TriggerIcon />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-11 z-40 w-40 overflow-hidden rounded-xl border border-(--color-line) bg-(--color-paper) py-1 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.35)]"
          >
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setPreference(value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
                  preference === value ? "text-(--color-violet)" : "text-(--color-ink-soft) hover:bg-(--color-cloud)"
                }`}
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NotificationBell() {
  const navigate = useNavigate();
  const { role, authSource, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(
    role === "student" ? STUDENT_NOTIFICATIONS : role === "manager" ? MANAGER_NOTIFICATIONS : STAFF_NOTIFICATIONS,
  );
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useDismissOnEscape(open, () => setOpen(false), triggerRef);

  useEffect(() => {
    if (authSource !== "supabase" || !supabase || !profile) return;
    const client = supabase;
    let cancelled = false;
    client
      .from("notifications")
      .select("id, title, link_to, read, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setNotifications(data.map((item) => ({
          id: item.id,
          title: item.title,
          linkTo: item.link_to,
          read: item.read,
          time: new Date(item.created_at).toLocaleString(),
        })));
      });
    const channel = client
      .channel(`notifications:${profile.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` }, (payload) => {
        const item = payload.new as { id: string; title: string; link_to: string; read: boolean; created_at: string };
        setNotifications((current) => [{ id: item.id, title: item.title, linkTo: item.link_to, read: item.read, time: "Just now" }, ...current].slice(0, 20));
        if ("Notification" in window && Notification.permission === "granted") new Notification(item.title);
      })
      .subscribe();
    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [authSource, profile]);

  function openNotification(notification: Notification) {
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    if (authSource === "supabase" && supabase) void supabase.from("notifications").update({ read: true }).eq("id", notification.id);
    setOpen(false);
    navigate(notification.linkTo);
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (authSource === "supabase" && supabase && profile) void supabase.from("notifications").update({ read: true }).eq("user_id", profile.id);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          // Ask for OS-level notification permission on the first explicit
          // interaction with this feature, not unconditionally on every
          // page load - an unsolicited prompt on mount gets auto-denied by
          // modern browsers, burning the one real chance to ask.
          if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-(--color-ink-soft) transition-colors hover:bg-(--color-cloud)"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-(--color-error) ring-2 ring-(--color-paper)" />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-xl border border-(--color-line) bg-(--color-paper) shadow-[0_20px_45px_-25px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center justify-between border-b border-(--color-line) px-4 py-2.5">
              <p className="text-sm font-semibold text-(--color-ink)">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-(--color-slate) hover:text-(--color-ink)"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-(--color-mist)">You're all caught up.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    onClick={() => openNotification(n)}
                    className="flex w-full items-start gap-2.5 border-b border-(--color-line) px-4 py-3 text-left text-sm transition-colors last:border-0 hover:bg-(--color-cloud)"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-(--color-violet)"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block ${n.read ? "text-(--color-slate)" : "font-medium text-(--color-ink)"}`}>
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-(--color-mist)">{n.time}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProfileMenu({ settingsPath }: { settingsPath: string }) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initial = profile?.fullName.charAt(0).toUpperCase() ?? "?";

  useDismissOnEscape(open, () => setOpen(false), triggerRef);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={profile ? `Account menu for ${profile.fullName}` : "Account menu"}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-(--color-ink) font-mono text-sm font-semibold text-(--color-paper)"
      >
        {initial}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-11 z-40 w-44 overflow-hidden rounded-xl border border-(--color-line) bg-(--color-paper) shadow-[0_20px_45px_-25px_rgba(0,0,0,0.35)]"
          >
            <Link
              to={settingsPath}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block w-full px-4 py-2.5 text-left text-sm text-(--color-ink-soft) transition-colors hover:bg-(--color-cloud)"
            >
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
                navigate("/login");
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-(--color-ink-soft) transition-colors hover:bg-(--color-cloud)"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({ navItems, settingsPath, topSlot, mainClassName = "" }: AppShellProps) {
  useAttendanceHeartbeat();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  useDismissOnEscape(mobileOpen, () => setMobileOpen(false), mobileMenuTriggerRef);
  const activeItem = navItems
    .filter((item) => location.pathname.startsWith(item.to))
    .sort((a, b) => b.to.length - a.to.length)[0];
  // Skip route-param segments (numeric ids, UUIDs) when picking a fallback
  // title, so e.g. /staff/students/1 reads "Students" rather than "1".
  const isIdLikeSegment = (segment: string) =>
    /^\d+$/.test(segment) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
  const fallbackTitle = location.pathname.split("/").filter(Boolean).findLast((segment) => !isIdLikeSegment(segment));
  const pageTitle =
    activeItem?.label ?? (fallbackTitle ? fallbackTitle.charAt(0).toUpperCase() + fallbackTitle.slice(1) : "Dashboard");

  return (
    <div className="flex min-h-screen bg-(--color-canvas)">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-(--color-line) bg-(--color-card) transition-transform duration-300 lg:static lg:translate-x-0 print:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-(--color-line) px-6">
          <Link to="/" aria-label="HanbeeLms home">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-(--color-ink-soft) hover:bg-(--color-cloud) lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4" aria-label="Primary">
          {navItems.map(({ label, to, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "bg-(--color-accent)/10 text-(--color-accent)"
                    : "text-(--color-ink-soft) hover:bg-(--color-canvas)"
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 cursor-default bg-(--color-ink)/40 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-(--color-line) bg-(--color-card) px-4 sm:px-6 print:hidden">
          <div className="flex items-center gap-3">
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-(--color-ink-soft) hover:bg-(--color-cloud) lg:hidden"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            <p className="text-base font-semibold text-(--color-ink)">{pageTitle}</p>
          </div>

          <div className="flex flex-1 items-center justify-end gap-4">
            <GlobalSearch navItems={navItems} />
            <ThemeToggle />
            <NotificationBell />
            <ProfileMenu settingsPath={settingsPath} />
          </div>
        </header>

        {topSlot && <div className="px-4 pt-5 sm:px-6 lg:px-10 print:hidden">{topSlot}</div>}

        <main className={`flex-1 px-4 py-6 sm:px-6 lg:px-10 ${mainClassName}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
