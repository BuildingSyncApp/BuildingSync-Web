"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorageValue } from "@/components/useLocalStorageValue";

export type NotificationItem = {
  id: string;
  kind: "work_order" | "announcement" | "package" | "booking";
  title: string;
  meta: string;
  href: string;
  createdAt: string; // ISO
  read?: boolean;
};

// Notification dropdown. The "unread count" is computed client-side from
// a localStorage timestamp ("last seen") — items created after that
// timestamp are considered new until the user opens the bell or hits
// "Mark all read".
//
// UX intent — intuitive notifications:
//   • Time-grouped (Today / Yesterday / Earlier) so the user can scan
//     "what's new since this morning?" without parsing timestamps.
//   • Per-kind colour + icon so the type is recognisable at a glance.
//   • Pulse animation on the unread badge — peripheral cue without
//     being intrusive.
//   • Explicit "Mark all read" so users can clear without opening
//     every item.
const LAST_SEEN_KEY = "bs-notifications-last-seen";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bucketFor(createdAt: string, now: Date): "today" | "yesterday" | "earlier" {
  const created = new Date(createdAt);
  const today0 = startOfDay(now).getTime();
  const yest0 = today0 - ONE_DAY_MS;
  const t = created.getTime();
  if (t >= today0) return "today";
  if (t >= yest0) return "yesterday";
  return "earlier";
}

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [lastSeenRaw, setLastSeenRaw] = useLocalStorageValue(LAST_SEEN_KEY);
  const ref = useRef<HTMLDivElement>(null);

  // `undefined` = SSR / storage unknown → show no badge yet; `null` =
  // never marked read → everything counts as new.
  const lastSeen = lastSeenRaw === undefined ? Number.POSITIVE_INFINITY : Number(lastSeenRaw || 0);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Toggling open doesn't auto-mark-read anymore — that's now an
  // explicit user action. Opening just reveals the list; the badge
  // stays until the user dismisses it. More predictable.
  function toggle() {
    setOpen((prev) => !prev);
  }

  function markAllRead() {
    setLastSeenRaw(String(Date.now()));
  }

  const unreadCount = items.filter((i) => new Date(i.createdAt).getTime() > lastSeen).length;

  const grouped = useMemo(() => {
    const now = new Date();
    const groups: Record<"today" | "yesterday" | "earlier", NotificationItem[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };
    for (const item of items) groups[bucketFor(item.createdAt, now)].push(item);
    return groups;
  }, [items]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} new` : "Notifications"}
        aria-expanded={open}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <>
            {/* Outer pulse ring — only visible when there's something new.
                Animation is subtle (1.6s ease-out, infinite) so it draws
                the eye without becoming distracting. */}
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-accent/40 animate-ping"
            />
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="menu"
            aria-label="Notifications"
            className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-card border border-border rounded-lg shadow-2xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</p>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[10px] uppercase tracking-wider text-accent hover:underline focus:outline-none focus:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">Nothing new.</p>
                <p className="mt-1 text-xs text-muted-foreground/85">
                  Updates to work orders, new announcements, and package pickups will show up here.
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {(["today", "yesterday", "earlier"] as const).map((bucket) => {
                  const bucketItems = grouped[bucket];
                  if (bucketItems.length === 0) return null;
                  const label = bucket === "today" ? "Today" : bucket === "yesterday" ? "Yesterday" : "Earlier";
                  return (
                    <div key={bucket}>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground bg-muted/20">
                        {label}
                      </p>
                      <ul className="divide-y divide-border">
                        {bucketItems.map((item) => {
                          const isNew = new Date(item.createdAt).getTime() > lastSeen;
                          return (
                            <li key={item.id}>
                              <Link
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className="block px-4 py-3 hover:bg-muted/30 transition-colors focus:outline-none focus:bg-muted/40"
                              >
                                <div className="flex items-start gap-3">
                                  <KindIcon kind={item.kind} isNew={isNew} />
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm truncate ${isNew ? "font-semibold text-foreground" : "text-foreground/90"}`}>
                                      {item.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">{item.meta}</p>
                                  </div>
                                  {isNew && (
                                    <span aria-hidden="true" className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-accent" />
                                  )}
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Per-kind icon + colour tone. New items get the accent ring; older
// ones get a muted version so the bell visually distinguishes
// "demands attention" from "for your reference".
function KindIcon({ kind, isNew }: { kind: NotificationItem["kind"]; isNew: boolean }) {
  const tones = {
    work_order: { bg: "bg-amber-500/10", border: "border-amber-500/20", color: "text-amber-700 dark:text-amber-400" },
    announcement: { bg: "bg-rose-500/10", border: "border-rose-500/20", color: "text-rose-700 dark:text-rose-400" },
    package: { bg: "bg-sky-500/10", border: "border-sky-500/20", color: "text-sky-700 dark:text-sky-400" },
    booking: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", color: "text-emerald-700 dark:text-emerald-400" },
  } as const;
  const tone = tones[kind];
  const muted = isNew ? "" : "opacity-70";
  return (
    <span className={`shrink-0 w-7 h-7 rounded-md border flex items-center justify-center ${tone.bg} ${tone.border} ${tone.color} ${muted}`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {kind === "work_order" ? (
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        ) : kind === "announcement" ? (
          <path d="M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14 M15.54 8.46a5 5 0 0 1 0 7.07" />
        ) : kind === "package" ? (
          <>
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </>
        ) : (
          <>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </>
        )}
      </svg>
    </span>
  );
}
