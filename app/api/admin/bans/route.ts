import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import { Ban } from "../../../models/Ban";
import type { BanDuration } from "../../../models/Ban";

export async function GET() {
  try {
    await connectToDatabase();
    const bans = await Ban.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ bans });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      fniUsername, steamUsername, epicUsername,
      reason, issuedBy, duration,
      issuedByUserId, issuedByRole,
      severity, restrictedGmId,
    } = body;

    if (!fniUsername || !reason || !issuedBy || !duration) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const validDurations: BanDuration[] = [
      "1hour","6hours","12hours","1day","3days","1week",
      "2weeks","1month","3months","6months","12months","24months","permanent",
    ];
    if (!validDurations.includes(duration)) {
      return NextResponse.json({ message: "Invalid duration" }, { status: 400 });
    }

    // Determine scope: severe infractions or mod/admin bans are always platform-wide
    const role     = issuedByRole ?? "gm";
    const sev      = severity    ?? "standard";
    const scope    = (sev === "severe" || role !== "gm") ? "platform" : "gm_only";

    const ban = await Ban.create({
      fniUsername, steamUsername, epicUsername,
      reason, issuedBy, duration,
      issuedByUserId,
      issuedByRole:   role,
      severity:       sev,
      scope,
      restrictedGmId: scope === "gm_only" ? restrictedGmId : undefined,
    });

    return NextResponse.json({ ban }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
