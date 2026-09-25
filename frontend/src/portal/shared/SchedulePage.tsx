import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/AuthProvider";
import {
  createScopedEvent,
  deleteScopedEvent,
  fetchEventsInRange,
  updateScopedEvent,
  type CalendarEventType,
  type CalendarScope,
  type ScopedCalendarEvent,
} from "../../lib/calendarApi";
import { createHoliday, deleteHoliday, fetchHolidays, type HolidayRow } from "../../lib/holidaysApi";
import { useToast } from "../../lib/ToastProvider";
import { ErrorBlock, LoadingBlock, useAsync } from "../kit";

type View = "week" | "day" | "month";

const H0 = 7;
const H1 = 20; // last visible hour column starts at 20:00
const HOURS = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
const COL = 76; // px per hour column in week view
const LANE = 30;

const TYPE_LABEL: Record<CalendarEventType, string> = { class_session: "Class session", office_hours: "Office hours", other: "Other" };
const SCOPE_LABEL: Record<CalendarScope, string> = { personal: "Personal", school: "School", site: "Site" };
const SCOPE_BLOCK: Record<CalendarScope, string> = {
  personal: "bg-blue-100 border-blue-500 text-blue-900",
  school: "bg-teal-100 border-teal-600 text-teal-900",
  site: "bg-amber-100 border-amber-600 text-amber-900",
};
const SCOPE_CHIP: Record<CalendarScope, string> = {
  personal: "bg-blue-50 text-blue-800 border-blue-200",
  school: "bg-teal-50 text-teal-800 border-teal-200",
  site: "bg-amber-50 text-amber-900 border-amber-200",
};
const HOLIDAY_SCOPE_LABEL = { center: "Everyone", staff: "Staff", students: "Students" } as const;
const ROLE_LABEL: Record<string, string> = { school_staff: "School staff", staff: "Hanbee staff", manager: "Manager" };

const pad = (n: number) => String(n).padStart(2, "0");
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toLocalInput = (d: Date) => `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtDate = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(undefined, o);
const parseIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-(--color-line) bg-(--color-card) px-3 text-sm text-(--color-ink) outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40";
const blueBtn =
  "min-h-11 rounded-lg bg-(--color-accent) px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)";
const ghostBtn =
  "min-h-11 rounded-lg border border-(--color-line) bg-(--color-card) px-3 text-sm font-medium text-(--color-ink) hover:border-(--color-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)";

interface FormValues {
  title: string;
  eventType: CalendarEventType;
  location: string;
  startsAt: string;
  endsAt: string;
  scope: CalendarScope;
}

interface Placed {
  ev: ScopedCalendarEvent;
  s: Date;
  e: Date;
  lane: number;
}

/** Clip events to a day and assign non-overlapping lanes. */
function layoutDay(events: ScopedCalendarEvent[], day: Date): { items: Placed[]; lanes: number } {
  const ds = startOfDay(day).getTime();
  const de = addDays(day, 1).getTime();
  const list = events
    .filter((ev) => new Date(ev.startsAt).getTime() < de && new Date(ev.endsAt).getTime() > ds)
    .map((ev) => ({ ev, s: new Date(Math.max(new Date(ev.startsAt).getTime(), ds)), e: new Date(Math.min(new Date(ev.endsAt).getTime(), de)) }))
    .sort((a, b) => a.s.getTime() - b.s.getTime());
  const laneEnds: number[] = [];
  const items: Placed[] = list.map((x) => {
    let lane = laneEnds.findIndex((end) => end <= x.s.getTime());
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = x.e.getTime();
    return { ...x, lane };
  });
  return { items, lanes: Math.max(1, laneEnds.length) };
}

function hoursFrac(d: Date, day: Date) {
  const h = d.getTime() >= addDays(day, 1).getTime() ? 24 : d.getHours() + d.getMinutes() / 60;
  return Math.min(Math.max(h, H0), H1 + 1) - H0;
}

export function SchedulePage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const today = startOfDay(new Date());
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(today);
  const [pinned, setPinned] = useState(today);
  const [miniMonth, setMiniMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [dialog, setDialog] = useState<null | { mode: "add"; start: Date } | { mode: "edit"; ev: ScopedCalendarEvent }>(null);

  const role = profile?.role;
  const orgId = profile?.school?.memberStatus === "active" ? profile.school.orgId : null;
  const scopes: CalendarScope[] =
    role === "school_staff" ? (orgId ? ["personal", "school"] : ["personal"]) : role === "staff" || role === "manager" ? (["personal", "site"] as CalendarScope[]) : [];
  const canAdd = scopes.length > 0;
  const isManager = role === "manager";
  const isStaffish = role === "staff" || role === "manager" || role === "school_staff";

  // fetch window: visible grid plus mini-month plus next 60 days for Upcoming
  const gridFrom = view === "month" ? startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1)) : view === "week" ? startOfWeek(anchor) : anchor;
  const gridTo = view === "month" ? addDays(gridFrom, 42) : view === "week" ? addDays(gridFrom, 7) : addDays(gridFrom, 1);
  const miniFrom = startOfWeek(miniMonth);
  const from = new Date(Math.min(gridFrom.getTime(), miniFrom.getTime(), today.getTime()));
  const to = new Date(Math.max(gridTo.getTime(), addDays(miniFrom, 42).getTime(), addDays(today, 60).getTime()));
  const events = useAsync(() => fetchEventsInRange(from.toISOString(), to.toISOString()), [from.getTime(), to.getTime()]);
  const holidaysAsync = useAsync(() => fetchHolidays(), []);

  const holidays = useMemo(
    () =>
      (holidaysAsync.data ?? []).filter((h) => (h.scope === "center" ? true : h.scope === "staff" ? isStaffish : role === "student")),
    [holidaysAsync.data, isStaffish, role],
  );
  const evs = events.data ?? [];
  const holidaysOn = (d: Date) => holidays.filter((h) => h.date === iso(d));
  const eventsOn = (d: Date) => layoutDay(evs, d).items.map((p) => p.ev);
  const hasDot = (d: Date) => holidaysOn(d).length > 0 || eventsOn(d).length > 0;

  function canEdit(ev: ScopedCalendarEvent) {
    if (!profile) return false;
    if (ev.scope === "personal") return ev.ownerId === profile.id;
    if (ev.scope === "school") return role === "manager" || role === "staff" || (role === "school_staff" && ev.orgId === orgId);
    return role === "staff" || role === "manager";
  }
  const scopeText = (ev: ScopedCalendarEvent) => (ev.scope === "school" && role === "school_staff" ? "My school" : SCOPE_LABEL[ev.scope]);

  function shift(dir: number) {
    const next = view === "day" ? addDays(anchor, dir) : view === "week" ? addDays(anchor, dir * 7) : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
    setAnchor(next);
    if (view === "day") setPinned(next);
  }
  function goToday() {
    setAnchor(today);
    setPinned(today);
    setMiniMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }
  function pick(d: Date) {
    setPinned(d);
    if (view !== "month") setAnchor(d);
    else setAnchor(new Date(d.getFullYear(), d.getMonth(), 1));
  }
  function openAt(day: Date, hourArg?: number) {
    if (!canAdd) return;
    const hour = hourArg ?? (sameDay(day, today) ? Math.min(Math.max(new Date().getHours() + 1, 9), 22) : 9);
    const s = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0);
    setPinned(startOfDay(day));
    setDialog({ mode: "add", start: s });
  }

  const wkStart = startOfWeek(anchor);
  const heading =
    view === "day"
      ? `Showing ${fmtDate(anchor, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`
      : view === "week"
        ? `Showing week of ${fmtDate(wkStart, { day: "numeric", month: "short" })} to ${fmtDate(addDays(wkStart, 6), { day: "numeric", month: "short", year: "numeric" })}`
        : `Showing ${fmtDate(anchor, { month: "long", year: "numeric" })}`;

  // Upcoming (merged)
  type UpItem = { key: string; date: Date; title: string; chip: string; chipClass: string; when: string; onClick?: () => void };
  const upcoming: UpItem[] = [
    ...evs
      .filter((ev) => new Date(ev.endsAt).getTime() >= Date.now())
      .map((ev) => ({
        key: `e${ev.id}`,
        date: new Date(ev.startsAt),
        title: ev.title,
        chip: scopeText(ev),
        chipClass: SCOPE_CHIP[ev.scope],
        when: `${fmtDate(new Date(ev.startsAt), { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(new Date(ev.startsAt))}`,
        onClick: () => setDialog({ mode: "edit", ev }),
      })),
    ...holidays
      .filter((h) => h.date >= iso(today))
      .map((h) => ({
        key: `h${h.id}`,
        date: parseIso(h.date),
        title: h.name,
        chip: "Holiday",
        chipClass: "bg-rose-50 text-rose-800 border-rose-200",
        when: fmtDate(parseIso(h.date), { weekday: "short", day: "numeric", month: "short" }) + ", all day",
      })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 6);

  // mini calendar
  const miniDays = Array.from({ length: 42 }, (_, i) => addDays(miniFrom, i));

  function Block({ p, style, compact }: { p: Placed; style: React.CSSProperties; compact?: boolean }) {
    return (
      <button
        type="button"
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          setDialog({ mode: "edit", ev: p.ev });
        }}
        aria-label={`${p.ev.title}, ${scopeText(p.ev)}, ${fmtTime(p.s)} to ${fmtTime(p.e)}`}
        className={`absolute z-10 overflow-hidden rounded-md border-l-4 px-1.5 text-left text-xs leading-tight ${SCOPE_BLOCK[p.ev.scope]} focus-visible:outline-2 focus-visible:outline-(--color-accent)`}
      >
        <span className="block truncate font-semibold">{p.ev.title}</span>
        {!compact && (
          <span className="block truncate opacity-80">
            {fmtTime(p.s)} to {fmtTime(p.e)} · {scopeText(p.ev)}
          </span>
        )}
      </button>
    );
  }

  function HolidayBand({ day }: { day: Date }) {
    const hs = holidaysOn(day);
    if (hs.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 pb-1">
        {hs.map((h) => (
          <span key={h.id} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800">
            Holiday: {h.name}
          </span>
        ))}
      </div>
    );
  }

  const headerHours = (
    <div className="flex" style={{ paddingLeft: 96 }}>
      {HOURS.map((h) => (
        <div key={h} style={{ width: COL }} className="shrink-0 border-l border-(--color-line) px-1 py-1.5 text-xs text-(--color-ink-soft)">
          {pad(h)}:00
        </div>
      ))}
    </div>
  );

  function WeekGrid() {
    return (
      <div className="overflow-x-auto rounded-xl border border-(--color-line) bg-(--color-card)" data-testid="week-grid">
        <div style={{ minWidth: 96 + COL * HOURS.length }}>
          <div className="border-b border-(--color-line)">{headerHours}</div>
          {Array.from({ length: 7 }, (_, i) => addDays(wkStart, i)).map((day) => {
            const { items, lanes } = layoutDay(evs, day);
            const isToday = sameDay(day, today);
            return (
              <div key={iso(day)} className={`flex border-b border-(--color-line) last:border-b-0 ${isToday ? "bg-blue-50/60" : ""}`}>
                <div style={{ width: 96 }} className="shrink-0 px-2 py-2">
                  <p className={`text-sm font-semibold ${isToday ? "text-(--color-accent)" : "text-(--color-ink)"}`}>{fmtDate(day, { weekday: "short" })}</p>
                  <p className="text-xs text-(--color-ink-soft)">{fmtDate(day, { day: "numeric", month: "short" })}</p>
                </div>
                <div className="py-1.5">
                  <HolidayBand day={day} />
                  <div className="relative flex" style={{ height: lanes * LANE + 6 }}>
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        disabled={!canAdd}
                        onClick={() => openAt(day, h)}
                        aria-label={`Add event ${fmtDate(day, { weekday: "long", day: "numeric", month: "long" })} at ${pad(h)}:00`}
                        style={{ width: COL }}
                        className={`h-full shrink-0 border-l border-(--color-line) ${canAdd ? "hover:bg-blue-50" : ""} focus-visible:outline-2 focus-visible:outline-(--color-accent)`}
                      />
                    ))}
                    {items.map((p) => {
                      const l = hoursFrac(p.s, day) * COL;
                      const w = Math.max((hoursFrac(p.e, day) - hoursFrac(p.s, day)) * COL, 40);
                      return <Block key={p.ev.id} p={p} style={{ left: l, width: w, top: p.lane * LANE + 3, height: LANE - 4 }} compact />;
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function DayGrid() {
    const { items, lanes } = layoutDay(evs, anchor);
    const HR = 52;
    return (
      <div className="rounded-xl border border-(--color-line) bg-(--color-card) p-3" data-testid="day-grid">
        <HolidayBand day={anchor} />
        <div className="relative" style={{ height: HOURS.length * HR }}>
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              disabled={!canAdd}
              onClick={() => openAt(anchor, h)}
              aria-label={`Add event at ${pad(h)}:00`}
              style={{ height: HR }}
              className={`flex w-full items-start border-t border-(--color-line) pl-14 text-left ${canAdd ? "hover:bg-blue-50" : ""} focus-visible:outline-2 focus-visible:outline-(--color-accent)`}
            >
              <span className="absolute left-0 -mt-0 text-xs text-(--color-ink-soft)" style={{ top: (h - H0) * HR + 4 }}>
                {pad(h)}:00
              </span>
            </button>
          ))}
          {items.map((p) => {
            const top = hoursFrac(p.s, anchor) * HR;
            const height = Math.max((hoursFrac(p.e, anchor) - hoursFrac(p.s, anchor)) * HR, 24);
            const widthPct = 100 / lanes;
            return <Block key={p.ev.id} p={p} style={{ top, height, left: `calc(3.5rem + (100% - 3.5rem) * ${p.lane / lanes})`, width: `calc((100% - 3.5rem) * ${widthPct / 100} - 4px)` }} />;
          })}
        </div>
      </div>
    );
  }

  function MonthGrid() {
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridFrom, i));
    return (
      <div className="overflow-x-auto rounded-xl border border-(--color-line) bg-(--color-card)" data-testid="month-grid">
        <div className="min-w-[40rem]">
          <div className="grid grid-cols-7 border-b border-(--color-line)">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((n) => (
              <p key={n} className="px-2 py-1.5 text-xs font-medium text-(--color-ink-soft)">
                {n}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const hs = holidaysOn(d);
              const list = eventsOn(d);
              const rows = [
                ...hs.map((h) => ({ k: `h${h.id}`, label: `Holiday: ${h.name}`, cls: "bg-rose-50 text-rose-800 border-rose-200", ev: null as ScopedCalendarEvent | null })),
                ...list.map((ev) => ({ k: ev.id, label: ev.title, cls: SCOPE_CHIP[ev.scope], ev })),
              ];
              const isToday = sameDay(d, today);
              return (
                <div
                  key={iso(d)}
                  className={`min-h-28 border-b border-r border-(--color-line) p-1 ${d.getMonth() === anchor.getMonth() ? "" : "opacity-50"} ${isToday ? "bg-blue-50/60" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPinned(d);
                    }}
                    onDoubleClick={() => openAt(d)}
                    aria-label={`Pin ${fmtDate(d, { weekday: "long", day: "numeric", month: "long" })}`}
                    className={`mb-1 min-h-7 min-w-7 rounded-full px-1.5 text-xs ${isToday ? "bg-(--color-accent) font-bold text-white" : sameDay(d, pinned) ? "border border-(--color-accent)" : "text-(--color-ink-soft)"}`}
                  >
                    {d.getDate()}
                  </button>
                  {rows.slice(0, 3).map((r) => (
                    <button
                      key={r.k}
                      type="button"
                      onClick={() => (r.ev ? setDialog({ mode: "edit", ev: r.ev }) : setPinned(d))}
                      className={`mb-0.5 block w-full truncate rounded border px-1 text-left text-xs ${r.cls}`}
                    >
                      {r.label}
                    </button>
                  ))}
                  {rows.length > 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAnchor(d);
                        setPinned(d);
                        setView("day");
                      }}
                      className="text-xs text-(--color-accent) underline"
                    >
                      +{rows.length - 3} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-1 rounded-2xl bg-(--color-canvas) p-1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-(--color-ink)">Schedule</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Schedule view" className="inline-flex rounded-full bg-neutral-200 p-1">
            {(["week", "day", "month"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => {
                  setView(v);
                  if (v === "day") setAnchor(pinned);
                }}
                className={`min-h-9 rounded-full px-4 text-sm font-medium capitalize ${view === v ? "bg-black text-white" : "text-(--color-ink)"} focus-visible:outline-2 focus-visible:outline-(--color-accent)`}
              >
                {v}
              </button>
            ))}
          </div>
          <button type="button" className={ghostBtn} onClick={() => shift(-1)} aria-label={`Previous ${view}`}>
            ‹
          </button>
          <button type="button" className={ghostBtn} onClick={goToday}>
            Today
          </button>
          <button type="button" className={ghostBtn} onClick={() => shift(1)} aria-label={`Next ${view}`}>
            ›
          </button>
          {(canAdd || isManager) && (
            <button type="button" className={blueBtn} onClick={() => openAt(pinned)}>
              + Add
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="grid content-start gap-4">
          <div className="rounded-xl border border-(--color-line) bg-(--color-card) p-4">
            <p className="font-semibold text-(--color-ink)">{profile?.fullName ?? ""}</p>
            <p className="text-sm text-(--color-ink-soft)">{ROLE_LABEL[role ?? ""] ?? ""}</p>
            <div className="mt-4 flex items-center justify-between">
              <button type="button" className="min-h-11 min-w-11 rounded-lg hover:bg-neutral-100" aria-label="Previous month" onClick={() => setMiniMonth(new Date(miniMonth.getFullYear(), miniMonth.getMonth() - 1, 1))}>
                ‹
              </button>
              <p className="text-sm font-semibold text-(--color-ink)" aria-live="polite">
                {fmtDate(miniMonth, { month: "long", year: "numeric" })}
              </p>
              <button type="button" className="min-h-11 min-w-11 rounded-lg hover:bg-neutral-100" aria-label="Next month" onClick={() => setMiniMonth(new Date(miniMonth.getFullYear(), miniMonth.getMonth() + 1, 1))}>
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-(--color-ink-soft)" data-testid="mini-calendar">
              {["M", "T", "W", "T", "F", "S", "S"].map((n, i) => (
                <span key={i} className="py-1">
                  {n}
                </span>
              ))}
              {miniDays.map((d) => {
                const isToday = sameDay(d, today);
                const isPinned = sameDay(d, pinned);
                return (
                  <button
                    key={iso(d)}
                    type="button"
                    onClick={() => pick(d)}
                    aria-label={fmtDate(d, { weekday: "long", day: "numeric", month: "long" })}
                    aria-current={isToday ? "date" : undefined}
                    data-today={isToday ? "true" : undefined}
                    className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                      isToday ? "bg-(--color-accent) font-bold text-white" : isPinned ? "border border-(--color-accent) text-(--color-ink)" : d.getMonth() === miniMonth.getMonth() ? "text-(--color-ink) hover:bg-neutral-100" : "text-neutral-400 hover:bg-neutral-100"
                    }`}
                  >
                    {d.getDate()}
                    {hasDot(d) && <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${isToday ? "bg-white" : "bg-(--color-accent)"}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-(--color-line) bg-(--color-card) p-4">
            <h2 className="font-semibold text-(--color-ink)">My schedule</h2>
            <p className="mb-2 text-xs text-(--color-ink-soft)">Upcoming events</p>
            {upcoming.length === 0 ? (
              <p className="text-sm text-(--color-ink-soft)">No upcoming events scheduled.</p>
            ) : (
              <ul className="grid gap-2" data-testid="upcoming">
                {upcoming.map((u) => (
                  <li key={u.key} className="text-sm">
                    <button type="button" disabled={!u.onClick} onClick={u.onClick} className="w-full text-left disabled:cursor-default">
                      <span className="block font-medium text-(--color-ink)">{u.title}</span>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-(--color-ink-soft)">
                        {u.when}
                        <span className={`rounded-full border px-2 py-0.5 ${u.chipClass}`}>{u.chip}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-(--color-ink)" aria-live="polite" data-testid="range-heading">
              {heading}
            </p>
            <span className="rounded-full border border-(--color-line) bg-(--color-card) px-3 py-1 text-xs text-(--color-ink-soft)">
              Pinned date: {fmtDate(pinned, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
            {canAdd && (
              <button type="button" className={`${blueBtn} ml-auto`} onClick={() => openAt(pinned)}>
                Add event for {fmtDate(pinned, { day: "numeric", month: "short" })}
              </button>
            )}
          </div>
          <ul className="mb-3 flex flex-wrap gap-2 text-xs text-(--color-ink-soft)" aria-label="Legend">
            {(["personal", "school", "site"] as CalendarScope[]).map((s) => (
              <li key={s} className={`rounded-full border px-2 py-0.5 ${SCOPE_CHIP[s]}`}>
                {SCOPE_LABEL[s]}
              </li>
            ))}
            <li className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-800">Holiday</li>
          </ul>
          {events.loading && !events.data ? (
            <LoadingBlock />
          ) : events.error ? (
            <ErrorBlock onRetry={events.reload} />
          ) : view === "week" ? (
            <WeekGrid />
          ) : view === "day" ? (
            <DayGrid />
          ) : (
            <MonthGrid />
          )}
        </section>
      </div>

      {dialog && (
        <EventDialog
          key={dialog.mode === "edit" ? dialog.ev.id : "new"}
          dialog={dialog}
          scopes={scopes}
          orgId={orgId}
          isManager={isManager}
          canAdd={canAdd}
          canEdit={dialog.mode === "edit" ? canEdit(dialog.ev) : true}
          holidays={holidaysAsync.data ?? []}
          pinned={pinned}
          onClose={() => setDialog(null)}
          onChanged={(msg) => {
            showToast(msg);
            setDialog(null);
            events.reload();
            holidaysAsync.reload();
          }}
          onHolidayChanged={(msg) => {
            showToast(msg);
            holidaysAsync.reload();
          }}
          onError={(msg) => showToast(msg, "error")}
        />
      )}
    </div>
  );
}

function EventDialog({
  dialog,
  scopes,
  orgId,
  isManager,
  canAdd,
  canEdit,
  holidays,
  pinned,
  onClose,
  onChanged,
  onHolidayChanged,
  onError,
}: {
  dialog: { mode: "add"; start: Date } | { mode: "edit"; ev: ScopedCalendarEvent };
  scopes: CalendarScope[];
  orgId: string | null;
  isManager: boolean;
  canAdd: boolean;
  canEdit: boolean;
  holidays: HolidayRow[];
  pinned: Date;
  onClose: () => void;
  onChanged: (msg: string) => void;
  onHolidayChanged: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const editing = dialog.mode === "edit" ? dialog.ev : null;
  const [tab, setTab] = useState<"event" | "holiday">(canAdd || editing ? "event" : "holiday");
  const initial: FormValues = editing
    ? { title: editing.title, eventType: editing.eventType, location: editing.location, startsAt: toLocalInput(new Date(editing.startsAt)), endsAt: toLocalInput(new Date(editing.endsAt)), scope: editing.scope }
    : (() => {
        const s = (dialog as { start: Date }).start;
        return { title: "", eventType: "other" as CalendarEventType, location: "", startsAt: toLocalInput(s), endsAt: toLocalInput(new Date(s.getTime() + 3600000)), scope: scopes[0] ?? "personal" };
      })();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [hName, setHName] = useState("");
  const [hDate, setHDate] = useState(iso(pinned));
  const [hScope, setHScope] = useState<"center" | "staff" | "students">("center");
  const set = <K extends keyof FormValues>(k: K, val: FormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function submit() {
    if (!v.title.trim()) return setErr("Give the event a title.");
    if (!v.startsAt || !v.endsAt) return setErr("Choose a start and an end.");
    if (new Date(v.endsAt) <= new Date(v.startsAt)) return setErr("The end must be after the start.");
    setErr(null);
    setBusy(true);
    try {
      const body = { title: v.title.trim(), eventType: v.eventType, location: v.location.trim(), startsAt: new Date(v.startsAt).toISOString(), endsAt: new Date(v.endsAt).toISOString() };
      if (editing) {
        await updateScopedEvent(editing.id, body);
        onChanged("Event updated.");
      } else {
        await createScopedEvent({ ...body, scope: v.scope, orgId });
        onChanged("Event added.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the event.");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!editing) return;
    try {
      await deleteScopedEvent(editing.id);
      onChanged("Event deleted.");
    } catch (e) {
      setConfirmDel(false);
      setErr(e instanceof Error ? e.message : "Could not delete the event.");
    }
  }

  async function addHoliday() {
    if (!hName.trim() || !hDate) return setErr("Give the holiday a name and a date.");
    setBusy(true);
    const id = await createHoliday(hName.trim(), hDate, hScope);
    setBusy(false);
    if (!id) return setErr("Could not add the holiday.");
    setErr(null);
    setHName("");
    onHolidayChanged("Holiday added.");
  }

  const label = "mb-1 block text-sm font-medium text-(--color-ink)";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit event" : "Add"}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-(--color-card) p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--color-ink)">{editing ? "Event details" : "Add"}</h2>
          <button type="button" className={ghostBtn} onClick={onClose}>
            Close
          </button>
        </div>
        {!editing && isManager && canAdd && (
          <div role="group" aria-label="What to add" className="mb-4 inline-flex rounded-full bg-neutral-200 p-1">
            {(["event", "holiday"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)} className={`min-h-9 rounded-full px-4 text-sm font-medium capitalize ${tab === t ? "bg-black text-white" : ""}`}>
                {t}
              </button>
            ))}
          </div>
        )}

        {tab === "event" ? (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {editing && !canEdit && <p className="text-sm text-(--color-ink-soft) sm:col-span-2">You can view this event but not change it.</p>}
            <div className="sm:col-span-2">
              <label htmlFor="ev-title" className={label}>
                Title
              </label>
              <input id="ev-title" className={inputClass} value={v.title} maxLength={200} disabled={!canEdit} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <label htmlFor="ev-type" className={label}>
                Type
              </label>
              <select id="ev-type" className={inputClass} value={v.eventType} disabled={!canEdit} onChange={(e) => set("eventType", e.target.value as CalendarEventType)}>
                {(Object.keys(TYPE_LABEL) as CalendarEventType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ev-location" className={label}>
                Location
              </label>
              <input id="ev-location" className={inputClass} value={v.location} disabled={!canEdit} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div>
              <label htmlFor="ev-start" className={label}>
                Starts
              </label>
              <input id="ev-start" type="datetime-local" className={inputClass} value={v.startsAt} disabled={!canEdit} onChange={(e) => set("startsAt", e.target.value)} />
            </div>
            <div>
              <label htmlFor="ev-end" className={label}>
                Ends
              </label>
              <input id="ev-end" type="datetime-local" className={inputClass} value={v.endsAt} disabled={!canEdit} onChange={(e) => set("endsAt", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ev-scope" className={label}>
                Who sees it
              </label>
              <select id="ev-scope" className={inputClass} value={v.scope} disabled={!!editing} onChange={(e) => set("scope", e.target.value as CalendarScope)}>
                {(editing ? [editing.scope] : scopes).map((s) => (
                  <option key={s} value={s}>
                    {s === "personal" ? "Only me (personal)" : s === "school" ? "My school" : "Whole site"}
                  </option>
                ))}
              </select>
            </div>
            {err && (
              <p role="alert" className="text-sm text-(--color-error) sm:col-span-2">
                {err}
              </p>
            )}
            {canEdit && (
              <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
                {editing &&
                  (confirmDel ? (
                    <>
                      <span className="text-sm">Delete this event?</span>
                      <button type="button" className="min-h-11 rounded-lg bg-(--color-error) px-4 text-sm font-semibold text-white" onClick={del}>
                        Yes, delete
                      </button>
                      <button type="button" className={ghostBtn} onClick={() => setConfirmDel(false)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button type="button" className={`${ghostBtn} mr-auto text-(--color-error)`} onClick={() => setConfirmDel(true)}>
                      Delete
                    </button>
                  ))}
                <button type="submit" className={blueBtn} disabled={busy}>
                  {busy ? "Saving..." : editing ? "Save changes" : "Add event"}
                </button>
              </div>
            )}
          </form>
        ) : (
          <div className="grid gap-3" data-testid="holiday-form">
            <div>
              <label htmlFor="hol-name" className={label}>
                Holiday name
              </label>
              <input id="hol-name" className={inputClass} value={hName} onChange={(e) => setHName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="hol-date" className={label}>
                Date
              </label>
              <input id="hol-date" type="date" className={inputClass} value={hDate} onChange={(e) => setHDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="hol-scope" className={label}>
                Who it applies to
              </label>
              <select id="hol-scope" className={inputClass} value={hScope} onChange={(e) => setHScope(e.target.value as typeof hScope)}>
                {Object.entries(HOLIDAY_SCOPE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            {err && (
              <p role="alert" className="text-sm text-(--color-error)">
                {err}
              </p>
            )}
            <button type="button" className={blueBtn} disabled={busy} onClick={addHoliday}>
              Add holiday
            </button>
            <h3 className="mt-2 text-sm font-semibold">Existing holidays</h3>
            <ul className="grid max-h-48 gap-1 overflow-y-auto">
              {holidays.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {h.date} · {h.name} ({HOLIDAY_SCOPE_LABEL[h.scope]})
                  </span>
                  <button
                    type="button"
                    className={`${ghostBtn} text-(--color-error)`}
                    aria-label={`Delete holiday ${h.name}`}
                    onClick={async () => ((await deleteHoliday(h.id)) ? onHolidayChanged("Holiday deleted.") : onError("Could not delete the holiday."))}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
