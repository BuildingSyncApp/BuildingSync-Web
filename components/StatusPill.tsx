// Multi-tone status pill in the R&D aesthetic — bordered, mono uppercase,
// tinted background. One generic primitive for all status kinds (work
// orders, leases, residents, etc) so we don't repeat color dicts.

const TONES = {
  accent: "bg-accent/10 text-accent border-accent/30",
  red:    "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  amber:  "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
  green:  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  blue:   "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
  muted:  "bg-muted/50 text-muted-foreground border-border line-through",
} as const;

export type Tone = keyof typeof TONES;

export function StatusPill({
  label,
  tone = "neutral",
  className = "",
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm border ${TONES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}

// Map work-order status → tone for visual differentiation. Open/urgent
// gets the accent; in-progress is neutral; closed/completed are muted;
// scheduled gets blue (waiting on time, not action).
export function workOrderTone(status: string): Tone {
  switch (status) {
    case "open":         return "accent";
    case "in_progress":  return "amber";
    case "scheduled":    return "blue";
    case "completed":    return "green";
    case "closed":       return "muted";
    default:             return "neutral";
  }
}
