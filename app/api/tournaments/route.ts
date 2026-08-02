import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../lib/mongodb";
import { getUserFromRequest } from "../../lib/auth";
import { Tournament } from "../../models/Tournament";

export async function GET() {
  try {
    await connectToDatabase();
    const tournaments = await Tournament.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ tournaments });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const currentUser = await getUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ message: "Login required" }, { status: 401 });
    }

    const role = currentUser.role ?? "player";
    if (!["gm", "moderator", "admin"].includes(role)) {
      return NextResponse.json(
        { message: "Only Game Masters can create tournaments" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title, game, type, format, maxParticipants,
      scheduledAt, fee, feeType, region, eloMin, eloMax, prizes,
    } = body;

    if (!title || !game || !type || !format || !maxParticipants || !scheduledAt) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const tournament = await Tournament.create({
      title, game, type, format, maxParticipants,
      scheduledAt, fee, feeType, region, eloMin, eloMax,
      createdBy: currentUser._id.toString(),
      prizes,
    });

    return NextResponse.json({ tournament }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
