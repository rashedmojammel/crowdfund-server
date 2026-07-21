import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const notificationSchema = new Schema(
  {
    toEmail: { type: String, required: true, index: true },
    message: { type: String, required: true },
    actionRoute: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "notifications" }
);

notificationSchema.index({ toEmail: 1, createdAt: -1 });
notificationSchema.index({ toEmail: 1, read: 1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;

export const Notification: Model<NotificationDoc> =
  mongoose.models.Notification ??
  mongoose.model<NotificationDoc>("Notification", notificationSchema);
