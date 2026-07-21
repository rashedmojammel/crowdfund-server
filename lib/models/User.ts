import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Collection "user" is created and owned by BetterAuth on the client repo.
// The server only reads identity fields and mutates credits/signupBonusGranted.
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String },
    image: { type: String },
    role: {
      type: String,
      enum: ["supporter", "creator", "admin"],
      default: "supporter",
    },
    credits: { type: Number, default: 0, min: 0 },
    signupBonusGranted: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "user" }
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> =
  mongoose.models.User ?? mongoose.model<UserDoc>("User", userSchema);
