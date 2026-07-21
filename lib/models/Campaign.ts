import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CAMPAIGN_CATEGORIES, CAMPAIGN_STATUSES } from "@/types";

const campaignSchema = new Schema(
  {
    title: { type: String, required: true },
    story: { type: String, required: true },
    category: { type: String, enum: CAMPAIGN_CATEGORIES, required: true },
    coverImage: { type: String, required: true },
    fundingGoal: { type: Number, required: true, min: 1 },
    // Mutated only via $inc inside transactions (contribution approve,
    // withdrawal payout) — never set from a request body.
    amountRaised: { type: Number, default: 0, min: 0 },
    deadline: { type: Date, required: true },
    reward: { type: String, required: true },
    creatorEmail: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: CAMPAIGN_STATUSES,
      default: "pending",
      index: true,
    },
  },
  { timestamps: true, collection: "campaigns" }
);

campaignSchema.index({ status: 1, deadline: 1 });
campaignSchema.index({ status: 1, amountRaised: -1 });
campaignSchema.index({ creatorEmail: 1, deadline: -1 });

export type CampaignDoc = InferSchemaType<typeof campaignSchema>;

export const Campaign: Model<CampaignDoc> =
  mongoose.models.Campaign ??
  mongoose.model<CampaignDoc>("Campaign", campaignSchema);
