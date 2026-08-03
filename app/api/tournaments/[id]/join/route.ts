import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { getUserFromRequest } from "../../../../lib/auth";
import { Tournament } from "../../../../models/Tournament";
import { User } from "../../../../models/User";
import { Wallet } from "../../../../models/Wallet";
import { Ban } from "../../../../models/Ban";

const FEE_MAP: Record<string, number> = { "€5": 5, "€10": 10 };

const GAME_ID: Record<string, string> = {
  "The Scouring":        "scouring",
  "Age of Empires 2":    "ageOfEmpires2",
  "War of Dots":         "warOfDots",
  "Rocket League":       "rocketLeague",
  "League of Legends":   "leagueOfLegends",
  "Dota 2":              "dota2",
  "Total War: Rome 2":   "totalWarRome2",
  "Counter-Strike 2":    "cs2",
  "Company of Heroes 3": "companyOfHeroes3",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) return NextResponse.json({ message: "Login required" }, { status: 401 });

    const { id } = await params;
    const { gamerTag } = await req.json().catch(() => ({}));

    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ message: "Tournament not found" }, { status: 404 });

    if (tournament.status === "Cancelled") {
      return NextResponse.json({ message: "Tournament is cancelled" }, { status: 400 });
    }
    if (tournament.status === "Completed") {
      return NextResponse.json({ message: "Tournament has ended" }, { status: 400 });
    }

    // Already joined this tournament (main queue)
    const alreadyIn = tournament.participants.some(
      (p) => p.userId === currentUser._id.toString()
    );
    if (alreadyIn) {
      return NextResponse.json({ message: "You already joined this tournament" }, { status: 400 });
    }

    // Lock check
    if (tournament.lockEnabled && tournament.scheduledAt) {
      const offset = tournament.type === "Ice" ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
      const lockAt = new Date(new Date(tournament.scheduledAt).getTime() - offset);
      if (new Date() >= lockAt) {
        return NextResponse.json({ message: "Registration is locked for this tournament" }, { status: 400 });
      }
    }

    // 1-tournament limit
    if (currentUser.activeTournamentId) {
      return NextResponse.json({ message: "You are already in a tournament" }, { status: 400 });
    }

    // ── Ban check ──
    const activeBans = await Ban.find({
      fniUsername: currentUser.username,
      status: "Active",
      $or: [{ expiresAt: { $gt: new Date() } }, { duration: "permanent" }],
    });

    const platformBan = activeBans.find((b: any) => b.scope === "platform" || !b.scope);
    if (platformBan) {
      return NextResponse.json(
        { message: "You are currently banned from all FnI tournaments." },
        { status: 403 }
      );
    }

    const gmBan = activeBans.find(
      (b: any) => b.scope === "gm_only" && b.restrictedGmId === tournament.createdBy
    );
    if (gmBan) {
      return NextResponse.json(
        { message: "You are restricted from this Game Master's tournaments." },
        { status: 403 }
      );
    }

    // ── ELO check ──
    const gameId = GAME_ID[tournament.game];
    if (gameId && (tournament.eloMin !== undefined || tournament.eloMax !== undefined)) {
      const eloMap = currentUser.elo instanceof Map
        ? currentUser.elo
        : new Map(Object.entries(currentUser.elo ?? {}));
      const userElo = (eloMap.get(gameId) as number) ?? 400;
      if (tournament.eloMin !== undefined && userElo < tournament.eloMin) {
        return NextResponse.json({ message: `ELO too low (${userElo}). Minimum: ${tournament.eloMin}` }, { status: 400 });
      }
      if (tournament.eloMax !== undefined && userElo > tournament.eloMax) {
        return NextResponse.json({ message: `ELO too high (${userElo}). Maximum: ${tournament.eloMax}` }, { status: 400 });
      }
    }

    // Snapshot ELO and gamer tag
    const eloMap      = currentUser.elo instanceof Map ? currentUser.elo : new Map(Object.entries(currentUser.elo ?? {}));
    const tagsMap     = currentUser.gamerTags instanceof Map ? currentUser.gamerTags : new Map(Object.entries(currentUser.gamerTags ?? {}));
    const eloValue    = (eloMap.get(gameId ?? "") as number | undefined) ?? 400;
    const gamerTagValue = tagsMap.get(gameId ?? "") as string | undefined;

    // ── If tournament is full, add to reserve queue ──
    const isFull = (tournament.currentParticipants ?? 0) >= tournament.maxParticipants;
    if (isFull) {
      const alreadyInQueue = (tournament.reserveQueue ?? []).some(
        (p) => p.userId === currentUser._id.toString()
      );
      if (alreadyInQueue) {
        return NextResponse.json({ message: "You are already in the reserve queue" }, { status: 400 });
      }

      await Tournament.findByIdAndUpdate(id, {
        $push: {
          reserveQueue: {
            userId:   currentUser._id.toString(),
            username: currentUser.username,
            email:    currentUser.email,
            noShow:   false,
            elo:      eloValue,
            gamerTag: gamerTagValue,
          },
        },
      });

      return NextResponse.json({
        message:   "Tournament is full. You've been added to the reserve queue — you'll get a slot if someone drops out before lock.",
        inReserve: true,
      });
    }

    // ── Charge entry fee ──
    const feeAmount = FEE_MAP[tournament.fee] ?? 0;
    let newBalance: number | undefined;

    if (feeAmount > 0) {
      let wallet = await Wallet.findOne({ userId: currentUser._id.toString() });
      if (!wallet) wallet = await Wallet.create({ userId: currentUser._id.toString(), balance: 0 });
      if (wallet.balance < feeAmount) {
        return NextResponse.json({ message: `Insufficient balance. Entry fee: €${feeAmount}` }, { status: 400 });
      }
      wallet.balance -= feeAmount;
      wallet.transactions.push({
        type:        "fee",
        amount:      feeAmount,
        description: `Entry fee: ${tournament.title}`,
      });
      await wallet.save();
      newBalance = wallet.balance;
    }

    // Assign to Team A or B (FFA has no teams)
    const format   = tournament.format ?? "1v1";
    const tSize    = format === "FFA" ? tournament.maxParticipants : (parseInt(format.split("v")[0]) || 1);
    const team: "A" | "B" = (tournament.currentParticipants ?? 0) < tSize ? "A" : "B";

    // Push participant + increment count
    await Tournament.findByIdAndUpdate(id, {
      $inc:  { currentParticipants: 1 },
      $push: {
        participants: {
          userId:   currentUser._id.toString(),
          username: currentUser.username,
          email:    currentUser.email,
          noShow:   false,
          team:     format === "FFA" ? undefined : team,
          elo:      eloValue,
          gamerTag: gamerTagValue,
        },
      },
    });
    await User.findByIdAndUpdate(currentUser._id, { activeTournamentId: id });

    return NextResponse.json({
      message:             "Joined successfully",
      currentParticipants: (tournament.currentParticipants ?? 0) + 1,
      walletBalance:       newBalance,
      gamerTag,
    });
  } catch (err) {
    console.error("Join error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
