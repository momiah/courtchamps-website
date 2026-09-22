import {
  addDoc,
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
  DISPUTES_COLLECTION,
  DISPUTE_STAGE,
  DISPUTE_RESOLUTION,
  DISPUTE_ACTIVE_STAGES,
  LADDER_MATCH_STATUS,
  LADDER_TYPE,
} from "courtchamps-shared/types";
import type {
  Dispute,
  DisputeResolution,
  Game,
  LadderMatch,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "courtchamps-shared/types";
import { notificationTypes, notificationSchema } from "courtchamps-shared/schema";
import {
  resolveLadderMatchOutcome,
  scoreSinglesLadderGame,
  scoreDoublesLadderGame,
} from "courtchamps-shared/helpers";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_TEAMS = "ladderTeams";
const LADDER_PARTICIPANTS = "ladderParticipants";
const USERS = "users";

const APPROVED_GAME = notificationTypes.RESPONSE.APPROVED_GAME;

// Firestore rejects undefined field values anywhere in the written data.
const pruneUndefined = <T>(value: T): T =>
  Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    ),
  ) as T;

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

/** Active disputes for the admin queue, newest first. */
export const fetchActiveDisputes = async (): Promise<Dispute[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, DISPUTES_COLLECTION),
      where("stage", "in", DISPUTE_ACTIVE_STAGES),
    ),
  );
  return snapshot.docs
    .map((d) => d.data() as Dispute)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
};

export const fetchDisputeById = async (
  disputeId: string,
): Promise<Dispute | null> => {
  const snap = await getDoc(doc(db, DISPUTES_COLLECTION, disputeId));
  return snap.exists() ? (snap.data() as Dispute) : null;
};

const notifyPlayers = async (
  dispute: Dispute,
  message: string,
): Promise<void> => {
  await Promise.all(
    (dispute.participantIds ?? []).map((recipientId) =>
      addDoc(collection(db, USERS, recipientId, "notifications"), {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId,
        senderId: "system",
        message,
        type: notificationTypes.INFORMATION.LADDER_DISPUTE.TYPE,
        data: { disputeId: dispute.disputeId, ladderId: dispute.ladderId },
      }),
    ),
  );
};

/**
 * Resolve a dispute atomically: write the agreed game into the match as an
 * approved game, score it through the normal ladder game flow (per-ladder CP +
 * global XP/medals, and the match result when the best-of is decided), complete
 * the match if it is decided, and mark the dispute resolved. `upheld` applies
 * the disputer's corrected game (or an admin-supplied one); `rejected` applies
 * the original game.
 */
const resolveDispute = async (
  dispute: Dispute,
  adminUserId: string,
  resolution: DisputeResolution,
  adminNotes?: string,
): Promise<void> => {
  const chosenGame =
    resolution === DISPUTE_RESOLUTION.UPHELD
      ? dispute.disputedGame
      : dispute.originalGame;
  const finalGame = pruneUndefined<Game>({
    ...chosenGame,
    approvalStatus: APPROVED_GAME,
  });

  await runTransaction(db, async (tx) => {
    const matchRef = doc(
      db,
      LADDERS,
      dispute.ladderId,
      LADDER_MATCHES,
      dispute.ladderMatchId,
    );
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists()) throw new Error("Match not found");

    const match = matchSnap.data() as LadderMatch;
    if (match.matchStatus === LADDER_MATCH_STATUS.COMPLETED) {
      throw new Error("This match has already been completed");
    }

    const games = match.games ?? [];
    const index = games.findIndex((g) => g.gameId === dispute.gameId);
    if (index === -1) throw new Error("Game not found in match");

    const nextGames = [...games];
    nextGames[index] = finalGame;

    const outcome = resolveLadderMatchOutcome(
      nextGames,
      match.bestOf ?? nextGames.length,
    );
    const matchDecided = outcome.decided && !!outcome.winnerTeam;

    const playerUserIds = [
      finalGame.team1.player1?.userId,
      finalGame.team1.player2?.userId,
      finalGame.team2.player1?.userId,
      finalGame.team2.player2?.userId,
    ].filter((id): id is string => Boolean(id));

    const isDoubles =
      (match.teams?.length ?? 0) >= 2 ||
      dispute.ladderType === LADDER_TYPE.DOUBLES;

    // ── all reads before any write (Firestore requirement) ──
    const participantRefs = playerUserIds.map((uid) =>
      doc(db, LADDERS, dispute.ladderId, LADDER_PARTICIPANTS, uid),
    );
    const userRefs = playerUserIds.map((uid) => doc(db, USERS, uid));
    const teamRefs = isDoubles
      ? (match.teams ?? []).map((t) =>
          doc(db, LADDERS, dispute.ladderId, LADDER_TEAMS, t.teamKey),
        )
      : [];

    const [participantSnaps, userSnaps, teamSnaps] = await Promise.all([
      Promise.all(participantRefs.map((ref) => tx.get(ref))),
      Promise.all(userRefs.map((ref) => tx.get(ref))),
      Promise.all(teamRefs.map((ref) => tx.get(ref))),
    ]);

    const participants = participantSnaps
      .filter((snap) => snap.exists())
      .map((snap) => snap.data() as ScoreboardProfile);
    const users = userSnaps
      .filter((snap) => snap.exists())
      .map((snap) => snap.data() as UserProfile);
    const ladderTeams = teamSnaps
      .filter((snap) => snap.exists())
      .map((snap) => snap.data() as TeamStats);

    // ── writes ──
    const persistUsers = () =>
      users.forEach((u) => {
        if (!u.userId) return;
        tx.update(doc(db, USERS, u.userId), { profileDetail: u.profileDetail });
      });

    if (isDoubles) {
      const { scoringParticipants, teams } = await scoreDoublesLadderGame({
        game: finalGame,
        participants,
        users,
        ladderTeams,
        matchDecided,
        matchWinnerSide: outcome.winnerTeam,
      });
      scoringParticipants.forEach((p) => {
        if (!p.userId) return;
        tx.set(
          doc(db, LADDERS, dispute.ladderId, LADDER_PARTICIPANTS, p.userId),
          p,
        );
      });
      persistUsers();
      teams.forEach((team) => {
        tx.set(
          doc(db, LADDERS, dispute.ladderId, LADDER_TEAMS, team.teamKey),
          team,
        );
      });
    } else {
      scoreSinglesLadderGame({
        game: finalGame,
        participants,
        users,
        matchDecided,
        matchWinnerSide: outcome.winnerTeam,
      });
      participants.forEach((p) => {
        if (!p.userId) return;
        tx.set(
          doc(db, LADDERS, dispute.ladderId, LADDER_PARTICIPANTS, p.userId),
          p,
        );
      });
      persistUsers();
    }

    const matchUpdate: Record<string, unknown> = {
      games: nextGames,
      lastUpdated: new Date(),
    };
    if (matchDecided) {
      matchUpdate.matchStatus = LADDER_MATCH_STATUS.COMPLETED;
      matchUpdate.completedAt = new Date();
    }
    tx.update(matchRef, matchUpdate);

    tx.update(doc(db, DISPUTES_COLLECTION, dispute.disputeId), {
      stage: DISPUTE_STAGE.RESOLVED,
      resolution,
      finalGame,
      adminNotes: adminNotes ?? null,
      resolvedAt: new Date(),
      resolvedBy: adminUserId,
      events: [
        ...(dispute.events ?? []),
        {
          stage: DISPUTE_STAGE.RESOLVED,
          note: adminNotes ?? undefined,
          createdBy: adminUserId,
          createdAt: new Date(),
        },
      ].map((e) => pruneUndefined(e)),
    });
  });

  await notifyPlayers(
    dispute,
    resolution === DISPUTE_RESOLUTION.UPHELD
      ? `Your disputed game in ${dispute.ladderName ?? "the ladder"} was upheld — the corrected score now stands.`
      : `Your disputed game in ${dispute.ladderName ?? "the ladder"} was reviewed — the original score stands.`,
  );
};

export const approveDispute = (
  dispute: Dispute,
  adminUserId: string,
  adminNotes?: string,
): Promise<void> =>
  resolveDispute(dispute, adminUserId, DISPUTE_RESOLUTION.UPHELD, adminNotes);

export const rejectDispute = (
  dispute: Dispute,
  adminUserId: string,
  adminNotes?: string,
): Promise<void> =>
  resolveDispute(dispute, adminUserId, DISPUTE_RESOLUTION.REJECTED, adminNotes);

/** Move a dispute to `more_evidence_requested` and notify the disputer. */
export const requestMoreEvidence = async (
  dispute: Dispute,
  adminUserId: string,
  note: string,
): Promise<void> => {
  await updateDoc(doc(db, DISPUTES_COLLECTION, dispute.disputeId), {
    stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
    events: [
      ...(dispute.events ?? []),
      {
        stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
        ...(note.trim() ? { note: note.trim() } : {}),
        createdBy: adminUserId,
        createdAt: new Date(),
      },
    ],
  });
  await notifyPlayers(
    dispute,
    `An admin requested more evidence for your disputed game in ${dispute.ladderName ?? "the ladder"}.`,
  );
};
