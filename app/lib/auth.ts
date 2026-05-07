import jwt from "jsonwebtoken";
import { connectToDatabase } from "./mongodb";
import { User } from "../models/User";

export async function getUserFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((c) => {
    const [k, v] = c.trim().split("=");
    if (k && v) cookies[k] = v;
  });
  const token = cookies["token"];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    await connectToDatabase();
    return User.findById(decoded.userId);
  } catch {
    return null;
  }
}
