import { Schema, model, models, Model, Document } from "mongoose";

export type SlotSourceType = "participant" | "winnerOf" | "loserOf" | "survivorOfGroup";
export type MatchStage = "elimination" | "roundrobin" | "final" | "thirdPlace" | "manual";
export type MatchStatus = "pending" | "ready" | "completed";

export interface ISlotSource {
  type: SlotSourceType;
  matchId?: string;      // for "winnerOf" / "loserOf"
  groupMatchIds?: string[]; // for "survivorOfGroup" — the round-robin match ids feeding this slot
}

export interface IMatch {
  matchId:     string;
  round:       number;
  stage:       MatchStage;
  label:       string;
  slotASource: ISlotSource;
  slotBSource: ISlotSource;
  playerAId?:   string;
  playerAName?: string;
  playerBId?:   string;
  playerBName?: string;
  scoreA?:      number;
  scoreB?:      number;
  winnerId?:    string;
  winnerName?:  string;
  loserId?:     string;
  loserName?:   string;
  status:      MatchStatus;
  // Auto-created external game link (e.g. a Lichess challenge restricted to these two players)
  externalGameUrl?:   string;
  externalWhiteUrl?:  string;
  externalBlackUrl?:  string;
}

export interface IParticipantSnapshot {
  userId:   string;
  username: string;
  gamerTag?: string;
  elo?:     number;
  team?:    "A" | "B";
}

export interface IStanding {
  userId:   string;
  username: string;
  position: number;
}

export interface IBracket extends Document {
  tournamentId:        string;
  mode:                "auto" | "manual";
  createdBy:           string;
  participantSnapshot: IParticipantSnapshot[];
  matches:             IMatch[];
  standings:           IStanding[];
  status:              "in_progress" | "completed";
}

const slotSourceSchema = new Schema<ISlotSource>({
  type:          { type: String, enum: ["participant", "winnerOf", "loserOf", "survivorOfGroup"], required: true },
  matchId:       { type: String },
  groupMatchIds: { type: [String] },
}, { _id: false });

const matchSchema = new Schema<IMatch>({
  matchId:     { type: String, required: true },
  round:       { type: Number, required: true },
  stage:       { type: String, enum: ["elimination", "roundrobin", "final", "thirdPlace", "manual"], required: true },
  label:       { type: String, default: "" },
  slotASource: { type: slotSourceSchema, required: true },
  slotBSource: { type: slotSourceSchema, required: true },
  playerAId:   { type: String },
  playerAName: { type: String },
  playerBId:   { type: String },
  playerBName: { type: String },
  scoreA:      { type: Number },
  scoreB:      { type: Number },
  winnerId:    { type: String },
  winnerName:  { type: String },
  loserId:     { type: String },
  loserName:   { type: String },
  status:      { type: String, enum: ["pending", "ready", "completed"], default: "pending" },
  externalGameUrl:  { type: String },
  externalWhiteUrl: { type: String },
  externalBlackUrl: { type: String },
}, { _id: false });

const participantSnapshotSchema = new Schema<IParticipantSnapshot>({
  userId:   { type: String, required: true },
  username: { type: String, required: true },
  gamerTag: { type: String },
  elo:      { type: Number },
  team:     { type: String, enum: ["A", "B"] },
}, { _id: false });

const standingSchema = new Schema<IStanding>({
  userId:   { type: String, required: true },
  username: { type: String, required: true },
  position: { type: Number, required: true },
}, { _id: false });

const bracketSchema = new Schema<IBracket>(
  {
    tournamentId:        { type: String, required: true, unique: true, index: true },
    mode:                { type: String, enum: ["auto", "manual"], required: true },
    createdBy:           { type: String, required: true },
    participantSnapshot: { type: [participantSnapshotSchema], default: [] },
    matches:             { type: [matchSchema], default: [] },
    standings:           { type: [standingSchema], default: [] },
    status:              { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
  },
  { timestamps: true }
);

export const Bracket: Model<IBracket> =
  models.Bracket || model<IBracket>("Bracket", bracketSchema);
