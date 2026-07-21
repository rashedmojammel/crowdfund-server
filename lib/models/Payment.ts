import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const paymentSchema = new Schema(
  {
    supporterEmail: { type: String, required: true, index: true },
    credits: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    // Set when the checkout session is created; the (future) webhook route
    // uses it as the idempotency key when crediting the wallet.
    stripeSessionId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "completed"],
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
