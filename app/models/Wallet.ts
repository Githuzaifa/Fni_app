import { Schema, model, models } from "mongoose";

export type TxType = "deposit" | "withdraw" | "fee" | "prize" | "refund";

const transactionSchema = new Schema({
  type:        { type: String, enum: ["deposit", "withdraw", "fee", "prize", "refund"], required: true },
  amount:      { type: Number, required: true },
  description: { type: String, default: "" },
  createdAt:   { type: Date, default: Date.now },
});

const walletSchema = new Schema({
  userId:       { type: String, required: true, unique: true },
  balance:      { type: Number, default: 0, min: 0 },
  transactions: { type: [transactionSchema], default: [] },
}, { timestamps: true });

export const Wallet = models.Wallet || model("Wallet", walletSchema);
