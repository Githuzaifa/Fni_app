import { NextResponse } from "next/server";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "../../lib/mongodb";
import { IUser, User } from "../../models/User";
import { Payment } from "../../models/Payment";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil" as any,
});

async function getUserFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((c) => {
    const [k, v] = c.trim().split("=");
    if (k && v) cookies[k] = decodeURIComponent(v);
  });
  const token = cookies["token"];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    await connectToDatabase();
    return User.findById(decoded.userId);
  } catch {
    return null;
  }
}

async function getOrCreateCustomer(user: IUser): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: user.email,
    name:  `${user.firstName} ${user.lastName}`,
    metadata: { userId: user._id.toString() },
  });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

// GET — list saved payment methods
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const customerId    = await getOrCreateCustomer(user);
    const paymentMethods = await stripe.paymentMethods.list({ customer: customerId, type: "card" });

    return NextResponse.json({ paymentMethods: paymentMethods.data });
  } catch (error: any) {
    console.error("GET /api/payment error:", error);
    return NextResponse.json({ message: error.message ?? "Server error" }, { status: 500 });
  }
}

// POST — setup | deposit | pay
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type, paymentMethodId, amount } = body as {
      type: "setup" | "deposit" | "pay";
      paymentMethodId?: string;
      amount?: number;
    };

    const customerId = await getOrCreateCustomer(user);

    // ── 1. Save a payment method (SetupIntent) ──────────────────────────────
    if (type === "setup") {
      const setupIntent = await stripe.setupIntents.create({
        customer:             customerId,
        payment_method_types: ["card", "ideal"],
        usage:                "off_session",
      });
      return NextResponse.json({ clientSecret: setupIntent.client_secret });
    }

    // ── 2. Deposit money into FnI wallet via saved card ─────────────────────
    if (type === "deposit") {
      if (!paymentMethodId || !amount || amount <= 0) {
        return NextResponse.json({ message: "paymentMethodId and a positive amount are required" }, { status: 400 });
      }

      const amountCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount:         amountCents,
        currency:       "eur",
        customer:       customerId,
        payment_method: paymentMethodId,
        confirm:        true,
        off_session:    false,
        // Webhook reads these to credit the wallet
        metadata: {
          userId: user._id.toString(),
          type:   "deposit",
        },
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/wallet`,
      });

      await Payment.create({
        userId:          user._id.toString(),
        paymentMethodId,
        paymentIntentId: paymentIntent.id,
        amount:          amountCents,
        currency:        "eur",
        status:          paymentIntent.status,
      });

      return NextResponse.json({
        status:          paymentIntent.status,        // "succeeded" | "requires_action"
        clientSecret:    paymentIntent.client_secret, // needed if 3DS required
        paymentIntentId: paymentIntent.id,
      });
    }

    // ── 3. Generic off-session charge (for internal use) ────────────────────
    if (type === "pay") {
      if (!paymentMethodId || !amount) {
        return NextResponse.json({ message: "Missing paymentMethodId or amount" }, { status: 400 });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount:         Math.round(amount * 100),
        currency:       "eur",
        payment_method: paymentMethodId,
        customer:       customerId,
        confirm:        true,
        off_session:    false,
        metadata:       { userId: user._id.toString(), type: "pay" },
        return_url:     `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/wallet`,
      });

      await Payment.create({
        userId:          user._id.toString(),
        paymentMethodId,
        paymentIntentId: paymentIntent.id,
        amount:          Math.round(amount * 100),
        currency:        "eur",
        status:          paymentIntent.status,
      });

      return NextResponse.json({ status: paymentIntent.status, clientSecret: paymentIntent.client_secret });
    }

    return NextResponse.json({ message: "Invalid type — use setup | deposit | pay" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/payment error:", error);
    return NextResponse.json({ message: error.message ?? "Server error" }, { status: 500 });
  }
}
