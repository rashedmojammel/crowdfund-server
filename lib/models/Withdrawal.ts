import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  MIN_WITHDRAWAL_CREDITS,
  PAYMENT_SYSTEMS,
  WITHDRAWAL_STATUSES,
} from "@/types";

const withdrawalSchema = new Schema(
  {
    creatorEmail: { type: String, required: true, index: true },
    credits: { type: Number, required: true, min: MIN_WITHDRAWAL_CREDITS },
    // USD, always computed server-side as credits / 20 — never from a body.
    amount: { type: Number, required: true, min: 0 },
    paymentSystem: { type: String, enum: PAYMENT_SYSTEMS, required: true },
    accountNumber: { type: String, required: true },
    status: {
      type: String,
      enum: WITHDRAWAL_STATUSES,
      default: "pending",
      index: true,
    },
  },
  { timestamps: true, collection: "withdrawals" }
);

withdrawalSchema.index({ creatorEmail: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: 1 });

export type WithdrawalDoc = InferSchemaType<typeof withdrawalSchema>;

export const Withdrawal: Model<WithdrawalDoc> =
  mongoose.models.Withdrawal ??
  mongoose.model<WithdrawalDoc>("Withdrawal", withdrawalSchema);
