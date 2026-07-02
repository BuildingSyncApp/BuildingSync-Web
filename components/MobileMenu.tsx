"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export type MobileNavItem = { href: string; label: string };
// L1 grouping for the post-login portals. Each section's first item is
// the L1 destination; the remaining items appear in the contextual L2
// row on desktop and as a flat group on mobile.
export type NavSection = { label: string; items: MobileNavItem[] };

export function MobileMenu({
  sections,
  rightSlot,
}: {
  sections: NavSection[];
  rightSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change — the "adjust state during render" pattern
  // (guarded by a prev comparison) instead of a setState-in-effect.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-muted/40 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[55] bg-foreground/40 backdrop-blur-sm md:hidden"
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 right-0 bottom-0 z-[56] w-72 max-w-[85vw] bg-background border-l border-border md:hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
                {sections.map((section, sIdx) => {
                  const isStandalone = section.items.length === 1;
                  return (
                    <div key={section.label} className={sIdx > 0 ? "mt-4" : ""}>
                      {!isStandalone && (
                        <div className="px-4 pb-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                          {section.label}
                        </div>
                      )}
                      <ul className="space-y-1">
                        {section.items.map((item) => {
                          const active = pathname === item.href || pathname.startsWith(item.href + "/");
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className={`block px-4 py-3 rounded-md text-sm transition-colors ${
                                  active
                                    ? "bg-accent/10 text-accent font-medium"
                                    : "text-foreground/85 hover:bg-muted/40"
                                }`}
                              >
                                {isStandalone ? section.label : item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </nav>

              {rightSlot && (
                <div className="px-5 py-4 border-t border-border">{rightSlot}</div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
