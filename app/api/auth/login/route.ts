import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "../../../lib/mongodb";
import { User } from "../../../models/User";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const { email, password, rememberMe } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 400 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 400 }
      );
    }

    const sessionDuration = rememberMe ? "30d" : "24h";
    const cookieMaxAge    = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    const sessionExpiresAt = Date.now() + cookieMaxAge * 1000;

    const token = jwt.sign(
      { userId: user._id, role: user.role ?? "player" },
      process.env.JWT_SECRET!,
      { expiresIn: sessionDuration }
    );

    // Convert to plain object and handle the Map properly
    const userObject = user.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    if (userWithoutPassword.gamerTags instanceof Map) {
      userWithoutPassword.gamerTags = Object.fromEntries(userWithoutPassword.gamerTags);
    } else if (!userWithoutPassword.gamerTags) {
      userWithoutPassword.gamerTags = {};
    }

    if (userWithoutPassword.elo instanceof Map) {
      userWithoutPassword.elo = Object.fromEntries(userWithoutPassword.elo);
    }
    if (!userWithoutPassword.elo) {
      userWithoutPassword.elo = {
        scouring: 400, ageOfEmpires2: 400, warOfDots: 400,
        rocketLeague: 400, leagueOfLegends: 400, dota2: 400,
        totalWarRome2: 400, cs2: 400, coh3: 400,
        chess: 400, shogi: 400, go: 400, apexLegends: 400,
      };
    }

    const response = NextResponse.json(
      { message: "Login successful", user: userWithoutPassword, sessionExpiresAt },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
