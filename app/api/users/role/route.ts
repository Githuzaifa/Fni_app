import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import { getUserFromRequest } from "../../../lib/auth";
import { User } from "../../../models/User";

type Role = "player" | "gm" | "moderator" | "admin";

const ROLE_RANK: Record<Role, number> = { player: 1, gm: 2, moderator: 3, admin: 4 };

// PATCH /api/users/role
// - A Premium player can self-upgrade to "gm"
// - An admin can set any role on any user (pass targetUserId in body)
export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { role, targetUserId } = await req.json() as { role: Role; targetUserId?: string };

    if (!role || !["player", "gm", "moderator", "admin"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    const currentRole: Role = (currentUser.role as Role) ?? "player";

    // Modifying another user — admin only
    if (targetUserId && targetUserId !== currentUser._id.toString()) {
      if (currentRole !== "admin") {
        return NextResponse.json({ message: "Only admins can change other users' roles" }, { status: 403 });
      }
      const target = await User.findByIdAndUpdate(targetUserId, { role }, { new: true });
      if (!target) return NextResponse.json({ message: "User not found" }, { status: 404 });
      return NextResponse.json({ message: `Role updated to ${role}` });
    }

    // Self-upgrade: only player → gm is allowed, and only with an active Premium subscription
    if (currentRole !== "admin") {
      if (role !== "gm") {
        return NextResponse.json({ message: "Self-upgrade only allowed to Game Master" }, { status: 403 });
      }
      if (ROLE_RANK[role] <= ROLE_RANK[currentRole]) {
        return NextResponse.json({ message: "You already have this or a higher role" }, { status: 400 });
      }
      if (!currentUser.isPremium) {
        return NextResponse.json(
          { message: "A Premium subscription is required to become a Game Master" },
          { status: 403 }
        );
      }
    }

    await User.findByIdAndUpdate(currentUser._id, { role });
    return NextResponse.json({ message: `You are now a ${role}`, role });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
