"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Captures Android Chrome's beforeinstallprompt event so we can render our
// own install button. Safari iOS never fires this — we detect iOS UA and
// show the manual "Share → Add to Home Screen" hint instead.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "bs-pwa-prompt-dismissed";

export function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already dismissed in this browser? Don't show again.
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    // Already installed? (display-mode standalone, or iOS standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return;

    // iOS Safari detection (UA-based; iOS doesn't fire beforeinstallprompt)
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    const ios = iOS && safari;
    setIsIOS(ios);

    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (ios) {
      iosTimer = setTimeout(() => setShow(true), 3500);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      if (iosTimer) clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  function dismiss() {
    setShow(false);
    window.localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferred(null);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-3 left-3 right-3 z-60 max-w-md mx-auto pointer-events-none"
        >
          <div className="pointer-events-auto bg-card border border-accent/40 rounded-xl shadow-2xl p-4 flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shrink-0"
              aria-hidden="true"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12" y2="18.01" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Install BuildingSync</p>
              {isIOS ? (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  In Safari, tap the{" "}
                  <span className="inline-flex items-center gap-0.5 font-mono">
                    <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    Share
                  </span>
                  {" "}icon, then{" "}
                  <span className="font-mono">Add to Home Screen</span>.
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Get the app for quick access from your home screen.
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                {!isIOS && deferred && (
                  <button
                    type="button"
                    onClick={install}
                    className="px-3 py-1.5 text-xs font-semibold bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
                  >
                    Install
                  </button>
                )}
                <button
                  type="button"
                  onClick={dismiss}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isIOS ? "Got it" : "Not now"}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="text-muted-foreground hover:text-foreground transition-colors -mt-1 -mr-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
