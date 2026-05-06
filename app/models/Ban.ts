import { Schema, model, models, Model, Document } from "mongoose";

export type BanDuration =
  | "1hour" | "6hours" | "12hours"
  | "1day"  | "3days"
  | "1week" | "2weeks"
  | "1month"| "3months"| "6months"| "12months"| "24months"
  | "permanent";

export const DURATION_MS: Record<string, number> = {
  "1hour":    3_600_000,
  "6hours":   6  * 3_600_000,
  "12hours":  12 * 3_600_000,
  "1day":     86_400_000,
  "3days":    3  * 86_400_000,
  "1week":    7  * 86_400_000,
  "2weeks":   14 * 86_400_000,
  "1month":   30 * 86_400_000,
  "3months":  90 * 86_400_000,
  "6months":  180* 86_400_000,
  "12months": 365* 86_400_000,
  "24months": 730* 86_400_000,
};

export const DURATION_OPTIONS: { value: BanDuration; label: string }[] = [
  { value: "1hour",    label: "1 Hour"    },
  { value: "6hours",   label: "6 Hours"   },
  { value: "12hours",  label: "12 Hours"  },
  { value: "1day",     label: "1 Day"     },
  { value: "3days",    label: "3 Days"    },
  { value: "1week",    label: "1 Week"    },
  { value: "2weeks",   label: "2 Weeks"   },
  { value: "1month",   label: "1 Month"   },
  { value: "3months",  label: "3 Months"  },
  { value: "6months",  label: "6 Months"  },
  { value: "12months", label: "12 Months" },
  { value: "24months", label: "24 Months" },
  { value: "permanent",label: "Permanent" },
];

export interface IBan extends Document {
  fniUsername:   string;
  steamUsername?: string;
  epicUsername?:  string;
  reason:  string;
  issuedBy: string;
  duration: BanDuration;
  expiresAt?: Date;
  status: "Active" | "Lifted" | "Expired";
}

const banSchema = new Schema<IBan>(
  {
    fniUsername:   { type: String, required: true },
    steamUsername: { type: String },
    epicUsername:  { type: String },
    reason:   { type: String, required: true },
    issuedBy: { type: String, required: true },
    duration: {
      type: String,
      enum: Object.keys(DURATION_MS).concat(["permanent"]),
      required: true,
    },
    expiresAt: { type: Date },
    status: { type: String, enum: ["Active", "Lifted", "Expired"], default: "Active" },
  },
  { timestamps: true }
);

banSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt && this.duration !== "permanent") {
    const ms = DURATION_MS[this.duration];
    if (ms) this.expiresAt = new Date(Date.now() + ms);
  }
  next();
});

export const Ban: Model<IBan> = models.Ban || model<IBan>("Ban", banSchema);
