import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { getUserFromRequest } from "../../../../lib/auth";
import { Tournament } from "../../../../models/Tournament";
import { User } from "../../../../models/User";

// POST /api/tournaments/[id]/noshow
// Body: { userId: string }
// GM marks a player as a no-show: clears their activeTournamentId so they can rejoin future tournaments.
// Entry fee is NOT refunded (forfeit).
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

    const role    = currentUser.role ?? "player";
    const isOwner = tournament.createdBy === currentUser._id.toString() ||
                    tournament.createdBy === currentUser.username;
    if (!isOwner && !["moderator", "admin"].includes(role)) {
      return NextResponse.json({ message: "Not authorised" }, { status: 403 });
    }

    const { userId } = await req.json() as { userId: string };
    if (!userId) return NextResponse.json({ message: "userId is required" }, { status: 400 });

    // Mark participant as no-show in participants array
    const participant = tournament.participants.find((p) => p.userId === userId);
    if (!participant) {
      return NextResponse.json({ message: "User is not a participant" }, { status: 400 });
    }
    participant.noShow = true;
    await tournament.save();

    // Clear their tournament lock so they can join another tournament in future
    await User.findByIdAndUpdate(userId, { $unset: { activeTournamentId: "" } });

    return NextResponse.json({
      message: `${participant.username} marked as no-show. Their slot is freed; entry fee is forfeited.`,
    });
  } catch (err) {
    console.error("No-show error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
