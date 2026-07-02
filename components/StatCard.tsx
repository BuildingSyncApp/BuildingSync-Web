import Link from "next/link";
import { CountUp } from "@/components/CountUp";

// R&D-style stat card. Bordered, eyebrow label (mono uppercase), big
// number, subtitle. Optional href turns the whole card into a link.
// Numeric values count up on mount (CountUp); strings render as-is.
//
// Used to replace the inline stat divs that were drifting on /team and
// /platform home pages.

export function StatCard({
  label,
  value,
  format,
  hint,
  href,
  className = "",
}: {
  label: string;
  value: number | string;
  format?: "plain" | "cad" | "percent";
  hint?: string;
  href?: string;
  className?: string;
}) {
  const inner = (
    <>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl md:text-4xl font-semibold tabular-nums tracking-tight">
        {typeof value === "number" ? <CountUp value={value} format={format} /> : value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground">
          {hint}
        </div>
      )}
    </>
  );

  const base = "block bg-card border border-border rounded-md px-5 py-5 transition-all duration-200";

  if (href) {
    return (
      <Link
        href={href}
        className={`${base} hover:border-accent hover:shadow-lg hover:shadow-foreground/5 hover:-translate-y-0.5 ${className}`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={`${base} ${className}`}>{inner}</div>;
}
