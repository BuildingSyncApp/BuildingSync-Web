"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/Avatar";
import { roleLabel } from "@/components/RoleBadge";
import { useConfirm } from "@/components/ConfirmDialog";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { LocaleCode } from "@/lib/locale";

// Avatar-triggered account dropdown. Replaces the previous inline
// email + role-badge + sign-out cluster in the header that was crowding
// the nav and visually colliding with primary nav items at narrow widths.
//
// Layout follows the R&D account menu reference: identity card on top
// (name + email + role tag), primary actions, then sign-out at the
// bottom. Desktop only — mobile gets the same surface via the
// hamburger drawer footer in PortalShell.

type MenuItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function AccountMenu({
  name,
  email,
  role,
  portalHome,
  accountHref,
  locale,
}: {
  name?: string | null;
  email: string;
  role: string;
  portalHome: string;
  accountHref: string;
  locale: LocaleCode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { confirm, dialog } = useConfirm();

  // Sign-out POST is fired imperatively rather than via a ref-to-form
  // inside the dropdown, because closing the dropdown unmounts that form
  // (AnimatePresence) before the confirm dialog's onConfirm runs, which
  // would null out the ref and silently do nothing.
  function submitSignOut() {
    const form = document.createElement("form");
    form.method = "post";
    form.action = "/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }

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

  const items: MenuItem[] = [
    {
      href: portalHome,
      label: "Dashboard",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      href: accountHref,
      label: "Account & settings",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
    {
      href: "/docs",
      label: "Help & support",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1.5 group rounded-full focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background"
      >
        <Avatar
          name={name}
          email={email}
          size="md"
          className="ring-1 ring-border/60 group-hover:ring-accent/50 transition-shadow"
        />
        <svg
          className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
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
            <div className="px-4 py-4 border-b border-border">
              {name && name.trim() && (
                <div className="text-sm font-semibold text-foreground truncate" title={name}>
                  {name}
                </div>
              )}
              <div className="text-xs text-muted-foreground truncate" title={email}>
                {email}
              </div>
              <div className="mt-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-accent border border-accent/40 bg-accent/5 px-2 py-1 rounded-sm inline-block">
                  {roleLabel(role)}
                </span>
              </div>
            </div>

            <ul className="py-1.5">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors"
                    role="menuitem"
                  >
                    <span className="w-4 h-4 text-muted-foreground shrink-0">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="border-t border-border py-1.5">
              <LocaleSwitcher current={locale} variant="row" />
            </div>

            <div className="border-t border-border py-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  confirm({
                    title: "Sign out?",
                    description: "You'll be returned to the sign-in page.",
                    confirmLabel: "Sign out",
                    destructive: false,
                    onConfirm: submitSignOut,
                  });
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors text-left"
              >
                <svg className="w-4 h-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {dialog}
    </div>
  );
}
