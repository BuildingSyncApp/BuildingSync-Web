"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  CURRENCIES,
  formatPrice,
  type CurrencyCode,
} from "@/lib/pricing";

// Client-side currency state for the public pricing section. The server
// auto-detects the visitor's currency from geo (CF-IPCountry) and passes it as
// `initial`; the user can override it with the switcher. Display only — the
// underlying per-unit USD price is unchanged.

const CurrencyContext = createContext<CurrencyCode>("USD");

export function PricingCurrencyProvider({
  initial,
  children,
}: {
  initial: CurrencyCode;
  children: ReactNode;
}) {
  const [currency, setCurrency] = useState<CurrencyCode>(initial);
  return (
    <CurrencyContext.Provider value={currency}>
      <div className="mt-6 flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Currency
        </span>
        <div
          role="group"
          aria-label="Display currency"
          className="inline-flex items-center gap-0.5 border border-border rounded-md p-0.5 text-xs bg-card"
        >
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
            const active = currency === code;
            return (
              <button
                key={code}
                type="button"
                aria-pressed={active}
                onClick={() => setCurrency(code)}
                className={`px-2 py-1 rounded-sm transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {CURRENCIES[code].label}
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </CurrencyContext.Provider>
  );
}

// Renders a base-USD amount in the currently selected currency. Falls back to
// the raw label for non-numeric prices like "Custom".
export function Price({
  baseUsd,
  custom,
}: {
  baseUsd: number | null;
  custom?: string;
}) {
  const currency = useContext(CurrencyContext);
  if (baseUsd == null) return <>{custom ?? "Custom"}</>;
  return <>{formatPrice(baseUsd, currency)}</>;
}

// Small "approx." note + non-USD disclaimer for the footer.
export function CurrencyNote() {
  const currency = useContext(CurrencyContext);
  if (currency === "USD") {
    return (
      <>Billed in USD. Stripe processing fees absorbed by the property manager — never charged to residents (Ontario RTA s. 134 compliant).</>
    );
  }
  return (
    <>
      Prices shown in {CURRENCIES[currency].label} are approximate conversions for reference; billing
      is settled in your local agreement currency at checkout. Stripe processing fees are absorbed by
      the property manager — never charged to residents (Ontario RTA s. 134 compliant).
    </>
  );
}
