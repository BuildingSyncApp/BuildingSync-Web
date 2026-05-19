"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Wordmark } from "@/components/ui";
import { brand, isCanonicalBrand } from "@/lib/brand";

// Shared chrome for /signin, /signup, /auth/reset, /onboarding, and the
// trust pages (/privacy, /terms, /docs). Top bar reads naturally:
//   ← Back         ·    BUILDINGSYNC    ·    (right slot, if any)
// Wordmark is the home link; back button always sits top-left where the
// eye reads first; right slot is for context-aware affordances (e.g.
// "Already have an account?" on /signup).

export function AuthShell({
  children,
  back = { href: "/", label: "Back" },
  rightSlot,
  width = "narrow",
}: {
  children: React.ReactNode;
  back?: { href: string; label?: string } | null;
  rightSlot?: React.ReactNode;
  width?: "narrow" | "wide";
}) {
  const containerWidth = width === "wide" ? "max-w-3xl" : "max-w-md";

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className={`${containerWidth} mx-auto px-4 sm:px-6 py-3 grid grid-cols-3 items-center`}>
          <div className="justify-self-start">
            {back && (
              <Link
                href={back.href}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span className="hidden sm:inline">{back.label ?? "Back"}</span>
              </Link>
            )}
          </div>
          <div className="justify-self-center">
            <Link href="/" aria-label="BuildingSync home">
              <Wordmark className="text-base" />
            </Link>
          </div>
          <div className="justify-self-end text-sm text-muted-foreground">
            {rightSlot}
          </div>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`flex-1 ${containerWidth} mx-auto w-full px-4 sm:px-6 py-8 sm:py-12`}
      >
        {children}
      </motion.main>

      <footer className={`${containerWidth} mx-auto px-4 sm:px-6 py-6 border-t border-border text-center`}>
        <p className="text-xs text-muted-foreground font-mono">
          © {new Date().getFullYear()} {brand.name}
          {brand.parentAttribution ? ` · ${brand.parentAttribution}` : ""} ·{" "}
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          {" · "}
          <Link href="/legal" className="hover:text-foreground transition-colors">Legal &amp; compliance</Link>
        </p>
        {!isCanonicalBrand && brand.showPoweredBy && (
          <p className="mt-2 text-[10px] text-muted-foreground/70 font-mono">
            Powered by BuildingSync
          </p>
        )}
      </footer>
    </div>
  );
}
