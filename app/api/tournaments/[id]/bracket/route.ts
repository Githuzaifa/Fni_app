import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { getUserFromRequest } from "../../../../lib/auth";
import { Tournament } from "../../../../models/Tournament";
import { Bracket } from "../../../../models/Bracket";
import { generateAutoBracket } from "../../../../lib/bracketEngine";
import { autoCreateChessLink } from "../../../../lib/chessChallenge";

// GET /api/tournaments/[id]/bracket — anyone logged in can view the schedule
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ message: "Login required" }, { status: 401 });

    const { id } = await params;
    const bracket = await Bracket.findOne({ tournamentId: id }).lean();
    return NextResponse.json({ bracket: bracket ?? null });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST /api/tournaments/[id]/bracket — GM generates the schedule (auto or manual)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ message: "Login required" }, { status: 401 });

    const { id } = await params;
    const { mode } = await req.json() as { mode: "auto" | "manual" };
    if (mode !== "auto" && mode !== "manual") {
      return NextResponse.json({ message: "mode must be 'auto' or 'manual'" }, { status: 400 });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

    const isOwner = tournament.createdBy === currentUser._id.toString() ||
                    tournament.createdBy === currentUser.username;
    if (!isOwner && !["admin"].includes(currentUser.role ?? "")) {
      return NextResponse.json({ message: "Only this tournament's creator can generate its schedule" }, { status: 403 });
    }

    const existing = await Bracket.findOne({ tournamentId: id });
    if (existing) {
      return NextResponse.json({ message: "A schedule already exists for this tournament" }, { status: 400 });
    }

    const activePlayers = tournament.participants.filter((p) => !p.noShow);
    if (activePlayers.length < 2) {
      return NextResponse.json({ message: "At least 2 active participants are required to generate a schedule" }, { status: 400 });
    }

    const participantSnapshot = activePlayers.map((p) => ({
      userId: p.userId, username: p.username, gamerTag: p.gamerTag, elo: p.elo, team: p.team,
    }));

    let matches: any[] = [];
    let standings: any[] = [];
    let status: "in_progress" | "completed" = "in_progress";

    if (mode === "auto") {
      const generated = generateAutoBracket(activePlayers.map((p) => ({ userId: p.userId, username: p.username })));
      matches    = generated.matches;
      standings  = generated.standings;
      status     = generated.status;
    }

    const bracket = await Bracket.create({
      tournamentId: id,
      mode,
      createdBy: currentUser._id.toString(),
      participantSnapshot,
      matches,
      standings,
      status,
    });

    // Auto-create a Lichess link for any round-1 matches that are already
    // ready to play (chess tournaments only — no-op for everything else).
    const readyMatches = bracket.matches.filter((m) => m.status === "ready");
    if (readyMatches.length > 0) {
      await Promise.all(readyMatches.map((m) =>
        autoCreateChessLink(id, tournament.game, tournament.title, bracket.participantSnapshot, m)
      ));
      bracket.markModified("matches");
      await bracket.save();
    }

    return NextResponse.json({ bracket }, { status: 201 });
  } catch (err) {
    console.error("Generate bracket error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
