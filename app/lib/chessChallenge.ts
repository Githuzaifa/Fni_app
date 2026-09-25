import { createLichessChallenge } from "./lichessChallenge";
import { postSystemMessage } from "./pusherServer";

// Games where an auto-created Lichess link applies.
const LICHESS_GAMES = new Set(["Chess (Lichess)"]);

interface MinimalParticipant {
  userId:   string;
  username: string;
  gamerTag?: string;
}

interface MinimalMatch {
  matchId:      string;
  label:        string;
  playerAId?:   string;
  playerAName?: string;
  playerBId?:   string;
  playerBName?: string;
  status:       string;
  externalGameUrl?:  string;
  externalWhiteUrl?: string;
  externalBlackUrl?: string;
}

// When a match becomes ready in a Chess (Lichess) tournament, auto-creates a
// Lichess game link and posts it into the lobby chat. No-ops for every other
// game, and falls back to a "please share a link manually" chat message only
// if the Lichess API call itself fails — so the tournament is never blocked.
//
// If both players have a Lichess username on file (their gamer tag for
// chess), the link is locked to those two accounts by Lichess itself — no one
// else can take either seat. Otherwise it creates an open link instead: two
// join links that anyone can use, and the chat message explicitly tells the
// GM which named player should click which one.
export async function autoCreateChessLink(
  tournamentId: string,
  tournamentGame: string,
  tournamentTitle: string,
  participantSnapshot: MinimalParticipant[],
  match: MinimalMatch
): Promise<void> {
  if (!LICHESS_GAMES.has(tournamentGame)) return;
  if (match.status !== "ready" || !match.playerAId || !match.playerBId) return;
  if (match.externalGameUrl) return; // already created

  const playerA = participantSnapshot.find((p) => p.userId === match.playerAId);
  const playerB = participantSnapshot.find((p) => p.userId === match.playerBId);
  const tagA = playerA?.gamerTag?.trim();
  const tagB = playerB?.gamerTag?.trim();
  const restricted = !!tagA && !!tagB;

  const challenge = await createLichessChallenge({
    usernameWhite: restricted ? tagA : undefined,
    usernameBlack: restricted ? tagB : undefined,
    name: `FnI: ${tournamentTitle}`,
  });

  if (!challenge) {
    await postSystemMessage(
      tournamentId,
      `♟️ ${match.label} is ready: ${match.playerAName} vs ${match.playerBName} — couldn't auto-create a Lichess link right now. Please start a private game on Lichess and share the link here.`
    );
    return;
  }

  match.externalGameUrl  = challenge.gameUrl;
  match.externalWhiteUrl = challenge.whiteUrl;
  match.externalBlackUrl = challenge.blackUrl;

  if (restricted) {
    await postSystemMessage(
      tournamentId,
      `♟️ ${match.label} ready — ${match.playerAName} (White) vs ${match.playerBName} (Black), links locked to their Lichess accounts. ` +
      `${match.playerAName}, join: ${challenge.whiteUrl ?? challenge.gameUrl} | ` +
      `${match.playerBName}, join: ${challenge.blackUrl ?? challenge.gameUrl} | ` +
      `Everyone else, watch: ${challenge.gameUrl}`
    );
  } else {
    await postSystemMessage(
      tournamentId,
      `♟️ ${match.label} ready — ${match.playerAName} vs ${match.playerBName}. These links are open to whoever clicks first, so TO please assign them: ` +
      `LINK 1 (White): ${challenge.whiteUrl ?? challenge.gameUrl} → give to ${match.playerAName} | ` +
      `LINK 2 (Black): ${challenge.blackUrl ?? challenge.gameUrl} → give to ${match.playerBName} | ` +
      `Everyone else, watch: ${challenge.gameUrl}`
    );
  }
}
