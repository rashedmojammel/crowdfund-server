import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CONTRIBUTION_STATUSES } from "@/types";

const contributionSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    supporterEmail: { type: String, required: true, index: true },
    // Denormalized from the user document at creation (JWT + DB lookup,
    // never the request body) so review tables don't need a join.
    supporterName: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: CONTRIBUTION_STATUSES,
      default: "pending",
      index: true,
    },
  },
  { timestamps: true, collection: "contributions" }
);

contributionSchema.index({ campaignId: 1, status: 1 });
contributionSchema.index({ supporterEmail: 1, createdAt: -1 });

export type ContributionDoc = InferSchemaType<typeof contributionSchema>;

export const Contribution: Model<ContributionDoc> =
  mongoose.models.Contribution ??
  mongoose.model<ContributionDoc>("Contribution", contributionSchema);
