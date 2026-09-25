import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { getUserFromRequest } from "../../../../../lib/auth";
import { Tournament } from "../../../../../models/Tournament";
import { Bracket } from "../../../../../models/Bracket";

// PATCH /api/tournaments/[id]/bracket/standings — GM manually finalizes placements (manual mode only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ message: "Login required" }, { status: 401 });

    const { id } = await params;
    const { standings } = await req.json() as { standings: { userId: string; position: number }[] };

    if (!Array.isArray(standings) || standings.length === 0) {
      return NextResponse.json({ message: "standings array is required" }, { status: 400 });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

    const isOwner = tournament.createdBy === currentUser._id.toString() ||
                    tournament.createdBy === currentUser.username;
    if (!isOwner && currentUser.role !== "admin") {
      return NextResponse.json({ message: "Only this tournament's creator can finalize standings" }, { status: 403 });
    }

    const bracket = await Bracket.findOne({ tournamentId: id });
    if (!bracket) return NextResponse.json({ message: "No schedule exists yet for this tournament" }, { status: 404 });
    if (bracket.mode !== "manual") {
      return NextResponse.json({ message: "Standings for auto-generated schedules are computed automatically" }, { status: 400 });
    }

    const resolved = standings.map(({ userId, position }) => {
      const p = bracket.participantSnapshot.find((x) => x.userId === userId);
      if (!p) throw new Error(`Unknown participant: ${userId}`);
      if (!position || position < 1) throw new Error("Position must be a positive number");
      return { userId, username: p.username, position };
    });

    bracket.standings = resolved as any;
    bracket.status = "completed";
    await bracket.save();

    return NextResponse.json({ bracket });
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? "Server error" }, { status: 400 });
  }
}
