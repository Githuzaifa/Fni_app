import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { getUserFromRequest } from "../../../../lib/auth";
import { Tournament } from "../../../../models/Tournament";
import { User } from "../../../../models/User";
import { Wallet } from "../../../../models/Wallet";

const FEE_MAP: Record<string, number> = { "€5": 5, "€10": 10 };

const GAME_ID: Record<string, string> = {
  "Rocket League": "rocketLeague",
  "Apex Legends":  "apexLegends",
  "Valorant":      "valorant",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ message: "Login required" }, { status: 401 });

    const { id } = await params;
    const { gamerTag } = await req.json().catch(() => ({}));

    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

    if (tournament.status === "Cancelled") {
      return NextResponse.json({ message: "Tournament is cancelled" }, { status: 400 });
    }
    if ((tournament.currentParticipants ?? 0) >= tournament.maxParticipants) {
      return NextResponse.json({ message: "Tournament is full" }, { status: 400 });
    }

    // Lock check
    if (tournament.lockEnabled && tournament.scheduledAt) {
      const offset  = tournament.type === "Ice" ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
      const lockAt  = new Date(new Date(tournament.scheduledAt).getTime() - offset);
      if (new Date() >= lockAt) {
        return NextResponse.json({ message: "Registration is locked for this tournament" }, { status: 400 });
      }
    }

    // 1-tournament limit
    if (currentUser.activeTournamentId) {
      return NextResponse.json({ message: "You are already in a tournament" }, { status: 400 });
    }

    // ELO check
    const gameId = GAME_ID[tournament.game];
    if (gameId && (tournament.eloMin !== undefined || tournament.eloMax !== undefined)) {
      const eloMap = currentUser.elo instanceof Map
        ? currentUser.elo
        : new Map(Object.entries(currentUser.elo ?? {}));
      const userElo = (eloMap.get(gameId) as number) ?? 400;
      if (tournament.eloMin !== undefined && userElo < tournament.eloMin) {
        return NextResponse.json({ message: `ELO too low (${userElo}). Minimum: ${tournament.eloMin}` }, { status: 400 });
      }
      if (tournament.eloMax !== undefined && userElo > tournament.eloMax) {
        return NextResponse.json({ message: `ELO too high (${userElo}). Maximum: ${tournament.eloMax}` }, { status: 400 });
      }
    }

    // Charge entry fee
    const feeAmount = FEE_MAP[tournament.fee] ?? 0;
    let newBalance: number | undefined;

    if (feeAmount > 0) {
      let wallet = await Wallet.findOne({ userId: currentUser._id.toString() });
      if (!wallet) wallet = await Wallet.create({ userId: currentUser._id.toString(), balance: 0 });
      if (wallet.balance < feeAmount) {
        return NextResponse.json({ message: `Insufficient balance. Entry fee: €${feeAmount}` }, { status: 400 });
      }
      wallet.balance   -= feeAmount;
      wallet.transactions.push({
        type:        "fee",
        amount:      feeAmount,
        description: `Entry fee: ${tournament.title}`,
      });
      await wallet.save();
      newBalance = wallet.balance;
    }

    // Persist participation
    await Tournament.findByIdAndUpdate(id, { $inc: { currentParticipants: 1 } });
    await User.findByIdAndUpdate(currentUser._id, { activeTournamentId: id });

    return NextResponse.json({
      message:             "Joined successfully",
      currentParticipants: (tournament.currentParticipants ?? 0) + 1,
      walletBalance:       newBalance,
      gamerTag,
    });
  } catch (err) {
    console.error("Join error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
