import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import { Tournament } from "../../../models/Tournament";

export async function GET() {
  try {
    await connectToDatabase();
    const tournaments = await Tournament.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ tournaments });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
