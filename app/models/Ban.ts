import { Schema, model, models, Model, Document } from "mongoose";

export type BanDuration = "1day" | "1week" | "1month" | "1year" | "permanent";

export interface IBan extends Document {
  fniUsername: string;
  steamUsername?: string;
  epicUsername?: string;
  reason: string;
  issuedBy: string;
  duration: BanDuration;
  expiresAt?: Date;
  status: "Active" | "Lifted" | "Expired";
}

function calcExpiry(duration: BanDuration): Date | undefined {
  if (duration === "permanent") return undefined;
  const ms: Record<string, number> = {
    "1day": 86_400_000,
    "1week": 7 * 86_400_000,
    "1month": 30 * 86_400_000,
    "1year": 365 * 86_400_000,
  };
  return new Date(Date.now() + ms[duration]);
}

const banSchema = new Schema<IBan>(
  {
    fniUsername: { type: String, required: true },
    steamUsername: { type: String },
    epicUsername: { type: String },
    reason: { type: String, required: true },
    issuedBy: { type: String, required: true },
    duration: {
      type: String,
      enum: ["1day", "1week", "1month", "1year", "permanent"],
      required: true,
    },
    expiresAt: { type: Date },
    status: {
      type: String,
      enum: ["Active", "Lifted", "Expired"],
      default: "Active",
    },
  },
  { timestamps: true }
);

// Auto-set expiresAt before saving
banSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = calcExpiry(this.duration);
  }
  next();
});

export const Ban: Model<IBan> = models.Ban || model<IBan>("Ban", banSchema);
