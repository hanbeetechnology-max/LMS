import { useState } from "react";
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
import { useToast } from "../../lib/ToastProvider";
import { Badge, Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader, SlideSwitcher, formatTime, useAsync, type BadgeTone } from "../kit";

type View = "day" | "week" | "month";

const TYPE_LABEL: Record<CalendarEventType, string> = { class_session: "Class session", office_hours: "Office hours", other: "Other" };
const SCOPE_LABEL: Record<CalendarScope, string> = { personal: "Personal", school: "My school", site: "Whole site" };
const SCOPE_TONE: Record<CalendarScope, BadgeTone> = { personal: "info", school: "good", site: "warn" };
const SCOPE_BAR: Record<CalendarScope, string> = {
  personal: "border-l-(--color-violet)",
  school: "border-l-(--color-teal-deep)",
  site: "border-l-(--color-amber-deep)",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toLocalInput(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rangeFor(view: View, anchor: Date): { from: Date; to: Date } {
  if (view === "day") return { from: startOfDay(anchor), to: addDays(startOfDay(anchor), 1) };
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 7) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const from = startOfWeek(first);
  return { from, to: addDays(from, 42) };
}

function eventsOn(events: ScopedCalendarEvent[], day: Date) {
  const s = startOfDay(day).getTime();
  const e = addDays(startOfDay(day), 1).getTime();
  return events.filter((ev) => new Date(ev.startsAt).getTime() < e && new Date(ev.endsAt).getTime() >= s);
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-(--color-line) bg-(--color-paper) px-3 text-sm text-(--color-ink) outline-none focus:border-(--color-violet) focus-visible:ring-2 focus-visible:ring-(--color-violet)/30";
const primaryBtn =
  "min-h-11 rounded-full bg-(--color-ink) px-5 text-sm font-semibold text-(--color-paper) transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet)";
const ghostBtn =
  "min-h-11 rounded-full border border-(--color-line) px-4 text-sm font-medium text-(--color-ink-soft) transition-colors hover:border-(--color-ink) hover:text-(--color-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-violet)";

interface FormValues {
  title: string;
  eventType: CalendarEventType;
  location: string;
  startsAt: string;
  endsAt: string;
  scope: CalendarScope;
}

function EventForm({
  initial,
  scopes,
  lockScope,
  submitLabel,
  error,
  onCancel,
  onSubmit,
}: {
  initial: FormValues;
  scopes: CalendarScope[];
  lockScope: boolean;
  submitLabel: string;
  error: string | null;
  onCancel: () => void;
  onSubmit: (v: FormValues) => Promise<void>;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const set = <K extends keyof FormValues>(k: K, val: FormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  async function submit() {
    if (!v.title.trim()) return setLocalError("Give the event a title.");
    if (!v.startsAt || !v.endsAt) return setLocalError("Choose a start and an end.");
    if (new Date(v.endsAt) <= new Date(v.startsAt)) return setLocalError("The end must be after the start.");
    setLocalError(null);
    setBusy(true);
    try {
      await onSubmit({ ...v, title: v.title.trim(), location: v.location.trim() });
    } finally {
      setBusy(false);
    }
  }

  const shown = localError ?? error;
  return (
    <Card className="mb-6">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="sm:col-span-2">
          <label htmlFor="ev-title" className="mb-1 block text-sm font-medium text-(--color-ink)">
            Title
          </label>
          <input id="ev-title" className={inputClass} value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />
        </div>
        <div>
          <label htmlFor="ev-type" className="mb-1 block text-sm font-medium text-(--color-ink)">
            Type
          </label>
          <select id="ev-type" className={inputClass} value={v.eventType} onChange={(e) => set("eventType", e.target.value as CalendarEventType)}>
            {(Object.keys(TYPE_LABEL) as CalendarEventType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ev-location" className="mb-1 block text-sm font-medium text-(--color-ink)">
            Location
          </label>
          <input id="ev-location" className={inputClass} value={v.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div>
          <label htmlFor="ev-start" className="mb-1 block text-sm font-medium text-(--color-ink)">
            Starts
          </label>
          <input id="ev-start" type="datetime-local" className={inputClass} value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </div>
        <div>
          <label htmlFor="ev-end" className="mb-1 block text-sm font-medium text-(--color-ink)">
            Ends
          </label>
          <input id="ev-end" type="datetime-local" className={inputClass} value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </div>
        <div>
          <label htmlFor="ev-scope" className="mb-1 block text-sm font-medium text-(--color-ink)">
            Who sees it
          </label>
          <select id="ev-scope" className={inputClass} value={v.scope} disabled={lockScope} onChange={(e) => set("scope", e.target.value as CalendarScope)}>
            {scopes.map((s) => (
              <option key={s} value={s}>
                {s === "personal" ? "Only me (personal)" : s === "school" ? "My school" : "Whole site"}
              </option>
            ))}
          </select>
        </div>
        {shown && (
          <p role="alert" className="text-sm text-(--color-error) sm:col-span-2">
            {shown}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
          <button type="button" className={ghostBtn} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </Card>
  );
}

export function SchedulePage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ScopedCalendarEvent | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const role = profile?.role;
  const orgId = profile?.school?.memberStatus === "active" ? profile.school.orgId : null;
  const scopes: CalendarScope[] =
    role === "school_staff" ? (orgId ? ["personal", "school"] : ["personal"]) : role === "staff" || role === "manager" ? ["personal", "site"] : [];
  const canAdd = scopes.length > 0;

  const { from, to } = rangeFor(view, anchor);
  const events = useAsync(() => fetchEventsInRange(from.toISOString(), to.toISOString()), [view, anchor.getTime()]);
  const today = startOfDay(new Date());

  function canEdit(ev: ScopedCalendarEvent) {
    if (!profile) return false;
    if (ev.scope === "personal") return ev.ownerId === profile.id;
    if (ev.scope === "school") return role === "manager" || role === "staff" || (role === "school_staff" && ev.orgId === orgId);
    return role === "staff" || role === "manager";
  }

  function scopeLabel(ev: ScopedCalendarEvent) {
    if (ev.scope === "school") return role === "school_staff" ? "My school" : "School";
    return SCOPE_LABEL[ev.scope];
  }

  function shift(dir: number) {
    if (view === "day") setAnchor(addDays(anchor, dir));
    else if (view === "week") setAnchor(addDays(anchor, dir * 7));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
  }

  const heading =
    view === "day"
      ? anchor.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : view === "week"
        ? `${from.toLocaleDateString(undefined, { day: "numeric", month: "short" })} to ${addDays(from, 6).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
        : anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function openAdd() {
    const start = new Date(anchor);
    start.setHours(anchor.getTime() === today.getTime() ? Math.max(new Date().getHours() + 1, 8) : 9, 0, 0, 0);
    setEditing(null);
    setFormError(null);
    setAdding(true);
  }

  async function create(v: FormValues) {
    try {
      await createScopedEvent({
        title: v.title,
        eventType: v.eventType,
        location: v.location,
        startsAt: new Date(v.startsAt).toISOString(),
        endsAt: new Date(v.endsAt).toISOString(),
        scope: v.scope,
        orgId,
      });
      showToast("Event added.");
      setAdding(false);
      setFormError(null);
      events.reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save the event.");
    }
  }

  async function save(id: string, v: FormValues) {
    try {
      await updateScopedEvent(id, {
        title: v.title,
        eventType: v.eventType,
        location: v.location,
        startsAt: new Date(v.startsAt).toISOString(),
        endsAt: new Date(v.endsAt).toISOString(),
      });
      showToast("Event updated.");
      setEditing(null);
      setFormError(null);
      events.reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save the event.");
    }
  }

  async function remove(ev: ScopedCalendarEvent) {
    try {
      await deleteScopedEvent(ev.id);
      showToast("Event deleted.");
      setConfirmId(null);
      events.reload();
    } catch (e) {
      setConfirmId(null);
      showToast(e instanceof Error ? e.message : "Could not delete the event.", "error");
    }
  }

  function EventCard({ ev }: { ev: ScopedCalendarEvent }) {
    return (
      <div className={`rounded-xl border border-(--color-line) border-l-4 bg-(--color-paper) p-3 ${SCOPE_BAR[ev.scope]}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-(--color-ink)">{ev.title}</p>
          <Badge tone={SCOPE_TONE[ev.scope]}>{scopeLabel(ev)}</Badge>
        </div>
        <p className="mt-1 text-xs text-(--color-slate)">
          {formatTime(ev.startsAt)} to {formatTime(ev.endsAt)} · {TYPE_LABEL[ev.eventType]}
          {ev.location ? ` · ${ev.location}` : ""}
        </p>
        {canEdit(ev) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={ghostBtn}
              onClick={() => {
                setAdding(false);
                setFormError(null);
                setEditing(ev);
              }}
            >
              Edit
            </button>
            {confirmId === ev.id ? (
              <>
                <span className="text-sm text-(--color-ink)">Delete this event?</span>
                <button type="button" className="min-h-11 rounded-full bg-(--color-error) px-4 text-sm font-semibold text-(--color-paper)" onClick={() => remove(ev)}>
                  Yes, delete
                </button>
                <button type="button" className={ghostBtn} onClick={() => setConfirmId(null)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" className={`${ghostBtn} text-(--color-error)`} onClick={() => setConfirmId(ev.id)}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  function DayColumn({ day, showHeading }: { day: Date; showHeading: boolean }) {
    const list = eventsOn(events.data ?? [], day);
    const isToday = sameDay(day, today);
    return (
      <div className={`rounded-2xl border p-3 ${isToday ? "border-(--color-violet) bg-(--color-violet-soft)" : "border-(--color-line)"}`}>
        {showHeading && (
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.1em] text-(--color-slate)">
            {day.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
            {isToday ? " (today)" : ""}
          </p>
        )}
        {list.length === 0 ? <p className="text-sm text-(--color-mist)">Nothing scheduled.</p> : <div className="grid gap-2">{list.map((ev) => <EventCard key={ev.id} ev={ev} />)}</div>}
      </div>
    );
  }

  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  const editorInitial = (ev: ScopedCalendarEvent): FormValues => ({
    title: ev.title,
    eventType: ev.eventType,
    location: ev.location,
    startsAt: toLocalInput(ev.startsAt),
    endsAt: toLocalInput(ev.endsAt),
    scope: ev.scope,
  });
  const newInitial = (): FormValues => {
    const s = new Date(anchor);
    s.setHours(9, 0, 0, 0);
    const e = new Date(s);
    e.setHours(10);
    return { title: "", eventType: "other", location: "", startsAt: toLocalInput(s), endsAt: toLocalInput(e), scope: scopes[0] };
  };

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle={canAdd ? "Classes, office hours and events." : "Upcoming classes and events."}
        actions={
          canAdd && !adding ? (
            <button type="button" className={primaryBtn} onClick={openAdd}>
              Add event
            </button>
          ) : undefined
        }
      />

      {adding && <EventForm initial={newInitial()} scopes={scopes} lockScope={false} submitLabel="Add event" error={formError} onCancel={() => setAdding(false)} onSubmit={create} />}
      {editing && (
        <EventForm
          key={editing.id}
          initial={editorInitial(editing)}
          scopes={[editing.scope]}
          lockScope
          submitLabel="Save changes"
          error={formError}
          onCancel={() => setEditing(null)}
          onSubmit={(v) => save(editing.id, v)}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SlideSwitcher
          label="Schedule view"
          value={view}
          onChange={(id) => setView(id as View)}
          tabs={[
            { id: "day", label: "Day" },
            { id: "week", label: "Week" },
            { id: "month", label: "Month" },
          ]}
        />
        <div className="flex items-center gap-2">
          <button type="button" className={ghostBtn} onClick={() => shift(-1)} aria-label="Previous">
            Previous
          </button>
          <button type="button" className={ghostBtn} onClick={() => setAnchor(startOfDay(new Date()))}>
            Today
          </button>
          <button type="button" className={ghostBtn} onClick={() => shift(1)} aria-label="Next">
            Next
          </button>
        </div>
      </div>
      <p className="mb-3 font-display text-lg font-semibold text-(--color-ink)" aria-live="polite">
        {heading}
      </p>
      <p className="mb-4 text-xs text-(--color-slate)">Colour bar and label show who sees an event: violet is personal, teal is your school, amber is the whole site.</p>

      {events.loading && !events.data ? (
        <LoadingBlock />
      ) : events.error ? (
        <ErrorBlock onRetry={events.reload} />
      ) : view === "day" ? (
        (events.data ?? []).length === 0 ? <EmptyState title="Nothing on this day" body="Events you add will appear here." /> : <DayColumn day={anchor} showHeading={false} />
      ) : view === "week" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => (
            <DayColumn key={d.toISOString()} day={d} showHeading />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[42rem] grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((n) => (
              <p key={n} className="px-1 pb-1 font-mono text-xs uppercase text-(--color-slate)">
                {n}
              </p>
            ))}
            {monthDays.map((d) => {
              const list = eventsOn(events.data ?? [], d);
              const inMonth = d.getMonth() === anchor.getMonth();
              const isToday = sameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    setAnchor(startOfDay(d));
                    setView("day");
                  }}
                  aria-label={`${d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}, ${list.length} events`}
                  className={`min-h-24 rounded-lg border p-1.5 text-left align-top transition-colors hover:border-(--color-ink) ${
                    isToday ? "border-(--color-violet) bg-(--color-violet-soft)" : "border-(--color-line)"
                  } ${inMonth ? "" : "opacity-50"}`}
                >
                  <span className={`text-xs ${isToday ? "font-bold text-(--color-violet)" : "text-(--color-slate)"}`}>{d.getDate()}</span>
                  {list.slice(0, 2).map((ev) => (
                    <span key={ev.id} className={`mt-1 block truncate rounded border-l-4 bg-(--color-cloud) px-1 text-xs text-(--color-ink) ${SCOPE_BAR[ev.scope]}`}>
                      {ev.title}
                    </span>
                  ))}
                  {list.length > 2 && <span className="mt-1 block text-xs text-(--color-slate)">+{list.length - 2} more</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
