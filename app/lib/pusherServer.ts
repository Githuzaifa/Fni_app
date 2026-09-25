import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS:  true,
});

// Posts a "System" chat message into a lobby's live chat. Best-effort — a
// missing/misconfigured Pusher setup should never break the caller's flow.
export async function postSystemMessage(lobbyId: string, text: string): Promise<void> {
  try {
    await pusherServer.trigger(`lobby-${lobbyId}`, "new-message", {
      username:  "System",
      text,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("postSystemMessage failed:", err);
  }
}
