"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import styles from "./NotificationBell.module.css";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";
import { getRealtimeClient } from "../../../lib/realtime";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link_to: string | null;
  read: boolean;
  created_at: string;
};

const LIST_KEY = ["notifications", "list"] as const;
const COUNT_KEY = ["notifications", "unread"] as const;

const SAFE_LINK_PREFIXES = ["/dashboard"];

function safeHref(link: string | null) {
  if (!link) return "/dashboard";
  return SAFE_LINK_PREFIXES.some((prefix) => link.startsWith(prefix)) ? link : "/dashboard";
}

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: profile } = useSessionProfile();

  const list = useQuery({
    queryKey: LIST_KEY,
    queryFn: () =>
      authenticatedSupabaseFetch<Notification[]>(
        "/rest/v1/notifications?select=id,title,body,link_to,read,created_at&order=created_at.desc&limit=20",
      ),
    refetchInterval: 60_000,
  });

  const unread = (list.data ?? []).filter((n) => !n.read).length;

  useEffect(() => {
    if (!profile?.id) return;
    const channel = getRealtimeClient()
      .channel(`notifications-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          const row = payload.new as { title?: string; body?: string | null };
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && row.title) {
            new Notification(row.title, { body: row.body ?? undefined });
          }
        },
      )
      .subscribe();
    return () => {
      void getRealtimeClient().removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    await authenticatedSupabaseFetch("/rest/v1/rpc/mark_all_notifications_read", { method: "POST", body: "{}" });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function openItem(item: Notification) {
    if (!item.read) {
      await authenticatedSupabaseFetch("/rest/v1/rpc/mark_notification_read", {
        method: "POST",
        body: JSON.stringify({ p_id: item.id }),
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button
        type="button"
        className={styles.bellBtn}
        onClick={() => {
          if (typeof Notification !== "undefined" && Notification.permission === "default") {
            void Notification.requestPermission();
          }
          setOpen((value) => !value);
        }}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={18} />
        {unread > 0 && <span className={styles.badge} aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Notifications">
          <div className={styles.panelHeader}>
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className={styles.linkBtn} onClick={() => void markAllRead()}>
                Mark all read
              </button>
            )}
          </div>
          {list.isLoading && <p className={styles.empty}>Loading…</p>}
          {list.error && <p className={styles.empty} role="alert">Couldn&apos;t load notifications.</p>}
          {!list.isLoading && !list.error && (list.data ?? []).length === 0 && (
            <p className={styles.empty}>You&apos;re all caught up.</p>
          )}
          <ul className={styles.list}>
            {(list.data ?? []).map((item) => (
              <li key={item.id}>
                <Link
                  href={safeHref(item.link_to)}
                  className={`${styles.item} ${item.read ? "" : styles.unread}`}
                  onClick={() => void openItem(item)}
                >
                  <span className={styles.itemTitle}>{item.title}</span>
                  {item.body && <span className={styles.itemBody}>{item.body}</span>}
                  <span className={styles.itemTime}>{timeAgo(item.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
