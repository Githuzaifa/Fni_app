import { NextResponse } from "next/server";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "../../lib/mongodb";
import { IUser,User } from "../../models/User";
import { Payment } from "../../models/Payment";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-07-30.basil" });

// Helper to get user from JWT cookie
async function getUserFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim().split("="))
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );
  const token = cookies.token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    return user;
  } catch {
    return null;
  }
}

async function getOrCreateCustomer(user: IUser) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user._id.toString() },
  });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

// GET: Return list of user's saved payment methods
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const customerId = await getOrCreateCustomer(user);

    // Fetch payment methods saved on Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return NextResponse.json({ paymentMethods: paymentMethods.data });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || "Server error" }, { status: 500 });
  }
}

// POST: Create SetupIntent (for saving payment method) or PaymentIntent (make payment)
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type, paymentMethodId, amount } = body;

    await connectToDatabase();

    const customerId = await getOrCreateCustomer(user);

    if (type === "setup") {
      // Create SetupIntent for IDEAL, card setup
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card", "ideal"],
        usage: "off_session",
      });

      return NextResponse.json({ clientSecret: setupIntent.client_secret });
    } else if (type === "pay") {
      if (!paymentMethodId || !amount) {
        return NextResponse.json({ message: "Missing paymentMethodId or amount" }, { status: 400 });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "eur",
        payment_method: paymentMethodId,
        customer: customerId,
        confirm: true,
        off_session: false,
      });

      await Payment.create({
        userId: user._id.toString(),
        paymentMethodId,
        amount,
        currency: "eur",
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
      });

      return NextResponse.json({ paymentIntent });
    } else {
      return NextResponse.json({ message: "Invalid type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || "Server error" }, { status: 500 });
  }
}
