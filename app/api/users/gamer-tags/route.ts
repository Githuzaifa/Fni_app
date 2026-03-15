import { NextRequest, NextResponse } from "next/server";
import { User } from "@/app/models/User";
import { connectToDatabase } from "@/app/lib/mongodb"

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();

    const { userId, gamerTags } = await req.json();

    if (!userId || !gamerTags) {
      return NextResponse.json(
        { message: "userId and gamerTags are required" },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { gamerTags },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Gamer tags updated successfully", gamerTags: user.gamerTags },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update gamer tags error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}