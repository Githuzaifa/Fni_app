import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  paymentMethodId: { type: String, required: true },
  paymentIntentId: { type: String },
  amount: { type: Number },
  currency: { type: String, default: "eur" },
  status: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
