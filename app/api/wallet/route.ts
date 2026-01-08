import { NextResponse } from "next/server";

interface WalletData {
  balance: number;
  transactions: {
    id: number;
    type: "deposit" | "withdraw";
    amount: number;
    date: string;
  }[];
}

let wallet: WalletData = {
  balance: 1000,
  transactions: [],
};

let nextTxId = 1;

export async function GET() {
  return NextResponse.json(wallet);
}

export async function POST(req: Request) {
  try {
    const { type, amount } = (await req.json()) as {
      type: "deposit" | "withdraw";
      amount: number;
    };

    if (!type || !amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid deposit/withdraw request" },
        { status: 400 }
      );
    }

    if (type === "withdraw" && amount > wallet.balance) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    if (type === "deposit") {
      wallet.balance += amount;
    } else {
      wallet.balance -= amount;
    }

    wallet.transactions.unshift({
      id: nextTxId++,
      type,
      amount,
      date: new Date().toISOString(),
    });

    return NextResponse.json(wallet);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
