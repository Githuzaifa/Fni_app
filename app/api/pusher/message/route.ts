import { NextResponse } from "next/server";
import { pusherServer } from "../../../lib/pusherServer";

export async function POST(req: Request) {
  const { lobbyId, username, text } = await req.json();
  if (!lobbyId || !username || !text?.trim()) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  await pusherServer.trigger(`lobby-${lobbyId}`, "new-message", {
    username,
    text:      text.trim(),
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
