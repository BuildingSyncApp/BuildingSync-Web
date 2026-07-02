"use client";

import { motion, useReducedMotion } from "framer-motion";

// Staggered entrance for dashboard sections — small rise + fade on first
// scroll into view. Respects prefers-reduced-motion (renders static).
// Keep delays small (≤0.2s) so the page never feels gated.

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: [0.21, 0.65, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
