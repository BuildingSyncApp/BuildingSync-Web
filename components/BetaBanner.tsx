"use client";

import { motion } from "framer-motion";

// Page-level "this is under development" notice. Intentionally NOT
// dismissable — during R1 every visitor needs to know the site isn't
// production. Delete this component (and its mount in app/layout.tsx)
// when we hit GA.
export function BetaBanner() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
      className="sticky top-0 z-70 bg-accent text-accent-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 flex items-center justify-center text-center text-xs sm:text-sm">
        <p className="leading-snug">
          <strong className="font-semibold">Early testing.</strong>{" "}
          <span className="opacity-90">
            BuildingSync is under active development — features may change or break. Not yet a live production service. Feedback:{" "}
            <a
              href="mailto:info@buildingsync.app"
              className="underline underline-offset-2 hover:opacity-80"
            >
              info@buildingsync.app
            </a>
            .
          </span>
        </p>
      </div>
    </motion.div>
  );
}
