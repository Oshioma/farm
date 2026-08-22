"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  markAllNotificationsRead,
  type FarmNotification,
} from "@/lib/notifications";
import { FOCUS_EVENT } from "@/hooks/useFocusTarget";

const POLL_MS = 45_000;

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<FarmNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([getNotifications(15), getUnreadNotificationCount()]);
      setItems(list);
      setUnread(count);
    } catch {
      // Notifications are non-critical chrome — never surface an error here.
    }
  }, []);

  // Initial load, then poll and refresh whenever the tab regains focus.
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) refresh();
  }

  async function handleItemClick(n: FarmNotification) {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
      setUnread((c) => Math.max(0, c - 1));
      markNotificationsRead([n.id]).catch(() => {});
    }
    if (!n.link) return;
    router.push(n.link);
    /* Already on that page? Nothing remounts, so tell it directly. */
    if (n.link.split("?")[0] === window.location.pathname) {
      window.dispatchEvent(new CustomEvent(FOCUS_EVENT, { detail: n.link }));
    }
  }

  async function handleMarkAll() {
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } catch {
      refresh();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative rounded-full border border-zinc-200 bg-white p-2 text-zinc-700 transition hover:bg-zinc-100"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-zinc-900">Notifications</span>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs font-medium text-emerald-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">Nothing yet.</div>
          ) : (
            <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleItemClick(n)}
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-zinc-50 ${
                      n.read ? "" : "bg-emerald-50/50"
                    }`}
                  >
                    <span className="text-sm text-zinc-800">{n.title}</span>
                    {n.body && <span className="line-clamp-2 text-xs text-zinc-500">{n.body}</span>}
                    <span className="text-xs text-zinc-400">{timeAgo(n.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
