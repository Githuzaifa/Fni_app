import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../lib/mongodb";
import { getUserFromRequest } from "../../lib/auth";
import { Wallet } from "../../models/Wallet";

async function getOrCreateWallet(userId: string) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
  return wallet;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const wallet = await getOrCreateWallet(user._id.toString());
    return NextResponse.json({ balance: wallet.balance, transactions: wallet.transactions });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { type, amount, description } = await req.json() as {
      type: "deposit" | "withdraw";
      amount: number;
      description?: string;
    };

    if (!["deposit", "withdraw"].includes(type) || !amount || amount <= 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const wallet = await getOrCreateWallet(user._id.toString());

    if (type === "withdraw" && wallet.balance < amount) {
      return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
    }

    if (type === "deposit") {
      wallet.balance += amount;
    } else {
      wallet.balance -= amount;
    }

    wallet.transactions.unshift({
      type,
      amount,
      description: description ?? (type === "deposit" ? "Manual deposit" : "Manual withdrawal"),
      createdAt: new Date(),
    });

    await wallet.save();
    return NextResponse.json({ balance: wallet.balance, transactions: wallet.transactions });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
