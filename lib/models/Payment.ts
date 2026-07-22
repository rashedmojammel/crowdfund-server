import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const paymentSchema = new Schema(
  {
    supporterEmail: { type: String, required: true, index: true },
    credits: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    // Set once Stripe returns the created session (the Payment row itself
    // is created first, so its _id can be used as the Checkout Session
    // idempotency key); the webhook route then uses this field as its own
    // idempotency key when crediting the wallet. sparse so the brief window
    // before it's set doesn't collide on the unique index.
    stripeSessionId: { type: String, unique: true, sparse: true },
    // Set by the webhook once checkout.session.completed fires.
    stripePaymentIntent: { type: String },
    status: {
      type: String,
      enum: ["pending", "succeeded"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true, collection: "payments" }
);

paymentSchema.index({ supporterEmail: 1, createdAt: -1 });

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;

export const Payment: Model<PaymentDoc> =
  mongoose.models.Payment ?? mongoose.model<PaymentDoc>("Payment", paymentSchema);
