import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { Ban } from "../../../../models/Ban";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { status } = await req.json();
    const ban = await Ban.findByIdAndUpdate(params.id, { status }, { new: true });
    if (!ban) return NextResponse.json({ message: "Ban not found" }, { status: 404 });
    return NextResponse.json({ ban });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    await Ban.findByIdAndDelete(params.id);
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
