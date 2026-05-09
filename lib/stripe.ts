import Stripe from "stripe";

// Lazy singleton — instantiating Stripe at module load would fail in
// CI/preview deployments where STRIPE_SECRET_KEY isn't set. Throw only
// when a request actually needs Stripe.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key);
  return _stripe;
}

export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

// Master kill-switch for the rent-payment flow. Stripe merchant
// onboarding is pending compliance review; until it's approved we
// surface a "pending compliance" notice instead of the Pay button and
// reject the API routes. Flip to "1" once Stripe approves.
export function isStripeEnabled(): boolean {
  return process.env.STRIPE_ENABLED === "1";
}
