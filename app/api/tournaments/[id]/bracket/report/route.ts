import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { getUserFromRequest } from "../../../../../lib/auth";
import { Tournament } from "../../../../../models/Tournament";
import { Bracket, IMatch } from "../../../../../models/Bracket";
import { applyMatchResult } from "../../../../../lib/bracketEngine";

// POST /api/tournaments/[id]/bracket/report — GM reports a match result (auto or manual schedules)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ message: "Login required" }, { status: 401 });

    const { id } = await params;
    const { matchId, scoreA, scoreB } = await req.json() as { matchId: string; scoreA: number; scoreB: number };

    if (!matchId || typeof scoreA !== "number" || typeof scoreB !== "number") {
      return NextResponse.json({ message: "matchId, scoreA and scoreB are required" }, { status: 400 });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

    const isOwner = tournament.createdBy === currentUser._id.toString() ||
                    tournament.createdBy === currentUser.username;
    if (!isOwner && currentUser.role !== "admin") {
      return NextResponse.json({ message: "Only this tournament's creator can report results" }, { status: 403 });
    }

    const bracket = await Bracket.findOne({ tournamentId: id });
    if (!bracket) return NextResponse.json({ message: "No schedule exists yet for this tournament" }, { status: 404 });

    const matchesPlain: IMatch[] = (bracket.matches as any[]).map((m) =>
      typeof m.toObject === "function" ? m.toObject() : m
    );
    let result;
    try {
      result = applyMatchResult(matchesPlain, matchId, scoreA, scoreB);
    } catch (e: any) {
      return NextResponse.json({ message: e.message ?? "Could not report result" }, { status: 400 });
    }

    bracket.matches    = matchesPlain as any;
    bracket.standings  = result.standings as any;
    bracket.status     = result.status;
    bracket.markModified("matches");
    await bracket.save();

    return NextResponse.json({ bracket });
  } catch (err) {
    console.error("Report match result error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
