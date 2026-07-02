"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

// Animated stat value — counts from 0 to `value` on mount via direct DOM
// writes (no re-renders). SSR paints 0 so hydration matches the client's
// starting frame; reduced-motion users get the final value immediately.

export function CountUp({
  value,
  format = "plain",
}: {
  value: number;
  format?: "plain" | "cad" | "percent";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n: number) =>
      format === "cad"
        ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n)
        : format === "percent"
        ? `${Math.round(n)}%`
        : Math.round(n).toLocaleString("en-CA");
    if (reduce) {
      el.textContent = fmt(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    return () => controls.stop();
  }, [value, format, reduce]);

  return <span ref={ref}>{format === "cad" ? "$0" : format === "percent" ? "0%" : "0"}</span>;
}
