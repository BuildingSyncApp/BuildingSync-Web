"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalStorageValue } from "@/components/useLocalStorageValue";

// Rotating advisory strip for post-login surfaces — the airline-style
// pattern: tinted band, bold headline + one-line detail, ‹ 1/N › pager,
// pause, and per-item dismiss. Items are computed server-side per role
// (see app/team/layout.tsx) and passed down; this component only handles
// rotation + dismissal.
//
// Dismissals persist in localStorage keyed by item id. Ids include the
// current date (e.g. "wo-overdue-2026-07-01"), so a dismissed advisory
// stays hidden for the day and re-surfaces tomorrow if still true.

export type AdvisoryItem = {
  id: string;
  tone: "info" | "warning" | "critical";
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
};

const DISMISS_KEY = "bs-advisories-dismissed";
const ROTATE_MS = 8000;

const TONES = {
  info: {
    band: "bg-sky-500/10 border-sky-500/30",
    title: "text-sky-900 dark:text-sky-200",
    control: "text-sky-900/70 hover:text-sky-900 dark:text-sky-200/70 dark:hover:text-sky-200",
  },
  warning: {
    band: "bg-amber-500/10 border-amber-500/40",
    title: "text-amber-900 dark:text-amber-200",
    control: "text-amber-900/70 hover:text-amber-900 dark:text-amber-200/70 dark:hover:text-amber-200",
  },
  critical: {
    band: "bg-rose-500/10 border-rose-500/40",
    title: "text-rose-900 dark:text-rose-200",
    control: "text-rose-900/70 hover:text-rose-900 dark:text-rose-200/70 dark:hover:text-rose-200",
  },
} as const;

export function AdvisoryBanner({ items }: { items: AdvisoryItem[] }) {
  const [dismissedRaw, setDismissedRaw] = useLocalStorageValue(DISMISS_KEY);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // `undefined` = SSR / hydrating — render nothing so server and client
  // first paint match, then the banner appears with dismissals applied.
  const dismissed = dismissedRaw === undefined ? null : new Set((dismissedRaw || "").split(","));
  const visible = dismissed ? items.filter((i) => !dismissed.has(i.id)) : [];

  const count = visible.length;
  const current = count > 0 ? visible[Math.min(index, count - 1)] : null;

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, count]);

  if (!current) return null;
  const tone = TONES[current.tone];
  const shownIndex = Math.min(index, count - 1);

  function dismissCurrent() {
    if (!current) return;
    const ids = dismissedRaw ? `${dismissedRaw},${current.id}` : current.id;
    // Keep the list from growing unboundedly — ids are day-scoped, so
    // anything beyond the newest 50 is long stale.
    setDismissedRaw(ids.split(",").slice(-50).join(","));
    setIndex(0);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`border rounded-lg px-4 py-3 sm:px-5 flex items-center gap-4 ${tone.band}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <p className={`text-sm font-semibold leading-snug ${tone.title}`}>{current.title}</p>
            <p className="mt-0.5 text-sm text-foreground/80 truncate">
              {current.body}
              {current.href && (
                <>
                  {" "}
                  <Link href={current.href} className="underline underline-offset-2 whitespace-nowrap">
                    {current.hrefLabel ?? "Review"}
                  </Link>
                </>
              )}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous advisory"
              onClick={() => setIndex((shownIndex - 1 + count) % count)}
              className={`w-7 h-7 inline-flex items-center justify-center rounded-full transition-colors ${tone.control}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-xs font-mono tabular-nums text-foreground/70">
              {shownIndex + 1}/{count}
            </span>
            <button
              type="button"
              aria-label="Next advisory"
              onClick={() => setIndex((shownIndex + 1) % count)}
              className={`w-7 h-7 inline-flex items-center justify-center rounded-full transition-colors ${tone.control}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={paused ? "Resume rotation" : "Pause rotation"}
              aria-pressed={paused}
              onClick={() => setPaused((p) => !p)}
              className={`w-7 h-7 inline-flex items-center justify-center rounded-full transition-colors ${tone.control}`}
            >
              {paused ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="6 4 20 12 6 20" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="5" y="4" width="4" height="16" rx="1" />
                  <rect x="15" y="4" width="4" height="16" rx="1" />
                </svg>
              )}
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Dismiss advisory"
          onClick={dismissCurrent}
          className={`w-7 h-7 inline-flex items-center justify-center rounded-full transition-colors ${tone.control}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
