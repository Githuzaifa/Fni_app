import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookie from "cookie";
import { connectToDatabase } from "../../../lib/mongodb";
import { User } from "../../../models/User";

// In your login API route
export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const { email, password } = await req.json();

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

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });

    const setCookieHeader = cookie.serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    // Convert to plain object and handle the Map properly
    const userObject = user.toObject();
    const { password: _, ...userWithoutPassword } = userObject;
    
    // Ensure gamerTags is properly converted from Map to plain object
    if (userWithoutPassword.gamerTags) {
      if (userWithoutPassword.gamerTags instanceof Map) {
        userWithoutPassword.gamerTags = Object.fromEntries(userWithoutPassword.gamerTags);
      }
    } else {
      userWithoutPassword.gamerTags = {};
    }

    // Ensure elo is properly converted from Map to plain object
    if (userWithoutPassword.elo instanceof Map) {
      userWithoutPassword.elo = Object.fromEntries(userWithoutPassword.elo);
    }
    if (!userWithoutPassword.elo) {
      userWithoutPassword.elo = { rocketLeague: 100, apexLegends: 100, valorant: 100 };
    }

    return new NextResponse(
      JSON.stringify({
        message: "Login successful",
        user: userWithoutPassword,
      }),
      {
        status: 200,
        headers: { "Set-Cookie": setCookieHeader },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
