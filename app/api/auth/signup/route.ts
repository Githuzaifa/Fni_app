import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "../../../lib/mongodb";
import { User } from "../../../models/User";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const { firstName, lastName, age, email, username, password, nation } = await req.json();

    if (!firstName || !lastName || !age || !email || !username || !password || !nation) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    const PASSWORD_RE = /^(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]).{8,}$/;
    if (!PASSWORD_RE.test(password)) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters and contain at least 1 symbol (e.g. !@#$%)" },
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

    const token = jwt.sign(
      { userId: newUser._id, role: "player" },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    const sessionExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const userObject = newUser.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    let eloObject = userWithoutPassword.elo;
    if (eloObject instanceof Map) {
      eloObject = Object.fromEntries(eloObject);
    }

    const userWithElo = {
      ...userWithoutPassword,
      elo: eloObject || { scouring: 400, ageOfEmpires2: 400, warOfDots: 400 },
    };

    const response = NextResponse.json(
      { message: "User registered successfully", user: userWithElo, sessionExpiresAt },
      { status: 201 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
