import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase/config";
import {
  LADDER_MATCH_STATUS,
  NO_SHOW_STATUS,
  NO_SHOW_CLAIMS_COLLECTION,
  WALKOVER_CP,
} from "courtchamps-shared/types";
import type { NoShowClaim, MatchTeam } from "courtchamps-shared/types";

const NO_SHOW_CLAIMS = NO_SHOW_CLAIMS_COLLECTION;
const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_TEAMS = "ladderTeams";
const LADDER_PARTICIPANTS = "ladderParticipants";
const TEAMS = "teams";
const USERS = "users";

// Cap the match-result form to the most recent results, matching the app.
const MATCH_LOG_CAP = 20;

export interface EnrichedNoShowClaim extends NoShowClaim {
  isDoubles: boolean;
  claimantLabel: string;
  noShowLabel: string;
  reporterLabel: string;
}

const nameFromUser = (data: Record<string, unknown> | undefined): string => {
  if (!data) return "Unknown";
  const username = (data.username as string | undefined)?.trim();
  if (username) return username;
  const full = [data.firstName, data.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || "Unknown";
};

const userName = async (userId: string): Promise<string> => {
  if (!userId) return "Unknown";
  const snap = await getDoc(doc(db, USERS, userId));
  return snap.exists()
    ? nameFromUser(snap.data() as Record<string, unknown>)
    : userId;
};

// A doubles side resolves to its team name; a singles side to the player names.
const teamLabel = async (
  team: MatchTeam,
  isDoubles: boolean,
): Promise<string> => {
  if (isDoubles && team.teamId) {
    const snap = await getDoc(doc(db, TEAMS, team.teamId));
    if (snap.exists()) {
      const data = snap.data() as { teamName?: string; team?: string[] };
      return (
        data.teamName?.trim() ||
        (data.team ?? []).join(" & ") ||
        "Team"
      );
    }
  }
  const names = await Promise.all((team.playerIds ?? []).map(userName));
  return names.join(" & ") || "—";
};

const enrich = async (claim: NoShowClaim): Promise<EnrichedNoShowClaim> => {
  const isDoubles = !!claim.claimantTeam.teamKey;
  const [claimantLabel, noShowLabel, reporterLabel] = await Promise.all([
    teamLabel(claim.claimantTeam, isDoubles),
    teamLabel(claim.noShowTeam, isDoubles),
    userName(claim.createdBy),
  ]);
  return { ...claim, isDoubles, claimantLabel, noShowLabel, reporterLabel };
};

export const fetchPendingNoShowClaims = async (): Promise<
  EnrichedNoShowClaim[]
> => {
  const pending = query(
    collection(db, NO_SHOW_CLAIMS),
    where("status", "==", NO_SHOW_STATUS.PENDING),
  );
  const snapshot = await getDocs(pending);
  const claims = snapshot.docs.map((d) => d.data() as NoShowClaim);
  const enriched = await Promise.all(claims.map(enrich));
  // Newest first (client-side to avoid a composite index).
  return enriched.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
};

const toMillis = (value: unknown): number => {
  if (
    value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  const t = new Date(value as string | number | Date).getTime();
  return Number.isFinite(t) ? t : 0;
};

const pushResult = (log: unknown, result: "W" | "L"): string[] =>
  [...(Array.isArray(log) ? (log as string[]) : []), result].slice(
    -MATCH_LOG_CAP,
  );

const winnerUpdate = (data: Record<string, unknown>) => ({
  numberOfWins: ((data.numberOfWins as number) ?? 0) + 1,
  matchResultLog: pushResult(data.matchResultLog, "W"),
});

const loserUpdate = (data: Record<string, unknown>) => ({
  numberOfLosses: ((data.numberOfLosses as number) ?? 0) + 1,
  matchResultLog: pushResult(data.matchResultLog, "L"),
});

const num = (data: Record<string, unknown>, field: string): number =>
  (data[field] as number) ?? 0;

// Ladder-CP transfer on the winning/losing ladder record. The field is the
// per-ladder CP: XP for a doubles team, competitionXP for a singles participant.
const winnerLadderUpdate = (
  data: Record<string, unknown>,
  cpField: string,
  cp: number,
) => ({ ...winnerUpdate(data), [cpField]: num(data, cpField) + cp });

const loserLadderUpdate = (
  data: Record<string, unknown>,
  cpField: string,
  cp: number,
) => ({ ...loserUpdate(data), [cpField]: num(data, cpField) - cp });

/**
 * Approve a no-show: complete the match as a plain walkover. No games are
 * created, so no game point difference or achievement medals. The winning side
 * gets numberOfWins +1, a "W" in its match-result form, and WALKOVER_CP ladder
 * CP transferred from the no-show; the no-show gets numberOfLosses +1, an "L",
 * and loses the same CP. The transfer is capped at the no-show's own CP (so it
 * never goes negative and never mints CP). Doubles moves CP on the ladder team
 * (XP); singles on the participant (competitionXP). The root team doc keeps the
 * win/loss tally only, mirroring the played-game path.
 */
export const approveNoShowClaim = async (
  claim: NoShowClaim,
  adminUserId: string,
): Promise<void> => {
  const isDoubles = !!claim.claimantTeam.teamKey;

  await runTransaction(db, async (tx) => {
    const matchRef = doc(
      db,
      LADDERS,
      claim.ladderId,
      LADDER_MATCHES,
      claim.ladderMatchId,
    );
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists()) {
      throw new Error("Match not found");
    }
    if (
      (matchSnap.data() as { matchStatus?: string }).matchStatus ===
      LADDER_MATCH_STATUS.COMPLETED
    ) {
      throw new Error("This match has already been completed");
    }

    // ── all reads first (Firestore requires it) ──
    if (isDoubles) {
      const winnerLadderRef = doc(
        db,
        LADDERS,
        claim.ladderId,
        LADDER_TEAMS,
        claim.claimantTeam.teamKey,
      );
      const winnerRootRef = doc(db, TEAMS, claim.claimantTeam.teamId);
      const loserLadderRef = doc(
        db,
        LADDERS,
        claim.ladderId,
        LADDER_TEAMS,
        claim.noShowTeam.teamKey,
      );
      const loserRootRef = doc(db, TEAMS, claim.noShowTeam.teamId);
      const [winnerLadder, winnerRoot, loserLadder, loserRoot] =
        await Promise.all([
          tx.get(winnerLadderRef),
          tx.get(winnerRootRef),
          tx.get(loserLadderRef),
          tx.get(loserRootRef),
        ]);

      // Transfer CP on the ladder teams (the ranking record), capped at the
      // no-show team's balance so it never goes negative or mints CP.
      const cp = Math.min(
        WALKOVER_CP,
        loserLadder.exists() ? num(loserLadder.data(), "XP") : 0,
      );
      if (winnerLadder.exists()) {
        tx.update(winnerLadderRef, winnerLadderUpdate(winnerLadder.data(), "XP", cp));
      }
      if (winnerRoot.exists()) {
        tx.update(winnerRootRef, winnerUpdate(winnerRoot.data()));
      }
      if (loserLadder.exists()) {
        tx.update(loserLadderRef, loserLadderUpdate(loserLadder.data(), "XP", cp));
      }
      if (loserRoot.exists()) {
        tx.update(loserRootRef, loserUpdate(loserRoot.data()));
      }
    } else {
      const winnerId = claim.claimantTeam.playerIds[0];
      const loserId = claim.noShowTeam.playerIds[0];
      const winnerRef = doc(
        db,
        LADDERS,
        claim.ladderId,
        LADDER_PARTICIPANTS,
        winnerId,
      );
      const loserRef = doc(
        db,
        LADDERS,
        claim.ladderId,
        LADDER_PARTICIPANTS,
        loserId,
      );
      const [winner, loser] = await Promise.all([
        tx.get(winnerRef),
        tx.get(loserRef),
      ]);
      // Transfer CP on the participants (competitionXP), capped at the no-show's
      // balance so it never goes negative or mints CP.
      const cp = Math.min(
        WALKOVER_CP,
        loser.exists() ? num(loser.data(), "competitionXP") : 0,
      );
      if (winner.exists()) {
        tx.update(winnerRef, winnerLadderUpdate(winner.data(), "competitionXP", cp));
      }
      if (loser.exists()) {
        tx.update(loserRef, loserLadderUpdate(loser.data(), "competitionXP", cp));
      }
    }

    tx.update(matchRef, {
      matchStatus: LADDER_MATCH_STATUS.COMPLETED,
      walkover: true,
      walkoverReason: "No show",
      walkoverWinner: isDoubles
        ? claim.claimantTeam.teamKey
        : claim.claimantTeam.playerIds[0],
      completedAt: new Date(),
    });
    tx.update(doc(db, NO_SHOW_CLAIMS, claim.claimId), {
      status: NO_SHOW_STATUS.APPROVED,
      resolvedAt: new Date(),
      resolvedBy: adminUserId,
    });
  });
};

export const rejectNoShowClaim = async (
  claim: NoShowClaim,
  adminUserId: string,
): Promise<void> => {
  await updateDoc(doc(db, NO_SHOW_CLAIMS, claim.claimId), {
    status: NO_SHOW_STATUS.REJECTED,
    resolvedAt: new Date(),
    resolvedBy: adminUserId,
  });
};
