import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { Tournament } from "../../../../models/Tournament";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    await Tournament.findByIdAndDelete(id);
    return NextResponse.json({ message: "Tournament deleted" });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
