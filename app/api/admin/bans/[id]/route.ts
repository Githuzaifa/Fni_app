import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { Ban } from "../../../../models/Ban";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { status } = await req.json();
    const ban = await Ban.findByIdAndUpdate(id, { status }, { new: true });
    if (!ban) return NextResponse.json({ message: "Ban not found" }, { status: 404 });
    return NextResponse.json({ ban });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    await Ban.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
