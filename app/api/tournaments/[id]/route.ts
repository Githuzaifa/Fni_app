import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import { getUserFromRequest } from "../../../lib/auth";
import { Tournament } from "../../../models/Tournament";
import { User } from "../../../models/User";
import { Wallet } from "../../../models/Wallet";

const FEE_MAP: Record<string, number> = { "€5": 5, "€10": 10 };

async function resolveUser(req: NextRequest) {
  await connectToDatabase();
  return getUserFromRequest(req);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id }       = await params;
    const tournament   = await Tournament.findById(id).lean();
    if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

    // Attach lobby access info if user is authenticated
    const currentUser  = await getUserFromRequest(req);
    const userId       = currentUser?._id?.toString() ?? "";
    const isCreator    = tournament.createdBy === userId ||
                         tournament.createdBy === currentUser?.username;
    const isParticipant = (tournament as any).participants?.some(
      (p: any) => p.userId === userId
    ) ?? false;

    return NextResponse.json({ tournament, isCreator, isParticipant });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await resolveUser(req);
    if (!currentUser) return NextResponse.json({ message: "Login required" }, { status: 401 });

    const { id }     = await params;
    const { action } = await req.json();

    if (action === "open-lobby") {
      const tournament = await Tournament.findById(id);
      if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

      const isOwner = tournament.createdBy === currentUser._id.toString() ||
                      tournament.createdBy === currentUser.username;
      if (!isOwner && !["moderator", "admin"].includes(currentUser.role ?? "")) {
        return NextResponse.json({ message: "Not authorised" }, { status: 403 });
      }
      if (tournament.status === "Cancelled" || tournament.status === "Completed") {
        return NextResponse.json({ message: "Cannot open lobby for this tournament" }, { status: 400 });
      }

      tournament.status = "Active";
      await tournament.save();
      return NextResponse.json({ message: "Lobby opened. Participants can now join.", tournament });
    }

    if (action === "cancel") {
      const tournament = await Tournament.findById(id);
      if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

      const role = currentUser.role ?? "player";
      const isOwner = tournament.createdBy === currentUser._id.toString() ||
                      tournament.createdBy === currentUser.username;
      if (!isOwner && !["moderator", "admin"].includes(role)) {
        return NextResponse.json({ message: "Not authorised to cancel this tournament" }, { status: 403 });
      }

      const feeAmount = FEE_MAP[tournament.fee] ?? 0;

      // Refund via participants array (guaranteed correct list)
      if (feeAmount > 0 && tournament.participants.length > 0) {
        for (const p of tournament.participants) {
          if (p.noShow) continue;
          const wallet = await Wallet.findOne({ userId: p.userId });
          if (!wallet) continue;
          wallet.balance += feeAmount;
          wallet.transactions.unshift({
            type:      "refund",
            amount:    feeAmount,
            description: `Refund: "${tournament.title}" cancelled`,
            createdAt: new Date(),
          });
          await wallet.save();
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

      tournament.status = "Cancelled";
      await tournament.save();
      return NextResponse.json({ message: "Tournament cancelled. Refunds processed.", tournament });
    }

    if (action === "boost") {
      const tournament = await Tournament.findById(id);
      if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

      const isOwner = tournament.createdBy === currentUser._id.toString() ||
                      tournament.createdBy === currentUser.username;
      if (!isOwner && currentUser.role !== "admin") {
        return NextResponse.json({ message: "Not authorised" }, { status: 403 });
      }

      const boostedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tournament.boosted = true;
      tournament.boostedUntil = boostedUntil;
      await tournament.save();
      return NextResponse.json({ message: "Tournament boosted for 24 hours.", tournament });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await resolveUser(req);
    if (!currentUser) return NextResponse.json({ message: "Login required" }, { status: 401 });

    const role = currentUser.role ?? "player";
    if (!["gm", "moderator", "admin"].includes(role)) {
      return NextResponse.json({ message: "Only GMs can delete tournaments" }, { status: 403 });
    }

    const { id } = await params;
    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

    const isOwner = tournament.createdBy === currentUser._id.toString() ||
                    tournament.createdBy === currentUser.username;
    if (!isOwner && role !== "admin") {
      return NextResponse.json({ message: "You can only delete your own tournaments" }, { status: 403 });
    }

    // If there are active participants, refund then clear them
    const feeAmount = FEE_MAP[tournament.fee] ?? 0;
    if (feeAmount > 0 && tournament.participants.length > 0) {
      for (const p of tournament.participants) {
        if (p.noShow) continue;
        const wallet = await Wallet.findOne({ userId: p.userId });
        if (!wallet) continue;
        wallet.balance += feeAmount;
        wallet.transactions.unshift({
          type:        "refund",
          amount:      feeAmount,
          description: `Refund: "${tournament.title}" deleted by GM`,
          createdAt:   new Date(),
        });
        await wallet.save();
      }
    }

    const userIds = tournament.participants.map((p) => p.userId);
    if (userIds.length > 0) {
      await User.updateMany(
        { _id: { $in: userIds } },
        { $unset: { activeTournamentId: "" } }
      );
    }

    await Tournament.findByIdAndDelete(id);
    return NextResponse.json({ message: "Tournament deleted." });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
