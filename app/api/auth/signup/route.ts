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

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser.toObject();

    return new NextResponse(
      JSON.stringify({
        message: "User registered successfully",
        user: userWithoutPassword,
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
