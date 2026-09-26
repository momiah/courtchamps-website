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
  disputeTimeMs,
  getDisputeEvidenceDueAt,
  isDisputeEvidenceOverdue,
  isPlayerEvidenceEvent,
} from "courtchamps-shared/types";
import type {
  Dispute,
  DisputeEvent,
  DisputeResolution,
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
  getDisputePlayerIds,
  isDoublesDispute,
  planDisputeResolution,
} from "courtchamps-shared/helpers";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_TEAMS = "ladderTeams";
const LADDER_PARTICIPANTS = "ladderParticipants";
const USERS = "users";

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
 * The planning is shared (planDisputeResolution) with the app's cancel and the
 * scheduled autoVoidLadderDisputes function.
 */
const resolveDispute = async (
  dispute: Dispute,
  adminUserId: string,
  resolution: DisputeResolution,
  adminNotes?: string,
): Promise<void> => {
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

    const participantRef = (uid: string) =>
      doc(db, LADDERS, dispute.ladderId, LADDER_PARTICIPANTS, uid);
    const teamRef = (teamKey: string) =>
      doc(db, LADDERS, dispute.ladderId, LADDER_TEAMS, teamKey);
    const userRef = (uid: string) => doc(db, USERS, uid);
    const playerIds = getDisputePlayerIds(dispute.originalGame);

    // All reads before any write (Firestore requirement).
    const [participantSnaps, userSnaps, teamSnaps] = await Promise.all([
      Promise.all(playerIds.map((uid) => tx.get(participantRef(uid)))),
      Promise.all(playerIds.map((uid) => tx.get(userRef(uid)))),
      Promise.all(
        isDoublesDispute(dispute, match)
          ? (match.teams ?? []).map((t) => tx.get(teamRef(t.teamKey)))
          : [],
      ),
    ]);

    const plan = await planDisputeResolution({
      dispute,
      match,
      participants: participantSnaps
        .filter((snap) => snap.exists())
        .map((snap) => snap.data() as ScoreboardProfile),
      users: userSnaps
        .filter((snap) => snap.exists())
        .map((snap) => snap.data() as UserProfile),
      ladderTeams: teamSnaps
        .filter((snap) => snap.exists())
        .map((snap) => snap.data() as TeamStats),
      resolution,
      actorId: adminUserId,
      note: adminNotes,
      now: new Date(),
    });

    plan.participants.forEach((p) => {
      if (p.userId) tx.set(participantRef(p.userId), p);
    });
    plan.users.forEach((u) =>
      tx.update(userRef(u.userId), { profileDetail: u.profileDetail }),
    );
    plan.teams.forEach((team) => tx.set(teamRef(team.teamKey), team));
    tx.update(matchRef, plan.matchUpdate);
    tx.update(
      doc(db, DISPUTES_COLLECTION, dispute.disputeId),
      plan.disputeUpdate,
    );
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
