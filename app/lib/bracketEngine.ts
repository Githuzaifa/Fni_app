import { IMatch, ISlotSource, IStanding } from "../models/Bracket";

interface Entrant {
  source: ISlotSource;
  id?:    string;
  name:   string;
}

function participantEntrant(userId: string, username: string): Entrant {
  return { source: { type: "participant" }, id: userId, name: username };
}

function makeMatch(
  matchId: string,
  round: number,
  stage: IMatch["stage"],
  label: string,
  a: Entrant,
  b: Entrant
): IMatch {
  const bothKnown = !!a.id && !!b.id;
  return {
    matchId,
    round,
    stage,
    label,
    slotASource: a.source,
    slotBSource: b.source,
    playerAId:   a.id,
    playerAName: a.name,
    playerBId:   b.id,
    playerBName: b.name,
    status: bothKnown ? "ready" : "pending",
  };
}

// Builds the full bracket up front: standard single elimination, except whenever
// a round would collapse to exactly 3 remaining entrants (no even pairing possible
// without a bye), those 3 play a round-robin decider — ranked by wins then score
// margin — to produce the 2 finalists. This keeps total matches to a minimum
// while still guaranteeing a clean 1st / 2nd (and usually 3rd) placement.
export function generateAutoBracket(
  participants: { userId: string; username: string }[]
): { matches: IMatch[]; standings: IStanding[]; status: "in_progress" | "completed" } {
  if (participants.length < 2) {
    if (participants.length === 1) {
      return {
        matches: [],
        standings: [{ userId: participants[0].userId, username: participants[0].username, position: 1 }],
        status: "completed",
      };
    }
    return { matches: [], standings: [], status: "in_progress" };
  }

  const matches: IMatch[] = [];
  let counter = 1;
  const nextId = () => `m${counter++}`;

  let entrants: Entrant[] = participants.map((p) => participantEntrant(p.userId, p.username));
  let round = 1;

  while (entrants.length > 3) {
    const nextEntrants: Entrant[] = [];
    let matchIndex = 1;
    let i = 0;
    while (i < entrants.length) {
      if (i + 1 < entrants.length) {
        const a = entrants[i];
        const b = entrants[i + 1];
        const matchId = nextId();
        const label = `Round ${round} · Match ${matchIndex}`;
        matches.push(makeMatch(matchId, round, "elimination", label, a, b));
        nextEntrants.push({ source: { type: "winnerOf", matchId }, name: `Winner of ${label}` });
        matchIndex++;
        i += 2;
      } else {
        // Odd one out this round — advances automatically (bye), no match needed.
        nextEntrants.push(entrants[i]);
        i += 1;
      }
    }
    entrants = nextEntrants;
    round++;
  }

  if (entrants.length === 3) {
    const [p1, p2, p3] = entrants;
    const pairs: [Entrant, Entrant][] = [[p1, p2], [p2, p3], [p3, p1]];
    const rrMatchIds: string[] = [];
    pairs.forEach(([a, b], idx) => {
      const matchId = nextId();
      rrMatchIds.push(matchId);
      matches.push(makeMatch(matchId, round, "roundrobin", `Decider Round · Match ${idx + 1}`, a, b));
    });
    round++;

    const survivorSource: ISlotSource = { type: "survivorOfGroup", groupMatchIds: rrMatchIds };
    matches.push(makeMatch(
      nextId(), round, "final", "Final",
      { source: survivorSource, name: "Decider Round survivor" },
      { source: survivorSource, name: "Decider Round survivor" }
    ));
  } else if (entrants.length === 2) {
    const [a, b] = entrants;
    matches.push(makeMatch(nextId(), round, "final", "Final", a, b));

    // Both finalists came from their own semifinal — add a 3rd place playoff between the runners-up.
    if (a.source.type === "winnerOf" && b.source.type === "winnerOf") {
      matches.push(makeMatch(
        nextId(), round, "thirdPlace", "3rd Place Playoff",
        { source: { type: "loserOf", matchId: a.source.matchId }, name: "Semifinal runner-up" },
        { source: { type: "loserOf", matchId: b.source.matchId }, name: "Semifinal runner-up" }
      ));
    }
  }

  return { matches, standings: [], status: "in_progress" };
}

interface RankedEntrant { id: string; name: string; wins: number; margin: number }

function computeGroupRanking(groupMatches: IMatch[]): RankedEntrant[] {
  const stats = new Map<string, RankedEntrant>();
  for (const gm of groupMatches) {
    if (!stats.has(gm.playerAId!)) stats.set(gm.playerAId!, { id: gm.playerAId!, name: gm.playerAName!, wins: 0, margin: 0 });
    if (!stats.has(gm.playerBId!)) stats.set(gm.playerBId!, { id: gm.playerBId!, name: gm.playerBName!, wins: 0, margin: 0 });
    const aStat = stats.get(gm.playerAId!)!;
    const bStat = stats.get(gm.playerBId!)!;
    aStat.margin += gm.scoreA! - gm.scoreB!;
    bStat.margin += gm.scoreB! - gm.scoreA!;
    if (gm.winnerId === gm.playerAId) aStat.wins++; else bStat.wins++;
  }
  return [...stats.values()].sort((x, y) => y.wins - x.wins || y.margin - x.margin);
}

function computeStandings(matches: IMatch[]): IStanding[] {
  const final = matches.find((m) => m.stage === "final");
  if (!final || final.status !== "completed") return [];

  const standings: IStanding[] = [
    { userId: final.winnerId!, username: final.winnerName!, position: 1 },
    { userId: final.loserId!,  username: final.loserName!,  position: 2 },
  ];

  const thirdPlaceMatch = matches.find((m) => m.stage === "thirdPlace");
  if (thirdPlaceMatch) {
    if (thirdPlaceMatch.status === "completed") {
      standings.push({ userId: thirdPlaceMatch.winnerId!, username: thirdPlaceMatch.winnerName!, position: 3 });
      standings.push({ userId: thirdPlaceMatch.loserId!,  username: thirdPlaceMatch.loserName!,  position: 4 });
    }
  } else if (final.slotASource.type === "survivorOfGroup" || final.slotBSource.type === "survivorOfGroup") {
    const groupIds = final.slotASource.groupMatchIds ?? final.slotBSource.groupMatchIds ?? [];
    const ranking = computeGroupRanking(matches.filter((m) => groupIds.includes(m.matchId)));
    if (ranking[2]) standings.push({ userId: ranking[2].id, username: ranking[2].name, position: 3 });
  }
  return standings;
}

function isBracketComplete(matches: IMatch[]): boolean {
  const final = matches.find((m) => m.stage === "final");
  if (!final || final.status !== "completed") return false;
  const thirdPlaceMatch = matches.find((m) => m.stage === "thirdPlace");
  if (thirdPlaceMatch && thirdPlaceMatch.status !== "completed") return false;
  return true;
}

// Applies a reported result to one match, propagates the winner/loser into any
// dependent slots (winnerOf / loserOf / survivorOfGroup), and recomputes standings.
// Mutates `matches` in place.
export function applyMatchResult(
  matches: IMatch[],
  matchId: string,
  scoreA: number,
  scoreB: number
): { standings: IStanding[]; status: "in_progress" | "completed" } {
  const match = matches.find((m) => m.matchId === matchId);
  if (!match) throw new Error("Match not found");
  if (match.status === "completed") throw new Error("This match's result has already been reported");
  if (!match.playerAId || !match.playerBId) throw new Error("Both players are not yet determined for this match");
  if (scoreA === scoreB) throw new Error("Scores cannot be tied — there must be a winner");

  match.scoreA = scoreA;
  match.scoreB = scoreB;
  if (scoreA > scoreB) {
    match.winnerId = match.playerAId; match.winnerName = match.playerAName;
    match.loserId  = match.playerBId; match.loserName  = match.playerBName;
  } else {
    match.winnerId = match.playerBId; match.winnerName = match.playerBName;
    match.loserId  = match.playerAId; match.loserName  = match.playerAName;
  }
  match.status = "completed";

  // Propagate into directly dependent slots (winnerOf / loserOf this match).
  for (const m of matches) {
    (["A", "B"] as const).forEach((side) => {
      const src = side === "A" ? m.slotASource : m.slotBSource;
      if (src.matchId !== matchId) return;
      if (src.type === "winnerOf") {
        if (side === "A") { m.playerAId = match.winnerId; m.playerAName = match.winnerName; }
        else               { m.playerBId = match.winnerId; m.playerBName = match.winnerName; }
      } else if (src.type === "loserOf") {
        if (side === "A") { m.playerAId = match.loserId; m.playerAName = match.loserName; }
        else               { m.playerBId = match.loserId; m.playerBName = match.loserName; }
      }
    });
    if (m.playerAId && m.playerBId && m.status === "pending") m.status = "ready";
  }

  // Resolve round-robin group survivor slots once every match in that group is complete.
  for (const m of matches) {
    (["A", "B"] as const).forEach((side) => {
      const src = side === "A" ? m.slotASource : m.slotBSource;
      const already = side === "A" ? m.playerAId : m.playerBId;
      if (src.type !== "survivorOfGroup" || already) return;
      const groupIds = src.groupMatchIds ?? [];
      const groupMatches = matches.filter((gm) => groupIds.includes(gm.matchId));
      if (groupMatches.length === 0 || !groupMatches.every((gm) => gm.status === "completed")) return;
      const ranking = computeGroupRanking(groupMatches);
      if (side === "A") { m.playerAId = ranking[0].id; m.playerAName = ranking[0].name; }
      else               { m.playerBId = ranking[1].id; m.playerBName = ranking[1].name; }
    });
    if (m.playerAId && m.playerBId && m.status === "pending") m.status = "ready";
  }

  return { standings: computeStandings(matches), status: isBracketComplete(matches) ? "completed" : "in_progress" };
}
