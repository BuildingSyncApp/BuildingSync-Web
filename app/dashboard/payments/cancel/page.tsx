import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <main className="px-4 md:px-6 py-12 max-w-md mx-auto text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted/40 border border-border text-muted-foreground flex items-center justify-center">
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <h1 className="mt-6 text-2xl md:text-3xl font-semibold tracking-tight">Payment cancelled</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Nothing was charged. You can try again from the payments page when you&apos;re ready.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <Link
          href="/dashboard/payments"
          className="px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity text-sm font-semibold"
        >
          Try again
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
