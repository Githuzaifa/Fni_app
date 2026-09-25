import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { getUserFromRequest } from "../../../../../lib/auth";
import { Tournament } from "../../../../../models/Tournament";
import { Bracket } from "../../../../../models/Bracket";

// POST /api/tournaments/[id]/bracket/matches — GM manually adds one match (manual mode only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ message: "Login required" }, { status: 401 });

    const { id } = await params;
    const { round, playerAId, playerBId } = await req.json() as { round: number; playerAId: string; playerBId: string };

    if (!round || round < 1 || !playerAId || !playerBId) {
      return NextResponse.json({ message: "round, playerAId and playerBId are required" }, { status: 400 });
    }
    if (playerAId === playerBId) {
      return NextResponse.json({ message: "A match needs two different players" }, { status: 400 });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

    const isOwner = tournament.createdBy === currentUser._id.toString() ||
                    tournament.createdBy === currentUser.username;
    if (!isOwner && currentUser.role !== "admin") {
      return NextResponse.json({ message: "Only this tournament's creator can edit its schedule" }, { status: 403 });
    }

    const bracket = await Bracket.findOne({ tournamentId: id });
    if (!bracket) return NextResponse.json({ message: "No schedule exists yet for this tournament" }, { status: 404 });
    if (bracket.mode !== "manual") {
      return NextResponse.json({ message: "This tournament's schedule was auto-generated" }, { status: 400 });
    }

    const playerA = bracket.participantSnapshot.find((p) => p.userId === playerAId);
    const playerB = bracket.participantSnapshot.find((p) => p.userId === playerBId);
    if (!playerA || !playerB) {
      return NextResponse.json({ message: "Both players must be participants in this tournament" }, { status: 400 });
    }

    const matchId = `manual-${bracket.matches.length + 1}`;
    bracket.matches.push({
      matchId,
      round,
      stage: "manual",
      label: `Round ${round}`,
      slotASource: { type: "participant" },
      slotBSource: { type: "participant" },
      playerAId: playerA.userId,
      playerAName: playerA.username,
      playerBId: playerB.userId,
      playerBName: playerB.username,
      status: "ready",
    } as any);

    await bracket.save();
    return NextResponse.json({ bracket }, { status: 201 });
  } catch (err) {
    console.error("Add manual match error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
