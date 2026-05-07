import { NextResponse } from "next/server";

const DAILY_API = "https://api.daily.co/v1";

async function getRoom(name: string) {
  const res = await fetch(`${DAILY_API}/rooms/${name}`, {
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
  });
  if (res.ok) return res.json();
  return null;
}

export async function POST(req: Request) {
  const { lobbyId } = await req.json();
  const name = `fni-lobby-${lobbyId}`;

  // Return existing room if it exists
  const existing = await getRoom(name);
  if (existing) return NextResponse.json({ url: existing.url });

  // Create new room
  const res = await fetch(`${DAILY_API}/rooms`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${process.env.DAILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      properties: {
        enable_screenshare:  true,
        enable_chat:         false,
        start_video_off:     true,
        start_audio_off:     true,
        exp: Math.round(Date.now() / 1000) + 60 * 60 * 8, // 8h expiry
      },
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ message: "Failed to create room" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ url: data.url });
}
