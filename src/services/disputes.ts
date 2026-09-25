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
  DISPUTE_EVENT_TYPE,
  DISPUTE_EVIDENCE_WINDOW_HOURS,
  LADDER_MATCH_STATUS,
  LADDER_TYPE,
  disputeTimeMs,
  getDisputeEvidenceDueAt,
  isDisputeEvidenceOverdue,
  isPlayerEvidenceEvent,
} from "courtchamps-shared/types";
import type {
  Dispute,
  DisputeEvent,
  DisputeResolution,
  Game,
  GameVideo,
  LadderMatch,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "courtchamps-shared/types";
import {
  COLLECTION_NAMES,
  notificationTypes,
  notificationSchema,
} from "courtchamps-shared/schema";
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

/**
 * All video evidence for a disputed game — normal game videos uploaded through
 * the app's video pipeline, keyed by gameId. Newest first. Each carries its
 * uploader (`postedBy`), so a doubles side's two players are distinguishable.
 */
export const fetchDisputeGameVideos = async (
  gameId: string,
): Promise<GameVideo[]> => {
  if (!gameId) return [];
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION_NAMES.gameVideos),
      where("gameId", "==", gameId),
    ),
  );
  return snapshot.docs
    .map((d) => d.data() as GameVideo)
    .sort((a, b) => disputeTimeMs(b.createdAt) - disputeTimeMs(a.createdAt));
};

export interface EnrichedDispute extends Dispute {
  /** True when any participant has added a note or a video. */
  hasEvidence: boolean;
  /**
   * True when a player took the most recent action (opened the dispute or
   * submitted evidence) — i.e. the row is waiting on the admin, not the players.
   */
  needsAttention: boolean;
}

const lastActionByPlayer = (dispute: Dispute): boolean => {
  const lastEvent = dispute.events?.[dispute.events.length - 1];
  return Boolean(
    lastEvent && dispute.participantIds?.includes(lastEvent.createdBy),
  );
};

/** Active disputes for the admin queue; ones needing attention first. */
export const fetchActiveDisputes = async (): Promise<EnrichedDispute[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, DISPUTES_COLLECTION),
      where("stage", "in", DISPUTE_ACTIVE_STAGES),
    ),
  );
  const disputes = snapshot.docs
    .map((d) => d.data() as Dispute)
    .sort((a, b) => disputeTimeMs(b.createdAt) - disputeTimeMs(a.createdAt));
  const enriched = disputes.map((dispute) => ({
    ...dispute,
    hasEvidence: (dispute.events ?? []).some(isPlayerEvidenceEvent),
    needsAttention: lastActionByPlayer(dispute),
  }));
  // Surface rows waiting on the admin first.
  return enriched.sort(
    (a, b) => Number(b.needsAttention) - Number(a.needsAttention),
  );
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
 * the disputer's corrected game; `rejected` and `void` apply the original game.
 * The scheduled autoVoidLadderDisputes function mirrors this for `void`.
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
      evidenceDueAt: null,
      resolvedAt: new Date(),
      resolvedBy: adminUserId,
      events: [
        ...(dispute.events ?? []),
        pruneUndefined<DisputeEvent>({
          type:
            resolution === DISPUTE_RESOLUTION.VOID
              ? DISPUTE_EVENT_TYPE.VOIDED
              : DISPUTE_EVENT_TYPE.RESOLVED,
          stage: DISPUTE_STAGE.RESOLVED,
          note: adminNotes || undefined,
          createdBy: adminUserId,
          createdAt: new Date(),
        }),
      ],
    });
  });

  const ladder = dispute.ladderName ?? "the ladder";
  await notifyPlayers(
    dispute,
    resolution === DISPUTE_RESOLUTION.UPHELD
      ? `Your disputed game in ${ladder} was upheld — the corrected score now stands.`
      : resolution === DISPUTE_RESOLUTION.VOID
        ? `Your disputed game in ${ladder} was voided — no evidence was added within ${DISPUTE_EVIDENCE_WINDOW_HOURS} hours, so the original score stands.`
        : `Your disputed game in ${ladder} was reviewed — the original score stands.`,
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

/**
 * Void a dispute whose evidence request went unanswered past its deadline. The
 * scheduled function does this hourly; this covers the gap in between.
 */
export const voidDispute = (
  dispute: Dispute,
  adminUserId: string,
  adminNotes?: string,
): Promise<void> => {
  if (!isDisputeEvidenceOverdue(dispute, Date.now())) {
    return Promise.reject(
      new Error("The evidence deadline for this dispute has not passed yet."),
    );
  }
  return resolveDispute(
    dispute,
    adminUserId,
    DISPUTE_RESOLUTION.VOID,
    adminNotes,
  );
};

/**
 * Ask every player in the game for more evidence. They have
 * DISPUTE_EVIDENCE_WINDOW_HOURS to respond before the dispute is voided.
 */
export const requestMoreEvidence = async (
  dispute: Dispute,
  adminUserId: string,
  note: string,
): Promise<void> => {
  const now = new Date();
  const evidenceDueAt = getDisputeEvidenceDueAt(now.getTime());
  await updateDoc(doc(db, DISPUTES_COLLECTION, dispute.disputeId), {
    stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
    evidenceDueAt,
    events: [
      ...(dispute.events ?? []),
      pruneUndefined<DisputeEvent>({
        type: DISPUTE_EVENT_TYPE.EVIDENCE_REQUESTED,
        stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
        note: note.trim() || undefined,
        createdBy: adminUserId,
        createdAt: now,
        evidenceDueAt,
      }),
    ],
  });
  await notifyPlayers(
    dispute,
    `An admin requested more evidence for your disputed game in ${dispute.ladderName ?? "the ladder"}. You have ${DISPUTE_EVIDENCE_WINDOW_HOURS} hours to respond.`,
  );
};
