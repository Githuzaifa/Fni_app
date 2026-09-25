// Creates a Lichess "open challenge" via Lichess's official API
// (https://lichess.org/api#tag/Challenges/operation/challengeOpen).
//
// Every open challenge — restricted or not — comes back with two separate
// join links (one seats you as White, the other as Black) plus a general
// spectate link. Passing `usernameWhite`/`usernameBlack` additionally locks
// those two seats to those exact Lichess accounts (Lichess itself enforces
// this — anyone else opening the link can only spectate). Omit them and the
// links are open to whoever clicks first; the GM is then responsible for
// telling each player which of the two links is theirs.
//
// This endpoint requires no authentication (Lichess's own API spec marks it
// as public — `security: []` — specifically so third-party sites can embed
// it). LICHESS_API_TOKEN is entirely optional: set it only if you want these
// challenges to be created "by" a specific FnI-branded Lichess account rather
// than anonymously (e.g. for nicer attribution, or higher rate limits).

interface LichessChallengeResult {
  gameUrl:   string;
  whiteUrl?: string;
  blackUrl?: string;
}

export async function createLichessChallenge(opts: {
  usernameWhite?: string;
  usernameBlack?: string;
  name: string;
}): Promise<LichessChallengeResult | null> {
  const token = process.env.LICHESS_API_TOKEN; // optional

  const body = new URLSearchParams({
    rated:             "false",
    "clock.limit":     "600", // 10 minutes
    "clock.increment": "0",
    variant:           "standard",
    name:              opts.name.slice(0, 30), // Lichess caps the challenge name length
  });
  if (opts.usernameWhite && opts.usernameBlack) {
    body.set("users", `${opts.usernameWhite},${opts.usernameBlack}`);
  }

  try {
    const res = await fetch("https://lichess.org/api/challenge/open", {
      method:  "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      console.error("Lichess challenge/open failed:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    const id      = data.id ?? data.challenge?.id;
    const gameUrl = data.url ?? data.challenge?.url ?? (id ? `https://lichess.org/${id}` : null);
    if (!gameUrl) return null;

    return {
      gameUrl,
      whiteUrl: data.whiteUrl ?? data.urlWhite,
      blackUrl: data.blackUrl ?? data.urlBlack,
    };
  } catch (err) {
    console.error("Lichess challenge/open error:", err);
    return null;
  }
}
