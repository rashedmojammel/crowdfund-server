import type Stripe from "stripe";
import { withAuthErrors } from "@/lib/auth";
import { creditWallet } from "@/lib/credits";
import { connectDb, runInTransaction } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { Payment } from "@/lib/models/Payment";
import { createNotification } from "@/lib/notifications";
import { getStripe } from "@/lib/stripe";

// POST — Stripe calls this directly (no JWT; verified by signature instead).
// Deliberately public: withAuthErrors is used here only for the shared
// error-response shape, not auth — nothing inside calls verifyRequest.
//
// checkout.session.completed is the only event this cares about. The
// server always creates card-only Checkout Sessions (see POST /api/payments),
// so "completed" reliably means paid — no async_payment_succeeded handling
// needed. Idempotent by Payment.status, since Stripe redelivers events.
export const POST = withAuthErrors(async (req) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(500, "STRIPE_WEBHOOK_SECRET is not set");

  const signature = req.headers.get("stripe-signature");
  if (!signature) throw new ApiError(400, "Missing stripe-signature header");

  // Signature verification needs the exact raw bytes Stripe signed — must
  // read as text, never req.json(), which would re-serialize and break it.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    throw new ApiError(400, `Webhook signature verification failed: ${message}`);
  }

  if (event.type !== "checkout.session.completed") {
    // Not an event this handles — 200 so Stripe doesn't keep retrying it.
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return Response.json({ received: true });
  }

  await connectDb();

  await runInTransaction(async (dbSession) => {
    const payment = await Payment.findOne({ stripeSessionId: session.id }).session(dbSession);
    if (!payment) {
      // Nothing to reconcile against — log and acknowledge; retrying won't
      // make a matching Payment appear.
      console.error(`Stripe webhook: no Payment found for session ${session.id}`);
      return;
    }
    if (payment.status === "succeeded") return; // already processed — redelivery

    payment.status = "succeeded";
    if (typeof session.payment_intent === "string") {
      payment.stripePaymentIntent = session.payment_intent;
    }
    await payment.save({ session: dbSession });

    await creditWallet(payment.supporterEmail, payment.credits, dbSession);

    await createNotification({
      toEmail: payment.supporterEmail,
      message: `Payment received — ${payment.credits} credits ($${payment.amountUsd.toFixed(2)}) added to your wallet.`,
      actionRoute: "/dashboard/payment-history",
      session: dbSession,
    });
  });

  return Response.json({ received: true });
});
