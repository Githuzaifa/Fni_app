import { Schema, model, models, Model, Document } from "mongoose";

export interface IParticipant {
  userId:   string;
  username: string;
  email:    string;
  noShow?:  boolean;
  team?:    "A" | "B";
  elo?:     number;
  gamerTag?: string;
}

export interface ITournament extends Document {
  title:               string;
  game:                string;
  type:                "Fire" | "Ice";
  format:              string;
  maxParticipants:     number;
  currentParticipants: number;
  scheduledAt:         Date;
  fee:                 string;
  feeType:             "per_person" | "per_team";
  region:              string;
  status:              "Pending" | "Active" | "Completed" | "Cancelled";
  eloMin?:             number;
  eloMax?:             number;
  createdBy:           string;
  prizes:              number[];
  boosted:             boolean;
  boostedUntil?:       Date;
  lockEnabled:         boolean;
  participants:        IParticipant[];
  remindersSent:       { h24: boolean; m30: boolean };
  winnerId?:           string;
  winnerUsername?:     string;
}

const participantSchema = new Schema<IParticipant>({
  userId:   { type: String, required: true },
  username: { type: String, required: true },
  email:    { type: String, required: true },
  noShow:   { type: Boolean, default: false },
  team:     { type: String, enum: ["A", "B"] },
  elo:      { type: Number },
  gamerTag: { type: String },
}, { _id: false });

const tournamentSchema = new Schema<ITournament>(
  {
    title:               { type: String, required: true },
    game:                { type: String, required: true },
    type:                { type: String, enum: ["Fire", "Ice"], required: true },
    format:              { type: String, required: true },
    maxParticipants:     { type: Number, required: true },
    currentParticipants: { type: Number, default: 0 },
    scheduledAt:         { type: Date, required: true },
    fee:                 { type: String, default: "Free" },
    feeType:             { type: String, enum: ["per_person", "per_team"], default: "per_person" },
    region:              { type: String, default: "Europe" },
    status: {
      type:    String,
      enum:    ["Pending", "Active", "Completed", "Cancelled"],
      default: "Pending",
    },
    eloMin:          { type: Number },
    eloMax:          { type: Number },
    createdBy:       { type: String, required: true },
    prizes:          { type: [Number], default: [] },
    boosted:         { type: Boolean, default: false },
    boostedUntil:    { type: Date },
    lockEnabled:     { type: Boolean, default: true },
    participants:    { type: [participantSchema], default: [] },
    remindersSent:   { type: { h24: Boolean, m30: Boolean }, default: { h24: false, m30: false } },
    winnerId:        { type: String },
    winnerUsername:  { type: String },
  },
  { timestamps: true }
);

export const Tournament: Model<ITournament> =
  models.Tournament || model<ITournament>("Tournament", tournamentSchema);
