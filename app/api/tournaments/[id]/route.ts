import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import { Tournament } from "../../../models/Tournament";
import { User } from "../../../models/User";
import { Wallet } from "../../../models/Wallet";

const FEE_MAP: Record<string, number> = { "€5": 5, "€10": 10 };

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id }     = await params;
    const { action } = await req.json();

    if (action === "cancel") {
      const tournament = await Tournament.findById(id);
      if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

      const feeAmount = FEE_MAP[tournament.fee] ?? 0;

      // Refund all fee-paying participants
      if (feeAmount > 0) {
        const participants = await User.find({ activeTournamentId: id });
        for (const p of participants) {
          let wallet = await Wallet.findOne({ userId: p._id.toString() });
          if (!wallet) continue;
          wallet.balance += feeAmount;
          wallet.transactions.unshift({
            type:        "refund",
            amount:      feeAmount,
            description: `Refund: "${tournament.title}" cancelled`,
            createdAt:   new Date(),
          });
          await wallet.save();
        }
      }

      // Clear activeTournamentId for all participants
      await User.updateMany({ activeTournamentId: id }, { $unset: { activeTournamentId: "" } });

      tournament.status = "Cancelled";
      await tournament.save();
      return NextResponse.json({ message: "Tournament cancelled. Refunds processed.", tournament });
    }

    if (action === "boost") {
      const boostedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tournament   = await Tournament.findByIdAndUpdate(
        id,
        { boosted: true, boostedUntil },
        { new: true }
      );
      if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
      return NextResponse.json({ message: "Tournament boosted for 24 hours.", tournament });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
