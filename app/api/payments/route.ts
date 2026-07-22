import { requireSupporter, verifyRequest, withAuthErrors } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { readJsonBody } from "@/lib/http";
import { Payment, type PaymentDoc } from "@/lib/models/Payment";
import { paginate } from "@/lib/pagination";
import { getClientUrl, getStripe } from "@/lib/stripe";
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
} from "@/lib/validators/payment";

// GET — the requesting supporter's own payment history, paginated.
export const GET = withAuthErrors(async (req) => {
  const user = await verifyRequest(req);
  const { page, limit } = listPaymentsQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams)
  );
  await connectDb();

  const { items, total } = await paginate<PaymentDoc>(
    Payment,
    { supporterEmail: user.email },
    { createdAt: -1 },
    page,
    limit
  );

  return Response.json({ items, total, page, limit });
});

// POST — creates a Stripe Checkout Session for one of the four fixed
// credit packages. credits/amountUsd must match CREDIT_PACKAGES exactly
// (enforced by createPaymentSchema) — arbitrary amounts are rejected before
// Stripe is ever called. The wallet itself is credited by the (separate)
// webhook route once payment actually completes, keyed by this session id.
export const POST = withAuthErrors(async (req) => {
  const { email } = await requireSupporter(req);
  const { credits, amountUsd } = createPaymentSchema.parse(
    await readJsonBody(req)
  );
  await connectDb();

  const clientUrl = getClientUrl();
  const stripe = getStripe();

  // Created before the Stripe call so its _id can serve as the Checkout
  // Session idempotency key — a client retry (or stripe-node's own
  // automatic retry on a network blip) reuses the same key and Stripe
  // returns the original session instead of creating a duplicate one.
  const payment = await Payment.create({
    supporterEmail: email,
    credits,
    amountUsd,
    status: "pending",
  });

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${credits} Credits` },
            unit_amount: Math.round(amountUsd * 100),
          },
          quantity: 1,
        },
      ],
      // Identity and the validated package, never a client-suppliable amount —
      // this is what the webhook trusts when it credits the wallet.
      metadata: { supporterEmail: email, credits: String(credits) },
      success_url: `${clientUrl}/dashboard/purchase-credit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/dashboard/purchase-credit/cancel`,
    },
    { idempotencyKey: payment._id.toString() }
  );

  payment.stripeSessionId = session.id;
  await payment.save();

  return Response.json({ url: session.url }, { status: 201 });
});
