import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { connectToDatabase } from "../../../lib/mongodb";
import { Payment } from "../../../models/Payment";
import { Wallet } from "../../../models/Wallet";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil" as any,
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ message: "Webhook secret not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Stripe webhook signature error:", err.message);
    return NextResponse.json({ message: `Webhook error: ${err.message}` }, { status: 400 });
  }

  await connectToDatabase();

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;

      // Idempotency guard: only credit if we haven't already processed this PaymentIntent.
      // Use findOneAndUpdate with $ne to atomically transition status from pending → succeeded.
      const updated = await Payment.findOneAndUpdate(
        { paymentIntentId: pi.id, status: { $ne: "succeeded" } },
        { status: "succeeded" }
      );

      // If `updated` is null it means the record was already marked succeeded (retry/duplicate) — skip.
      if (!updated) {
        console.log(`Duplicate webhook for PaymentIntent ${pi.id} — skipping wallet credit`);
        return NextResponse.json({ received: true });
      }

      // Credit wallet for deposit-type payment intents
      const userId    = pi.metadata?.userId;
      const isDeposit = pi.metadata?.type === "deposit";
      if (userId && isDeposit) {
        const amount = pi.amount / 100;
        let wallet   = await Wallet.findOne({ userId });
        if (!wallet) wallet = await Wallet.create({ userId, balance: 0 });
        wallet.balance += amount;
        wallet.transactions.unshift({
          type:        "deposit",
          amount,
          description: `Stripe deposit`,
          createdAt:   new Date(),
        });
        await wallet.save();
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await Payment.findOneAndUpdate({ paymentIntentId: pi.id }, { status: "failed" });
      break;
    }

    case "setup_intent.succeeded":
      // Card saved — no wallet credit needed
      break;

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
