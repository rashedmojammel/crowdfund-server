import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const paymentSchema = new Schema(
  {
    supporterEmail: { type: String, required: true, index: true },
    credits: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    // Set when the checkout session is created; the webhook route uses it
    // as the idempotency key when crediting the wallet.
    stripeSessionId: { type: String, required: true, unique: true },
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
