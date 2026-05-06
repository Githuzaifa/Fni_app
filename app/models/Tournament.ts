import { Schema, model, models, Model, Document } from "mongoose";

export interface ITournament extends Document {
  title: string;
  game: string;
  type: "Fire" | "Ice";
  format: string;
  maxParticipants: number;
  currentParticipants: number;
  scheduledAt: Date;
  fee: string;
  status: "Pending" | "Active" | "Completed" | "Cancelled";
  eloMin?: number;
  eloMax?: number;
  createdBy: string;
  prizes: number[];
}

const tournamentSchema = new Schema<ITournament>(
  {
    title: { type: String, required: true },
    game: { type: String, required: true },
    type: { type: String, enum: ["Fire", "Ice"], required: true },
    format: { type: String, required: true },
    maxParticipants: { type: Number, required: true },
    currentParticipants: { type: Number, default: 0 },
    scheduledAt: { type: Date, required: true },
    fee: { type: String, default: "Free" },
    status: {
      type: String,
      enum: ["Pending", "Active", "Completed", "Cancelled"],
      default: "Pending",
    },
    eloMin: { type: Number },
    eloMax: { type: Number },
    createdBy: { type: String, required: true },
    prizes: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export const Tournament: Model<ITournament> =
  models.Tournament || model<ITournament>("Tournament", tournamentSchema);
