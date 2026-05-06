import { NextResponse } from "next/server";
import { connectToDatabase } from "../../lib/mongodb";
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

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { title, game, type, format, maxParticipants, scheduledAt, fee, eloMin, eloMax, createdBy, prizes } = body;

    if (!title || !game || !type || !format || !maxParticipants || !scheduledAt || !createdBy) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const tournament = await Tournament.create({
      title, game, type, format, maxParticipants, scheduledAt, fee, eloMin, eloMax, createdBy, prizes,
    });

    return NextResponse.json({ tournament }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
