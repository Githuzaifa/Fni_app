import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { getUserFromRequest } from "../../../../lib/auth";
import { Tournament } from "../../../../models/Tournament";
import { User } from "../../../../models/User";
import { Wallet } from "../../../../models/Wallet";

const FEE_MAP: Record<string, number> = { "€5": 5, "€10": 10 };

// FnI keeps 10% of every prize pool as platform commission
const COMMISSION_RATE = 0.10;

function teamSize(format: string): number {
  return parseInt(format.split("v")[0]) || 1;
}

function grossPrizePool(
  feeAmount: number,
  activePlayers: number,
  feeType: string,
  format: string
): number {
  if (feeType === "per_team") {
    const teams = Math.ceil(activePlayers / teamSize(format));
    return feeAmount * teams;
  }
  return feeAmount * activePlayers;
}
const GAME_ID: Record<string, string> = {
  "The Scouring":   "scouring",
  "Age of Empires 2": "ageOfEmpires2",
  "War of Dots":    "warOfDots",
};

// Simple Elo delta: winner gains 25, loser loses 15, floor at 100
function eloDeltas(
  participants: { userId: string; noShow?: boolean }[],
  winnerId: string
): Map<string, number> {
  const deltas = new Map<string, number>();
  for (const p of participants) {
    if (p.noShow) continue;
    deltas.set(p.userId, p.userId === winnerId ? 25 : -15);
  }
  return deltas;
}

// POST /api/tournaments/[id]/end
// Body: { winnerUserId: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ message: "Login required" }, { status: 401 });

    const { id } = await params;
    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

    // Only creator or admin/moderator can end
    const role    = currentUser.role ?? "player";
    const isOwner = tournament.createdBy === currentUser._id.toString() ||
                    tournament.createdBy === currentUser.username;
    if (!isOwner && !["moderator", "admin"].includes(role)) {
      return NextResponse.json({ message: "Not authorised to end this tournament" }, { status: 403 });
    }

    if (tournament.status === "Completed") {
      return NextResponse.json({ message: "Tournament already ended" }, { status: 400 });
    }
    if (tournament.status === "Cancelled") {
      return NextResponse.json({ message: "Tournament is cancelled" }, { status: 400 });
    }

    const { winnerUserId } = await req.json() as { winnerUserId: string };
    if (!winnerUserId) {
      return NextResponse.json({ message: "winnerUserId is required" }, { status: 400 });
    }

    const winnerParticipant = tournament.participants.find((p) => p.userId === winnerUserId);
    if (!winnerParticipant) {
      return NextResponse.json({ message: "Winner not found in participants" }, { status: 400 });
    }

    // Calculate prize pool
    const feeAmount     = FEE_MAP[tournament.fee] ?? 0;
    const activePlayers = tournament.participants.filter((p) => !p.noShow).length;
    const gross         = grossPrizePool(feeAmount, activePlayers, tournament.feeType, tournament.format);
    const commission    = Math.round(gross * COMMISSION_RATE * 100) / 100;
    const netPrize      = Math.round((gross - commission) * 100) / 100;

    // Credit winner wallet (net of commission)
    if (netPrize > 0) {
      let wallet = await Wallet.findOne({ userId: winnerUserId });
      if (!wallet) wallet = await Wallet.create({ userId: winnerUserId, balance: 0 });
      wallet.balance += netPrize;
      wallet.transactions.unshift({
        type:        "prize",
        amount:      netPrize,
        description: `Prize: won "${tournament.title}" (10% platform fee deducted)`,
        createdAt:   new Date(),
      });
      await wallet.save();
    }

    // Update ELO for all participants
    const gameId = GAME_ID[tournament.game];
    if (gameId) {
      const deltas = eloDeltas(tournament.participants, winnerUserId);
      for (const [userId, delta] of deltas) {
        const dbUser = await User.findById(userId);
        if (!dbUser) continue;
        const eloMap: Map<string, number> = dbUser.elo instanceof Map
          ? dbUser.elo
          : new Map(Object.entries(dbUser.elo ?? {}));
        const current = eloMap.get(gameId) ?? 400;
        eloMap.set(gameId, Math.max(100, current + delta));
        dbUser.elo = Object.fromEntries(eloMap) as any;
        await dbUser.save();
      }
    }

    // Clear activeTournamentId for all participants
    const userIds = tournament.participants.map((p) => p.userId);
    if (userIds.length > 0) {
      await User.updateMany(
        { _id: { $in: userIds } },
        { $unset: { activeTournamentId: "" } }
      );
    }

    // Mark tournament as completed
    tournament.status         = "Completed";
    tournament.winnerId       = winnerUserId;
    tournament.winnerUsername = winnerParticipant.username;
    await tournament.save();

    return NextResponse.json({
      message:        "Tournament ended",
      winner:         winnerParticipant.username,
      grossPrizePool: gross,
      commission,
      prizeAwarded:   netPrize,
    });
  } catch (err) {
    console.error("End tournament error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
