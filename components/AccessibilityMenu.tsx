"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Accessibility quick-controls dropdown. Replaces the previous link-
// only icon: now exposes the three knobs users actually want from the
// chrome (text size, motion, link emphasis) and persists them in
// localStorage. The full /accessibility centre is still one click away.
//
// Values are applied as data-* attributes on <html> so CSS rules in
// globals.css can react without bundling JS into every page.

type FontScale = "default" | "lg" | "xl";
type Motion = "auto" | "reduce";
type LinkUnderline = "default" | "always";

const FONT_SCALES: { value: FontScale; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra large" },
];

const MOTION_OPTIONS: { value: Motion; label: string }[] = [
  { value: "auto", label: "System" },
  { value: "reduce", label: "Reduce" },
];

const UNDERLINE_OPTIONS: { value: LinkUnderline; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "always", label: "Always" },
];

function applyAttribute(name: string, value: string, defaultValue: string) {
  const html = document.documentElement;
  if (value === defaultValue) html.removeAttribute(name);
  else html.setAttribute(name, value);
}

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>("default");
  const [motionPref, setMotionPref] = useState<Motion>("auto");
  const [underline, setUnderline] = useState<LinkUnderline>("default");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const f = (localStorage.getItem("bs-a11y-font") as FontScale | null) || "default";
    const m = (localStorage.getItem("bs-a11y-motion") as Motion | null) || "auto";
    const u =
      (localStorage.getItem("bs-a11y-underline") as LinkUnderline | null) || "default";
    setFontScale(f);
    setMotionPref(m);
    setUnderline(u);
    applyAttribute("data-font-scale", f, "default");
    applyAttribute("data-motion", m, "auto");
    applyAttribute("data-underline", u, "default");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickFont(value: FontScale) {
    setFontScale(value);
    try {
      localStorage.setItem("bs-a11y-font", value);
    } catch {}
    applyAttribute("data-font-scale", value, "default");
  }
  function pickMotion(value: Motion) {
    setMotionPref(value);
    try {
      localStorage.setItem("bs-a11y-motion", value);
    } catch {}
    applyAttribute("data-motion", value, "auto");
  }
  function pickUnderline(value: LinkUnderline) {
    setUnderline(value);
    try {
      localStorage.setItem("bs-a11y-underline", value);
    } catch {}
    applyAttribute("data-underline", value, "default");
  }

  if (!mounted) {
    return <div className="w-9 h-9 hidden md:inline-flex" aria-hidden />;
  }

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Accessibility"
        className="relative w-9 h-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        {/* Universal Access Symbol — person silhouette inside a ring.
            Internationally recognized accessibility mark, scans clearly
            at icon sizes where a stick-figure does not. */}
        <svg
          className="w-4.5 h-4.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" />
          <circle cx="12" cy="6.75" r="1.25" fill="currentColor" stroke="none" />
          <path d="M7.25 10.75c1.5.75 3 1.1 4.75 1.1s3.25-.35 4.75-1.1" />
          <path d="M12 11.85V15" />
          <path d="M12 15l-2.25 3.5" />
          <path d="M12 15l2.25 3.5" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            role="menu"
            className="absolute right-0 mt-2 w-72 origin-top-right bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-border">
              <div className="text-sm font-semibold text-foreground">Accessibility</div>
              <div className="text-xs text-muted-foreground">
                Settings are saved on this device.
              </div>
            </div>

            <div className="px-4 py-3 space-y-3">
              <Segment
                label="Text size"
                value={fontScale}
                options={FONT_SCALES}
                onChange={pickFont}
              />
              <Segment
                label="Motion"
                value={motionPref}
                options={MOTION_OPTIONS}
                onChange={pickMotion}
              />
              <Segment
                label="Underline links"
                value={underline}
                options={UNDERLINE_OPTIONS}
                onChange={pickUnderline}
              />
            </div>

            <div className="border-t border-border">
              <Link
                href="/accessibility"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-muted/40 transition-colors"
                role="menuitem"
              >
                <span>Accessibility centre</span>
                <svg
                  className="w-3.5 h-3.5 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="inline-flex w-full items-center gap-0.5 border border-border rounded-md p-0.5 text-xs bg-background">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`flex-1 px-2 py-1 rounded-sm transition-colors ${
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
