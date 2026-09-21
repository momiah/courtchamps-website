import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  updateDoc,
  writeBatch,
  Transaction,
} from "firebase/firestore";

import { db } from "../firebase/config";
import {
  LADDER_MATCH_STATUS,
  REPORT_STATUS,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORTS_COLLECTION,
  LADDER_REPORT_COUNTS_COLLECTION,
  WALKOVER_CP,
} from "courtchamps-shared/types";
import type {
  Report,
  ReportWalkover,
  StrikeCounts,
  DisqualificationReason,
} from "courtchamps-shared/types";
import { applyStrike } from "courtchamps-shared/helpers";

const REPORTS = REPORTS_COLLECTION;
const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_TEAMS = "ladderTeams";
const LADDER_PARTICIPANTS = "ladderParticipants";
const TEAMS = "teams";
const USERS = "users";
const REPORT_COUNTS = LADDER_REPORT_COUNTS_COLLECTION;

// Cap the match-result form to the most recent results, matching the app.
const MATCH_LOG_CAP = 20;

export interface EnrichedReport extends Report {
  reporterLabel: string;
  targetLabel: string;
  reasonLabel: string;
}

const nameFromUser = (data: Record<string, unknown> | undefined): string => {
  if (!data) return "Unknown";
  const username = (data.username as string | undefined)?.trim();
  if (username) return username;
  const full = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
  return full || "Unknown";
};

const userName = async (userId: string): Promise<string> => {
  if (!userId) return "Unknown";
  const snap = await getDoc(doc(db, USERS, userId));
  return snap.exists()
    ? nameFromUser(snap.data() as Record<string, unknown>)
    : userId;
};

const enrich = async (report: Report): Promise<EnrichedReport> => {
  let targetLabel = report.target.label?.trim() ?? "";
  if (!targetLabel) {
    const names = await Promise.all(
      (report.target.userIds ?? []).map(userName),
    );
    targetLabel = names.join(" & ") || "—";
  }
  const reporterLabel = await userName(report.reportedBy);
  return {
    ...report,
    reporterLabel,
    targetLabel,
    reasonLabel: REPORT_REASON_LABELS[report.reason] ?? report.reason,
  };
};

export const fetchReports = async (): Promise<EnrichedReport[]> => {
  const snapshot = await getDocs(collection(db, REPORTS));
  const reports = snapshot.docs.map((d) => d.data() as Report);
  const enriched = await Promise.all(reports.map(enrich));
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

const num = (data: Record<string, unknown>, field: string): number =>
  (data[field] as number) ?? 0;

const pushResult = (log: unknown, result: "W" | "L"): string[] =>
  [...(Array.isArray(log) ? (log as string[]) : []), result].slice(
    -MATCH_LOG_CAP,
  );

const winnerUpdate = (data: Record<string, unknown>) => ({
  numberOfWins: num(data, "numberOfWins") + 1,
  matchResultLog: pushResult(data.matchResultLog, "W"),
});

const loserUpdate = (data: Record<string, unknown>) => ({
  numberOfLosses: num(data, "numberOfLosses") + 1,
  matchResultLog: pushResult(data.matchResultLog, "L"),
});

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

const strikesOf = (data: Record<string, unknown> | undefined): StrikeCounts =>
  ((data?.strikes as StrikeCounts) ?? {}) as StrikeCounts;

/**
 * Approve a report in one atomic transaction: mark it approved, add one strike
 * of its reason to each struck player's per-ladder count and global conduct
 * tally, and — for a no-show — complete the match as a walkover with the capped
 * CP transfer. Reject touches nothing but the report's status.
 */
export const approveReport = async (
  report: Report,
  adminUserId: string,
): Promise<void> => {
  const reason = report.reason as DisqualificationReason;
  const struckUserIds = report.target.userIds ?? [];
  const isNoShow = report.reason === REPORT_REASONS.NO_SHOW;

  await runTransaction(db, async (tx) => {
    // ── reads first (Firestore requires all reads before any write) ──
    const countRefs = struckUserIds.map((userId) =>
      doc(db, LADDERS, report.ladderId, REPORT_COUNTS, userId),
    );
    const userRefs = struckUserIds.map((userId) => doc(db, USERS, userId));
    const countSnaps = await Promise.all(countRefs.map((ref) => tx.get(ref)));
    const userSnaps = await Promise.all(userRefs.map((ref) => tx.get(ref)));

    let walkoverWrites: (() => void) | null = null;
    if (isNoShow && report.walkover) {
      walkoverWrites = await prepareWalkover(tx, report, report.walkover);
    }

    // ── writes ──
    struckUserIds.forEach((userId, index) => {
      const countData = countSnaps[index].exists()
        ? (countSnaps[index].data() as Record<string, unknown>)
        : undefined;
      tx.set(
        countRefs[index],
        {
          userId,
          ladderId: report.ladderId,
          teamKey: report.target.teamKey ?? null,
          strikes: applyStrike(strikesOf(countData), reason),
          updatedAt: new Date(),
        },
        { merge: true },
      );

      const userData = userSnaps[index].exists()
        ? (userSnaps[index].data() as Record<string, unknown>)
        : undefined;
      const conduct =
        (userData?.conduct as { strikes?: StrikeCounts } | undefined) ?? {};
      tx.set(
        userRefs[index],
        {
          conduct: {
            ...conduct,
            strikes: applyStrike(conduct.strikes ?? {}, reason),
            lastReportedAt: new Date(),
          },
        },
        { merge: true },
      );
    });

    walkoverWrites?.();

    tx.update(doc(db, REPORTS, report.reportId), {
      status: REPORT_STATUS.APPROVED,
      resolvedAt: new Date(),
      resolvedBy: adminUserId,
    });
  });
};

// Reads the ranking + match docs for a no-show walkover and returns a closure
// that performs the writes (so the caller can keep all reads before all writes).
const prepareWalkover = async (
  tx: Transaction,
  report: Report,
  walkover: ReportWalkover,
): Promise<() => void> => {
  const matchRef = doc(
    db,
    LADDERS,
    report.ladderId,
    LADDER_MATCHES,
    report.ladderMatchId,
  );
  const matchSnap = await tx.get(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");
  if (
    (matchSnap.data() as { matchStatus?: string }).matchStatus ===
    LADDER_MATCH_STATUS.COMPLETED
  ) {
    throw new Error("This match has already been completed");
  }

  const isDoubles = walkover.winnerType === "team";

  if (isDoubles) {
    const winnerLadderRef = doc(
      db,
      LADDERS,
      report.ladderId,
      LADDER_TEAMS,
      walkover.winnerTeamKey ?? "",
    );
    const winnerRootRef = doc(db, TEAMS, walkover.winnerTeamId ?? "");
    const loserLadderRef = doc(
      db,
      LADDERS,
      report.ladderId,
      LADDER_TEAMS,
      report.target.teamKey ?? "",
    );
    const loserRootRef = doc(db, TEAMS, report.target.teamId ?? "");
    const [winnerLadder, winnerRoot, loserLadder, loserRoot] =
      await Promise.all([
        tx.get(winnerLadderRef),
        tx.get(winnerRootRef),
        tx.get(loserLadderRef),
        tx.get(loserRootRef),
      ]);
    const cp = Math.min(
      WALKOVER_CP,
      loserLadder.exists() ? num(loserLadder.data(), "XP") : 0,
    );
    return () => {
      if (winnerLadder.exists())
        tx.update(winnerLadderRef, winnerLadderUpdate(winnerLadder.data(), "XP", cp));
      if (winnerRoot.exists())
        tx.update(winnerRootRef, winnerUpdate(winnerRoot.data()));
      if (loserLadder.exists())
        tx.update(loserLadderRef, loserLadderUpdate(loserLadder.data(), "XP", cp));
      if (loserRoot.exists())
        tx.update(loserRootRef, loserUpdate(loserRoot.data()));
      tx.update(matchRef, walkoverMatchUpdate(walkover.winnerTeamKey ?? "", cp));
    };
  }

  const winnerId = walkover.winnerUserIds[0];
  const loserId = report.target.userIds[0];
  const winnerRef = doc(db, LADDERS, report.ladderId, LADDER_PARTICIPANTS, winnerId);
  const loserRef = doc(db, LADDERS, report.ladderId, LADDER_PARTICIPANTS, loserId);
  const [winner, loser] = await Promise.all([tx.get(winnerRef), tx.get(loserRef)]);
  const cp = Math.min(
    WALKOVER_CP,
    loser.exists() ? num(loser.data(), "competitionXP") : 0,
  );
  return () => {
    if (winner.exists())
      tx.update(winnerRef, winnerLadderUpdate(winner.data(), "competitionXP", cp));
    if (loser.exists())
      tx.update(loserRef, loserLadderUpdate(loser.data(), "competitionXP", cp));
    tx.update(matchRef, walkoverMatchUpdate(winnerId, cp));
  };
};

const walkoverMatchUpdate = (walkoverWinner: string, cp: number) => ({
  matchStatus: LADDER_MATCH_STATUS.COMPLETED,
  walkover: true,
  walkoverReason: "No show",
  walkoverWinner,
  walkoverCp: cp,
  completedAt: new Date(),
});

export const rejectReport = async (
  report: Report,
  adminUserId: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, REPORTS, report.reportId), {
    status: REPORT_STATUS.REJECTED,
    resolvedAt: new Date(),
    resolvedBy: adminUserId,
  });
  // A dismissed no-show frees the match for check-in again.
  if (report.reason === REPORT_REASONS.NO_SHOW) {
    batch.update(
      doc(db, LADDERS, report.ladderId, LADDER_MATCHES, report.ladderMatchId),
      { noShowReported: false },
    );
  }
  await batch.commit();
};

const removeStrike = (
  strikes: StrikeCounts,
  reason: DisqualificationReason,
): StrikeCounts => {
  const next: StrikeCounts = { ...strikes };
  const value = (next[reason] ?? 0) - 1;
  if (value > 0) next[reason] = value;
  else delete next[reason];
  return next;
};

const popResult = (log: unknown): string[] =>
  Array.isArray(log) ? (log as string[]).slice(0, -1) : [];

const winnerReverse = (
  data: Record<string, unknown>,
  cpField: string,
  cp: number,
) => ({
  numberOfWins: Math.max(0, num(data, "numberOfWins") - 1),
  matchResultLog: popResult(data.matchResultLog),
  [cpField]: num(data, cpField) - cp,
});

const loserReverse = (
  data: Record<string, unknown>,
  cpField: string,
  cp: number,
) => ({
  numberOfLosses: Math.max(0, num(data, "numberOfLosses") - 1),
  matchResultLog: popResult(data.matchResultLog),
  [cpField]: num(data, cpField) + cp,
});

const reverseWalkoverMatchUpdate = () => ({
  matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
  walkover: false,
  walkoverReason: null,
  walkoverWinner: null,
  walkoverCp: null,
  completedAt: null,
  // Report is pending again after a revert, so keep the match under review.
  noShowReported: true,
});

// Reverses a no-show walkover using the CP amount recorded on the match at
// approval time, so the exact transfer is undone even if balances have moved.
const prepareWalkoverReversal = async (
  tx: Transaction,
  report: Report,
  walkover: ReportWalkover,
): Promise<() => void> => {
  const matchRef = doc(
    db,
    LADDERS,
    report.ladderId,
    LADDER_MATCHES,
    report.ladderMatchId,
  );
  const matchSnap = await tx.get(matchRef);
  const cp = matchSnap.exists() ? num(matchSnap.data(), "walkoverCp") : 0;
  const isDoubles = walkover.winnerType === "team";

  if (isDoubles) {
    const winnerLadderRef = doc(
      db,
      LADDERS,
      report.ladderId,
      LADDER_TEAMS,
      walkover.winnerTeamKey ?? "",
    );
    const winnerRootRef = doc(db, TEAMS, walkover.winnerTeamId ?? "");
    const loserLadderRef = doc(
      db,
      LADDERS,
      report.ladderId,
      LADDER_TEAMS,
      report.target.teamKey ?? "",
    );
    const loserRootRef = doc(db, TEAMS, report.target.teamId ?? "");
    const [winnerLadder, winnerRoot, loserLadder, loserRoot] =
      await Promise.all([
        tx.get(winnerLadderRef),
        tx.get(winnerRootRef),
        tx.get(loserLadderRef),
        tx.get(loserRootRef),
      ]);
    return () => {
      if (winnerLadder.exists())
        tx.update(winnerLadderRef, winnerReverse(winnerLadder.data(), "XP", cp));
      if (winnerRoot.exists())
        tx.update(winnerRootRef, {
          numberOfWins: Math.max(0, num(winnerRoot.data(), "numberOfWins") - 1),
          matchResultLog: popResult(winnerRoot.data().matchResultLog),
        });
      if (loserLadder.exists())
        tx.update(loserLadderRef, loserReverse(loserLadder.data(), "XP", cp));
      if (loserRoot.exists())
        tx.update(loserRootRef, {
          numberOfLosses: Math.max(0, num(loserRoot.data(), "numberOfLosses") - 1),
          matchResultLog: popResult(loserRoot.data().matchResultLog),
        });
      if (matchSnap.exists()) tx.update(matchRef, reverseWalkoverMatchUpdate());
    };
  }

  const winnerId = walkover.winnerUserIds[0];
  const loserId = report.target.userIds[0];
  const winnerRef = doc(db, LADDERS, report.ladderId, LADDER_PARTICIPANTS, winnerId);
  const loserRef = doc(db, LADDERS, report.ladderId, LADDER_PARTICIPANTS, loserId);
  const [winner, loser] = await Promise.all([tx.get(winnerRef), tx.get(loserRef)]);
  return () => {
    if (winner.exists())
      tx.update(winnerRef, winnerReverse(winner.data(), "competitionXP", cp));
    if (loser.exists())
      tx.update(loserRef, loserReverse(loser.data(), "competitionXP", cp));
    if (matchSnap.exists()) tx.update(matchRef, reverseWalkoverMatchUpdate());
  };
};

/**
 * Revert a resolved report back to pending. An approved report's effects are
 * undone atomically — one strike removed from each struck player's per-ladder
 * and global tallies, and the walkover reversed for a no-show. A rejected report
 * had no effects, so only its status flips back.
 */
export const revertReport = async (
  report: Report,
  adminUserId: string,
): Promise<void> => {
  const reason = report.reason as DisqualificationReason;
  const struckUserIds = report.target.userIds ?? [];
  const wasApproved = report.status === REPORT_STATUS.APPROVED;
  const isNoShow = report.reason === REPORT_REASONS.NO_SHOW;

  await runTransaction(db, async (tx) => {
    const countRefs = wasApproved
      ? struckUserIds.map((userId) =>
          doc(db, LADDERS, report.ladderId, REPORT_COUNTS, userId),
        )
      : [];
    const userRefs = wasApproved
      ? struckUserIds.map((userId) => doc(db, USERS, userId))
      : [];
    const countSnaps = await Promise.all(countRefs.map((ref) => tx.get(ref)));
    const userSnaps = await Promise.all(userRefs.map((ref) => tx.get(ref)));

    let reverseWalkover: (() => void) | null = null;
    if (wasApproved && isNoShow && report.walkover) {
      reverseWalkover = await prepareWalkoverReversal(tx, report, report.walkover);
    }

    if (wasApproved) {
      struckUserIds.forEach((userId, index) => {
        const countData = countSnaps[index].exists()
          ? (countSnaps[index].data() as Record<string, unknown>)
          : undefined;
        tx.set(
          countRefs[index],
          {
            userId,
            ladderId: report.ladderId,
            teamKey: report.target.teamKey ?? null,
            strikes: removeStrike(strikesOf(countData), reason),
            updatedAt: new Date(),
          },
          { merge: true },
        );
        const userData = userSnaps[index].exists()
          ? (userSnaps[index].data() as Record<string, unknown>)
          : undefined;
        const conduct =
          (userData?.conduct as { strikes?: StrikeCounts } | undefined) ?? {};
        tx.set(
          userRefs[index],
          {
            conduct: {
              ...conduct,
              strikes: removeStrike(conduct.strikes ?? {}, reason),
              lastReportedAt: new Date(),
            },
          },
          { merge: true },
        );
      });
      reverseWalkover?.();
    }

    // Reverting a rejected no-show puts the match back under review (the
    // approved path already does this via the walkover reversal).
    if (isNoShow && !wasApproved) {
      tx.update(
        doc(db, LADDERS, report.ladderId, LADDER_MATCHES, report.ladderMatchId),
        { noShowReported: true },
      );
    }

    tx.update(doc(db, REPORTS, report.reportId), {
      status: REPORT_STATUS.PENDING,
      resolvedAt: null,
      resolvedBy: null,
      revertedAt: new Date(),
      revertedBy: adminUserId,
    });
  });
};
