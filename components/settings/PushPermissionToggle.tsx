"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

// Permission + subscription manager for Web Push. The toggle calls
// browser APIs (Notification.requestPermission, pushManager.subscribe)
// and POSTs the resulting subscription to /api/push/subscribe. iOS
// only ships the permission prompt for installed PWAs (display:
// standalone) — we surface that requirement up-front so users aren't
// confused when no prompt appears in Safari proper.

function urlBase64ToArrayBuffer(b64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

type Status = "loading" | "unsupported" | "denied" | "subscribed" | "available" | "needs-pwa";

async function detectStatus(): Promise<Status> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }

  // iOS Safari only allows push for installed PWAs — outside
  // standalone mode the permission prompt never appears.
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isIos && !standalone) return "needs-pwa";

  if (Notification.permission === "denied") return "denied";

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? "subscribed" : "available";
  } catch {
    return "available";
  }
}

export function PushPermissionToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = useState<Status>("loading");
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();

  useEffect(() => {
    let cancelled = false;
    detectStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    if (!vapidPublicKey) {
      toast.error("Push isn't configured on this server", {
        description: "VAPID keys are missing. Reach out to support.",
      });
      return;
    }
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "available");
          toast.error("Notifications were not allowed");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
        });
        const json = sub.toJSON();
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Couldn't save subscription");
        }
        setStatus("subscribed");
        toast.success("Push notifications enabled on this device");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Couldn't enable push", { description: message });
      }
    });
  }

  function disable() {
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setStatus("available");
        toast.success("Push notifications disabled on this device");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Couldn't disable push", { description: message });
      }
    });
  }

  function sendTest() {
    startTest(async () => {
      try {
        const res = await fetch("/api/push/test", { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Test push failed");
        }
        toast.success("Test push sent — check your notifications");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.error("Couldn't send test push", { description: message });
      }
    });
  }

  if (status === "loading") {
    return (
      <p className="text-xs text-muted-foreground">Checking notification permission…</p>
    );
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications aren&apos;t supported in this browser.
      </p>
    );
  }

  if (status === "needs-pwa") {
    return (
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          On iOS, push notifications only work after you install BuildingSync to your home screen.
        </p>
        <p>
          In Safari, tap the <span className="font-mono">Share</span> icon, then{" "}
          <span className="font-mono">Add to Home Screen</span>. Re-open BuildingSync from there
          and the toggle will appear.
        </p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        You&apos;ve blocked notifications for this site. Re-enable in your browser&apos;s site
        settings, then reload this page.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {status === "subscribed" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
            Enabled on this device
          </span>
          <button
            type="button"
            onClick={sendTest}
            disabled={testing}
            className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted disabled:opacity-60 transition-colors"
          >
            {testing ? "Sending…" : "Send test"}
          </button>
          <button
            type="button"
            onClick={disable}
            disabled={pending}
            className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted disabled:opacity-60 transition-colors"
          >
            {pending ? "Disabling…" : "Disable"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={pending}
          className="px-4 py-2 text-sm rounded-md bg-accent text-accent-foreground font-semibold hover:bg-accent/90 disabled:opacity-60 transition-colors"
        >
          {pending ? "Requesting…" : "Enable on this device"}
        </button>
      )}
      <p className="text-xs text-muted-foreground">
        Browser will ask permission. We&apos;ll send notifications for announcements that target
        your audience and packages waiting for pickup.
      </p>
    </div>
  );
}
