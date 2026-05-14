"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LOCALES, type LocaleCode } from "@/lib/locale";
import { setLocale } from "@/lib/locale-actions";

// Locales whose UI strings are actually translated today. Anything else
// stores the preference + flips <html lang>, but the visible chrome is
// still English. Surfaced in the picker as a "preview" pill so users
// don't think the switcher is broken when nothing visibly changes.
const TRANSLATED: ReadonlySet<LocaleCode> = new Set(["en-CA", "en-IN", "en-AE"]);

// Compact dropdown for choosing a locale. Designed to live inside the
// AccountMenu panel as a single row, but the component is generic enough
// to drop into a public footer too. No backing-store fuss — picks the
// locale, hits the server action, refreshes.

export function LocaleSwitcher({
  current,
  variant = "row",
}: {
  current: LocaleCode;
  variant?: "row" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const meta = LOCALES.find((l) => l.code === current) ?? LOCALES[0];

  function pick(code: LocaleCode) {
    setOpen(false);
    if (code === current) return;
    const next = LOCALES.find((l) => l.code === code) ?? LOCALES[0];
    startTransition(async () => {
      const res = await setLocale(code);
      if (!res.ok) {
        toast.error("Couldn't save language preference");
        return;
      }
      // Flip <html lang>/<dir> immediately so the change is visible
      // before the server-driven refresh swaps the SSR copy.
      document.documentElement.lang = code;
      document.documentElement.dir = next.dir;
      if (TRANSLATED.has(code)) {
        toast.success(`Language set to ${next.label}`);
      } else {
        toast.success(`Saved · ${next.label}`, {
          description: "Full UI translation ships in a future release; chrome stays in English for now.",
        });
      }
      router.refresh();
    });
  }

  if (variant === "compact") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {meta.code}
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && <DropdownPanel current={current} onPick={pick} pending={pending} align="left" />}
      </div>
    );
  }

  // "row" variant — for the AccountMenu panel: a label on the left, the
  // current locale + chevron on the right; clicking opens the picker
  // inline below.
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors disabled:opacity-60"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
      >
        <span className="flex items-center gap-3">
          <svg className="w-4 h-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          Language &amp; region
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {meta.code}
          <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <ul className="bg-muted/30 border-y border-border" role="menu">
          {LOCALES.map((l) => {
            const active = l.code === current;
            const translated = TRANSLATED.has(l.code);
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => pick(l.code)}
                  disabled={pending}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-sm transition-colors disabled:opacity-60 ${
                    active ? "text-accent" : "text-foreground hover:bg-muted/50"
                  }`}
                  role="menuitem"
                  dir={l.dir}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{l.label}</span>
                    {!translated && (
                      <span className="shrink-0 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/5">
                        Preview
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">
                    {l.code}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DropdownPanel({
  current,
  onPick,
  pending,
  align,
}: {
  current: LocaleCode;
  onPick: (code: LocaleCode) => void;
  pending: boolean;
  align: "left" | "right";
}) {
  return (
    <ul
      className={`absolute ${align === "left" ? "left-0" : "right-0"} mt-2 w-56 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50 py-1`}
      role="menu"
    >
      {LOCALES.map((l) => {
        const active = l.code === current;
        const translated = TRANSLATED.has(l.code);
        return (
          <li key={l.code}>
            <button
              type="button"
              onClick={() => onPick(l.code)}
              disabled={pending}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors disabled:opacity-60 ${
                active ? "text-accent bg-accent/5" : "text-foreground hover:bg-muted/40"
              }`}
              role="menuitem"
              dir={l.dir}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate">{l.label}</span>
                {!translated && (
                  <span className="shrink-0 text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/5">
                    Preview
                  </span>
                )}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">{l.code}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
