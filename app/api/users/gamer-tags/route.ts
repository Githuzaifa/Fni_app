import { NextRequest, NextResponse } from "next/server";
import { User } from "@/app/models/User";
import { connectToDatabase } from "@/app/lib/mongodb"

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();

    const { userId, gamerTags } = await req.json();

    if (!userId || !gamerTags || typeof gamerTags !== 'object') {
      return NextResponse.json(
        { message: "userId and gamerTags object are required" },
        { status: 400 }
      );
    }

    // Using Record type for better TypeScript support
    const updateObject: Record<string, string> = {};
    
    Object.keys(gamerTags).forEach(gameId => {
      updateObject[`gamerTags.${gameId}`] = gamerTags[gameId];
    });

    // Use $set to update/add specific game tags without removing others
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateObject },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        message: "Gamer tags updated successfully", 
        gamerTags: user.gamerTags 
      },
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