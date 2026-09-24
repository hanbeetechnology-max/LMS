import type { ConversationSummary } from "../../lib/chatApi";
import { formatDate, formatTime } from "../kit";

export function convName(c: ConversationSummary): string {
  if (c.kind === "direct") return c.otherFullName || "Unknown";
  return c.title || (c.kind === "support" ? "Support" : "Group");
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return "Today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "Yesterday";
  return formatDate(iso);
}

/** Chat list time: today 14:05, yesterday "Yesterday", older a date. */
export function listTime(iso: string | null): string {
  if (!iso) return "";
  const label = dayLabel(iso);
  return label === "Today" ? formatTime(iso) : label;
}

/** Stable per-person name colour that reads in light and dark. */
export function nameColor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `oklch(0.62 0.16 ${h})`;
}

export function GroupIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16 11a3 3 0 1 0-2.6-4.5A5 5 0 0 1 14 9c0 .7-.1 1.4-.4 2 .7.6 1.500 1 2.400 1zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.700 0-6 1.300-6 4v2h12v-2c0-2.700-3.300-4-6-4zm8.300.1c1 .7 1.700 1.700 1.700 2.900v3h5v-3c0-2-3.100-3.500-6.700-2.900z" />
    </svg>
  );
}

export function Tick({ state }: { state: "sending" | "delivered" | "read" | "failed" }) {
  if (state === "sending")
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-label="Sending" role="img">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 4.500V8l2.200 1.500" />
      </svg>
    );
  const color = state === "read" ? "#53bdeb" : "currentColor";
  return (
    <svg viewBox="0 0 18 12" width="17" height="12" fill="none" stroke={color} strokeWidth="1.700" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={state === "read" ? "Read" : "Delivered"}>
      <path d="M1 6.500 4.500 10 11 2" />
      <path d="M7 8.500 8 10 15 2" />
    </svg>
  );
}
