import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Lazy singleton so a missing key fails at request time, not at import
// time (which would break typecheck/build in environments without secrets).
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");

  _stripe = new Stripe(key);
  return _stripe;
}

// Base URL of the client app, for Checkout success/cancel redirects.
export function getClientUrl(): string {
  const origins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (!origins[0]) throw new Error("ALLOWED_ORIGINS is not set");
  return origins[0];
}
