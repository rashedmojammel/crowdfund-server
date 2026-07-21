import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const reportSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    reporterEmail: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true, collection: "reports" }
);

reportSchema.index({ status: 1, createdAt: -1 });

export type ReportDoc = InferSchemaType<typeof reportSchema>;

export const Report: Model<ReportDoc> =
  mongoose.models.Report ?? mongoose.model<ReportDoc>("Report", reportSchema);
