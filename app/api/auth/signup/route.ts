import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookie from "cookie";
import { connectToDatabase } from "../../../lib/mongodb";
import { User } from "../../../models/User";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const {firstName,
        lastName,
        age,
        email,
        username,
        password,
        nation} = await req.json();

    if (!firstName || !lastName || !age || !email || !username || !password || !nation) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      age,
      email,
      username,
      nation,
      password: hashedPassword,
      gamerTags: {},
      // elo will be added automatically by schema default
    });

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });

    // Set cookie for authentication
    const setCookieHeader = cookie.serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    // Convert to object and remove password
    const userObject = newUser.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    let eloObject = userWithoutPassword.elo;
if (eloObject instanceof Map) {
  eloObject = Object.fromEntries(eloObject);
}

    // Ensure elo exists (fallback in case schema default didn't apply)
    const userWithElo = {
      ...userWithoutPassword,
      elo: eloObject || {
        rocketLeague: 100,
        apexLegends: 100,
        valorant: 100
      }
    };

    return new NextResponse(
      JSON.stringify({
        message: "User registered successfully",
        user: userWithElo,
      }),
      {
        status: 201,
        headers: { "Set-Cookie": setCookieHeader },
      }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}