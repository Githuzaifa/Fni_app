import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import { User } from "../../../models/User";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const users = await User.find(
      q ? { username: { $regex: q, $options: "i" } } : {},
      { username: 1, steamUsername: 1, epicUsername: 1, _id: 0 }
    )
      .limit(20)
      .lean();

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
