import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal, StaggerGroup, StaggerItem } from "../ui/Reveal";
import { SchedulingIcon } from "../landing/icons";
import { useToast } from "../../lib/ToastProvider";

type EventType = "class_session" | "office_hours" | "other";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  type: EventType;
}

const TYPE_STYLES: Record<EventType, string> = {
  class_session: "bg-(--color-violet-soft) text-(--color-violet)",
  office_hours: "bg-(--color-amber-soft) text-(--color-amber-deep)",
  other: "bg-(--color-cloud) text-(--color-slate)",
};

const TYPE_LABEL: Record<EventType, string> = {
  class_session: "Class",
  office_hours: "Office hours",
  other: "Event",
};

const INITIAL_GROUPS: { group: string; items: CalendarEvent[] }[] = [
  {
    group: "Today",
    items: [
      { id: "e1", title: "Intro to Design — Section B", time: "10:00 – 11:15 AM", location: "Room 204", type: "class_session" },
      { id: "e2", title: "Office hours", time: "3:00 – 4:00 PM", location: "Online", type: "office_hours" },
    ],
  },
  {
    group: "Tomorrow",
    items: [{ id: "e3", title: "Data Structures", time: "1:00 – 2:15 PM", location: "Room 118", type: "class_session" }],
  },
  {
    group: "This week",
    items: [
      { id: "e4", title: "Guest lecture: Design Systems", time: "Thu, 2:00 – 3:00 PM", location: "Room 204", type: "class_session" },
      { id: "e5", title: "Study group — Data Structures", time: "Fri, 4:00 – 5:00 PM", location: "Room 118", type: "other" },
    ],
  },
];

function NewEventComposer({ onCancel, onCreate }: { onCancel: () => void; onCreate: (e: CalendarEvent) => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("class_session");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 overflow-hidden"
    >
      <div className="rounded-2xl border border-(--color-line) p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="rounded-xl border border-(--color-line) bg-(--color-paper) px-3.5 py-2.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
            className="rounded-xl border border-(--color-line) bg-(--color-paper) px-3.5 py-2.5 text-sm text-(--color-ink-soft) outline-none transition-colors focus:border-(--color-violet)"
          >
            <option value="class_session">Class session</option>
            <option value="office_hours">Office hours</option>
            <option value="other">Other</option>
          </select>
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="e.g. 2:00 – 3:00 PM"
            className="rounded-xl border border-(--color-line) bg-(--color-paper) px-3.5 py-2.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="rounded-xl border border-(--color-line) bg-(--color-paper) px-3.5 py-2.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet)"
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-(--color-line) px-4 py-2 text-sm font-medium text-(--color-ink-soft) transition-colors hover:border-(--color-ink) hover:text-(--color-ink)"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!title.trim() || !time.trim()}
            onClick={() =>
              onCreate({
                id: crypto.randomUUID(),
                title: title.trim(),
                time: time.trim(),
                location: location.trim() || "TBD",
                type,
              })
            }
            className="rounded-full bg-(--color-ink) px-4 py-2 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
          >
            Add event
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function CalendarAgenda({ canCreateEvents = false }: { canCreateEvents?: boolean }) {
  const { showToast } = useToast();
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [composing, setComposing] = useState(false);

  function addEvent(event: CalendarEvent) {
    setGroups((prev) => {
      const [first, ...rest] = prev;
      return [{ ...first, items: [...first.items, event] }, ...rest];
    });
    setComposing(false);
    showToast(`"${event.title}" added to your calendar.`);
  }

  return (
    <>
      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">Calendar</h2>
          <p className="mt-1 text-[15px] text-(--color-slate)">Upcoming class sessions and office hours.</p>
        </div>
        {canCreateEvents && !composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-2 rounded-full bg-(--color-ink) px-5 py-2.5 text-sm font-semibold text-(--color-paper) transition-transform duration-300 hover:scale-[1.03]"
          >
            + New event
          </button>
        )}
      </Reveal>

      <AnimatePresence>
        {composing && <NewEventComposer onCancel={() => setComposing(false)} onCreate={addEvent} />}
      </AnimatePresence>

      <div className="mt-8 flex flex-col gap-8">
        {groups.map((section) => (
          <div key={section.group}>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-(--color-mist)">{section.group}</p>
            <StaggerGroup className="mt-3 flex flex-col divide-y divide-(--color-line) rounded-2xl border border-(--color-line)">
              {section.items.map((event) => (
                <StaggerItem key={event.id} y={12} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--color-cloud) text-(--color-ink-soft)">
                    <SchedulingIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-(--color-ink)">{event.title}</p>
                    <p className="text-xs text-(--color-mist)">
                      {event.time} · {event.location}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_STYLES[event.type]}`}>
                    {TYPE_LABEL[event.type]}
                  </span>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        ))}
      </div>
    </>
  );
}
