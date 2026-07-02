"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocalStorageValue } from "@/components/useLocalStorageValue";

// First-run welcome banner. Dismissible; remembers via localStorage so
// it doesn't reappear every page load. Designed for older / new users
// who need orientation, but invisible to long-time residents.

const STORAGE_KEY = "bs-dashboard-welcome-dismissed-v1";

export function WelcomeCard({ firstName }: { firstName: string }) {
  const [dismissedAt, setDismissedAt] = useLocalStorageValue(STORAGE_KEY);
  const [dismissedNow, setDismissedNow] = useState(false);

  // Show only once we know the key is absent (`null`); `undefined` means
  // SSR / storage blocked — don't show.
  const show = !dismissedNow && dismissedAt === null;

  function dismiss() {
    setDismissedNow(true);
    setDismissedAt(String(Date.now()));
  }

  if (!show) return null;

  return (
    <div className="bg-accent/5 border border-accent/30 rounded-xl p-5 relative">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome card"
        className="absolute top-3 right-3 w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <h2 className="font-semibold text-base">Welcome, {firstName}.</h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        This is your building dashboard. From here you can report
        maintenance issues, see announcements from your building team,
        pick up packages, and book shared spaces. Look around — you can
        come back to this guide from{" "}
        <Link href="/dashboard/menu" className="text-accent hover:underline">
          Menu → Help
        </Link>
        .
      </p>
    </div>
  );
}
