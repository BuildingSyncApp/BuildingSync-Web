"use client";

import { useState } from "react";
import { toast } from "sonner";

// Pay-rent CTA. POSTs to /api/stripe/checkout to create a Checkout
// Session, then redirects the browser to Stripe's hosted page. Server
// is the source of truth for amount — we do not pass it from the client.

export function PayNowButton({ leaseId, amount }: { leaseId: string; amount: number }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaseId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not start checkout");
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("No checkout URL returned");
      window.location.assign(data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Payment failed to start", { description: message });
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="mt-4 w-full sm:w-auto px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      aria-label={`Pay rent ${amount.toFixed(2)} CAD via Stripe`}
    >
      {loading ? "Starting checkout…" : "Pay rent"}
    </button>
  );
}
