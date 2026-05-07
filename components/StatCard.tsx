import Link from "next/link";

// R&D-style stat card. Bordered, eyebrow label (mono uppercase), big
// number, subtitle. Optional href turns the whole card into a link.
//
// Used to replace the inline stat divs that were drifting on /team and
// /platform home pages.

export function StatCard({
  label,
  value,
  hint,
  href,
  className = "",
}: {
  label: string;
  value: number | string;
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
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground">
          {hint}
        </div>
      )}
    </>
  );

  const base = "block bg-card border border-border rounded-md px-5 py-5 transition-colors";

  if (href) {
    return (
      <Link href={href} className={`${base} hover:border-accent ${className}`}>
        {inner}
      </Link>
    );
  }

  return <div className={`${base} ${className}`}>{inner}</div>;
}
