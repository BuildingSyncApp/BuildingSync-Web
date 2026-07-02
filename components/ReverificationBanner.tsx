import Link from "next/link";

// Re-verification banner for Building Managers. Renders inside the
// /team chrome so it's visible on every staff page. Color + copy
// escalate as the due date approaches:
//
//   • > 60 days out: no banner (silent)
//   • 30–60 days out: blue info — "Heads up, re-verification due"
//   • 1–30 days out: amber — "Re-verification due soon"
//   • Overdue: red — "Re-verification overdue"
//
// Action is always the same: email support to request the review,
// with the manager's email + company prefilled in the mailto.

type Urgency = "info" | "warning" | "overdue";

function urgencyFor(daysOut: number): Urgency | null {
  if (daysOut > 60) return null;
  if (daysOut > 30) return "info";
  if (daysOut >= 0) return "warning";
  return "overdue";
}

// Server component — evaluated per request, so "now" is request time.
function daysUntil(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const STYLES: Record<Urgency, { bg: string; border: string; text: string; dot: string }> = {
  info: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/30",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  warning: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/40",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  overdue: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/40",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

export function ReverificationBanner({
  nextDueAt,
  companyName,
  email,
}: {
  nextDueAt: Date | null;
  companyName: string | null;
  email: string;
}) {
  if (!nextDueAt) return null;
  const daysOut = daysUntil(nextDueAt);
  const urgency = urgencyFor(daysOut);
  if (!urgency) return null;

  const tone = STYLES[urgency];

  const headline =
    urgency === "overdue"
      ? `Re-verification overdue by ${Math.abs(daysOut)} day${Math.abs(daysOut) === 1 ? "" : "s"}`
      : urgency === "warning"
      ? `Re-verification due in ${daysOut} day${daysOut === 1 ? "" : "s"}`
      : `Heads up — re-verification due in ${daysOut} days`;

  const body =
    urgency === "overdue"
      ? "Your management company's verification has expired. You can still use the staff portal, but please request a review to stay current with Ontario CMRAO + business-registry expectations."
      : urgency === "warning"
      ? "We re-verify management companies on a regular cycle so the building's records stay defensible at the LTB and with insurers. Submit your updated docs now to avoid lapse."
      : "Your management company's verification will be due for renewal soon. Give us your updated licence + insurance proof when you have a moment.";

  const subject = encodeURIComponent(
    `Re-verification request — ${companyName ?? "Management company"}`,
  );
  const bodyText = encodeURIComponent(
    `Hi BuildingSync team,

I'm requesting re-verification for my management company.

Account email: ${email}
Company: ${companyName ?? "(please ask)"}

I'll send updated CMRAO licence and insurance proof on reply.

Thanks.`,
  );
  const mailto = `mailto:info@buildingsync.app?subject=${subject}&body=${bodyText}`;

  return (
    <div
      role={urgency === "overdue" ? "alert" : "status"}
      className={`${tone.bg} ${tone.border} border rounded-lg px-4 py-3 sm:px-5 sm:py-4`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${tone.dot} ${urgency === "overdue" ? "animate-pulse" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-sm ${tone.text}`}>{headline}</p>
          <p className="mt-1 text-sm text-foreground/85 leading-relaxed">{body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={mailto}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                urgency === "overdue"
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : urgency === "warning"
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-sky-600 text-white hover:bg-sky-700"
              }`}
            >
              Request re-verification →
            </a>
            <Link
              href="/team/verification"
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs border border-border bg-card hover:bg-muted/40 transition-colors"
            >
              View verification history
            </Link>
            <Link
              href="/legal"
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Why this matters
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
