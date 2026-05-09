import Link from "next/link";

// Stripe redirects here after a successful checkout. We show an
// optimistic "thanks" message even before the webhook flips the Payment
// row to succeeded — the webhook is asynchronous and may land seconds
// later. The /dashboard/payments history view is the source of truth.

export default function PaymentSuccessPage() {
  return (
    <main className="px-4 md:px-6 py-12 max-w-md mx-auto text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="mt-6 text-2xl md:text-3xl font-semibold tracking-tight">Thanks — payment received</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Stripe has confirmed your rent payment. It may take a moment to appear in your history below.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <Link
          href="/dashboard/payments"
          className="px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity text-sm font-semibold"
        >
          View history
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors text-sm"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
