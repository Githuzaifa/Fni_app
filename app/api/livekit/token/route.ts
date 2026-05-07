import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: Request) {
  const { lobbyId, username } = await req.json();
  if (!lobbyId || !username) {
    return NextResponse.json({ message: "Missing lobbyId or username" }, { status: 400 });
  }

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: username, name: username }
  );

  at.addGrant({
    room:         `lobby-${lobbyId}`,
    roomJoin:     true,
    canPublish:   true,  // everyone can share their screen
    canSubscribe: true,  // everyone can view
  });

  return NextResponse.json({ token: await at.toJwt() });
}
