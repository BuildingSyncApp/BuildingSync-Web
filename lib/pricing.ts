// pricing.ts — display-only currency localization for the public pricing page.
//
// The *underlying* price is the same everywhere (per-unit USD). We only change
// how it's DISPLAYED: a visitor in Canada sees CAD, in India sees INR, etc.,
// converted at a fixed reference rate. This is a marketing convenience, not a
// billing change — actual invoicing currency is settled at checkout/contract.
//
// Rates are intentionally hardcoded and approximate. They are NOT a live FX
// feed; we round to "friendly" display values and show an "approx." note so we
// never misrepresent an exact charge. Revisit the rates periodically.

export type CurrencyCode = "USD" | "CAD" | "INR" | "EUR" | "GBP" | "AUD";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  label: string;
  // Multiplier applied to the base USD amount for display.
  rate: number;
  // Whole-number currencies (INR) read better without cents on a price page.
  decimals: 0 | 2;
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: { code: "USD", symbol: "$", label: "USD", rate: 1, decimals: 2 },
  CAD: { code: "CAD", symbol: "CA$", label: "CAD", rate: 1.37, decimals: 2 },
  INR: { code: "INR", symbol: "₹", label: "INR", rate: 84, decimals: 0 },
  EUR: { code: "EUR", symbol: "€", label: "EUR", rate: 0.92, decimals: 2 },
  GBP: { code: "GBP", symbol: "£", label: "GBP", rate: 0.79, decimals: 2 },
  AUD: { code: "AUD", symbol: "A$", label: "AUD", rate: 1.52, decimals: 2 },
};

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

// ISO 3166-1 alpha-2 country (from CF-IPCountry / x-vercel-ip-country) → the
// currency we default the pricing page to. Anything not listed falls back to
// USD. Eurozone countries map to EUR.
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  CA: "CAD",
  IN: "INR",
  GB: "GBP",
  AU: "AUD",
  US: "USD",
  // Common Eurozone members.
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR",
  PT: "EUR", BE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR",
};

export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  if (!country) return DEFAULT_CURRENCY;
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? DEFAULT_CURRENCY;
}

// Format a base USD amount into the given currency for display.
// e.g. formatPrice(2.5, "CAD") -> "CA$3.43"
export function formatPrice(baseUsd: number, code: CurrencyCode): string {
  const c = CURRENCIES[code];
  const converted = baseUsd * c.rate;
  const amount = converted.toFixed(c.decimals);
  return `${c.symbol}${amount}`;
}
