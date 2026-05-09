"use client";

import { useEffect } from "react";

// Registers the SW in production AND dev when the user opts in via
// ?sw=1 (cached in sessionStorage). Default-off in dev because SW
// caching collides with Next.js HMR and can serve stale modules.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isProd = process.env.NODE_ENV === "production";
    const devOptIn =
      new URLSearchParams(window.location.search).get("sw") === "1" ||
      window.sessionStorage.getItem("bs-dev-sw") === "1";

    if (devOptIn) window.sessionStorage.setItem("bs-dev-sw", "1");
    if (!isProd && !devOptIn) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failures are non-fatal — the app still works.
    });
  }, []);
  return null;
}
