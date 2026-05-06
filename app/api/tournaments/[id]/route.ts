import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import { Tournament } from "../../../models/Tournament";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { action } = await req.json();

    if (action === "cancel") {
      const tournament = await Tournament.findByIdAndUpdate(
        params.id,
        { status: "Cancelled" },
        { new: true }
      );
      if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
      return NextResponse.json({ message: "Tournament cancelled. Refunds will be processed within 24 hours.", tournament });
    }

    if (action === "boost") {
      const boostedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tournament = await Tournament.findByIdAndUpdate(
        params.id,
        { boosted: true, boostedUntil },
        { new: true }
      );
      if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
      return NextResponse.json({ message: "Tournament boosted for 24 hours.", tournament });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
