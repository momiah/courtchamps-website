import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
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
import { applyStrike, removeStrike } from "courtchamps-shared/helpers";

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

const strikesOf = (data: Record<string, unknown> | undefined): StrikeCounts =>
  ((data?.strikes as StrikeCounts) ?? {}) as StrikeCounts;

const pushResult = (log: unknown, result: "W" | "L"): string[] =>
  [...(Array.isArray(log) ? (log as string[]) : []), result].slice(
    -MATCH_LOG_CAP,
  );

const popResult = (log: unknown): string[] =>
  Array.isArray(log) ? (log as string[]).slice(0, -1) : [];

/**
 * One walkover side (winner or loser), applied forward on approval (`sign` 1) or
 * reversed on revert (`sign` -1): adjusts the win/loss tally and the match-result
 * form, and — where a CP field is given — moves CP (the winner gains, the loser
 * loses on approval; the inverse on revert).
 */
const applyWalkoverSide = (
  data: Record<string, unknown>,
  role: "winner" | "loser",
  sign: 1 | -1,
  cpField?: string,
  cp = 0,
): Record<string, unknown> => {
  const isWinner = role === "winner";
  const countField = isWinner ? "numberOfWins" : "numberOfLosses";
  const letter: "W" | "L" = isWinner ? "W" : "L";
  const update: Record<string, unknown> = {
    [countField]: Math.max(0, num(data, countField) + sign),
    matchResultLog:
      sign > 0
        ? pushResult(data.matchResultLog, letter)
        : popResult(data.matchResultLog),
  };
  if (cpField) {
    update[cpField] = num(data, cpField) + (isWinner ? cp : -cp) * sign;
  }
  return update;
};

const walkoverMatchUpdate = (walkoverWinner: string, cp: number) => ({
  matchStatus: LADDER_MATCH_STATUS.COMPLETED,
  walkover: true,
  walkoverReason: "No show",
  walkoverWinner,
  walkoverCp: cp,
  completedAt: new Date(),
});

const reverseWalkoverMatchUpdate = () => ({
  matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
  walkover: false,
  walkoverReason: null,
  walkoverWinner: null,
  walkoverCp: null,
  completedAt: null,
  // The report is pending again after a revert, so keep the match under review.
  noShowReported: true,
});

interface WalkoverSide {
  ref: ReturnType<typeof doc>;
  role: "winner" | "loser";
  cpField?: string;
}

/**
 * Reads a no-show walkover's match + ranking docs and returns a closure that
 * writes the settlement. `mode` is the only difference between approve and
 * revert: the sign of every mutation, the CP source (approve caps at the loser's
 * balance; revert reads the amount stored on the match at approval), and the
 * match update. All reads happen here so the caller keeps reads before writes.
 */
const prepareWalkoverSettlement = async (
  tx: Transaction,
  report: Report,
  walkover: ReportWalkover,
  mode: "approve" | "revert",
): Promise<() => void> => {
  const matchRef = doc(
    db,
    LADDERS,
    report.ladderId,
    LADDER_MATCHES,
    report.ladderMatchId,
  );
  const matchSnap = await tx.get(matchRef);
  if (mode === "approve") {
    if (!matchSnap.exists()) throw new Error("Match not found");
    if (
      (matchSnap.data() as { matchStatus?: string }).matchStatus ===
      LADDER_MATCH_STATUS.COMPLETED
    ) {
      throw new Error("This match has already been completed");
    }
  }

  const isDoubles = walkover.winnerType === "team";
  const cpField = isDoubles ? "XP" : "competitionXP";
  const sides: WalkoverSide[] = isDoubles
    ? [
        {
          ref: doc(db, LADDERS, report.ladderId, LADDER_TEAMS, walkover.winnerTeamKey ?? ""),
          role: "winner",
          cpField,
        },
        { ref: doc(db, TEAMS, walkover.winnerTeamId ?? ""), role: "winner" },
        {
          ref: doc(db, LADDERS, report.ladderId, LADDER_TEAMS, report.target.teamKey ?? ""),
          role: "loser",
          cpField,
        },
        { ref: doc(db, TEAMS, report.target.teamId ?? ""), role: "loser" },
      ]
    : [
        {
          ref: doc(db, LADDERS, report.ladderId, LADDER_PARTICIPANTS, walkover.winnerUserIds[0]),
          role: "winner",
          cpField,
        },
        {
          ref: doc(db, LADDERS, report.ladderId, LADDER_PARTICIPANTS, report.target.userIds[0]),
          role: "loser",
          cpField,
        },
      ];
  const snaps = await Promise.all(sides.map((side) => tx.get(side.ref)));

  // CP field lives on the ranking record (ladder team / participant), so the
  // loser's balance for the cap is that side's snapshot.
  const loserIndex = sides.findIndex(
    (side) => side.role === "loser" && side.cpField,
  );
  const loserSnap = snaps[loserIndex];
  const cp =
    mode === "approve"
      ? Math.min(WALKOVER_CP, loserSnap?.exists() ? num(loserSnap.data(), cpField) : 0)
      : matchSnap.exists()
        ? num(matchSnap.data(), "walkoverCp")
        : 0;

  const sign: 1 | -1 = mode === "approve" ? 1 : -1;
  const winnerKey = isDoubles ? walkover.winnerTeamKey ?? "" : walkover.winnerUserIds[0];

  return () => {
    sides.forEach((side, index) => {
      if (snaps[index].exists()) {
        tx.update(
          side.ref,
          applyWalkoverSide(snaps[index].data(), side.role, sign, side.cpField, cp),
        );
      }
    });
    if (matchSnap.exists()) {
      tx.update(
        matchRef,
        mode === "approve"
          ? walkoverMatchUpdate(winnerKey, cp)
          : reverseWalkoverMatchUpdate(),
      );
    }
  };
};

/**
 * Reads each struck player's per-ladder count + global conduct docs and returns
 * a closure that writes the given strike change (add on approve, remove on
 * revert) to both.
 */
const prepareStrikeDelta = async (
  tx: Transaction,
  report: Report,
  mutate: (strikes: StrikeCounts) => StrikeCounts,
): Promise<() => void> => {
  const userIds = report.target.userIds ?? [];
  const countRefs = userIds.map((userId) =>
    doc(db, LADDERS, report.ladderId, REPORT_COUNTS, userId),
  );
  const userRefs = userIds.map((userId) => doc(db, USERS, userId));
  const countSnaps = await Promise.all(countRefs.map((ref) => tx.get(ref)));
  const userSnaps = await Promise.all(userRefs.map((ref) => tx.get(ref)));

  return () => {
    userIds.forEach((userId, index) => {
      const countData = countSnaps[index].exists()
        ? (countSnaps[index].data() as Record<string, unknown>)
        : undefined;
      tx.set(
        countRefs[index],
        {
          userId,
          ladderId: report.ladderId,
          teamKey: report.target.teamKey ?? null,
          strikes: mutate(strikesOf(countData)),
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
            strikes: mutate(conduct.strikes ?? {}),
            lastReportedAt: new Date(),
          },
        },
        { merge: true },
      );
    });
  };
};

/**
 * Approve a report in one atomic transaction: mark it approved, add one strike
 * of its reason to each struck player's per-ladder count and global conduct
 * tally, and — for a no-show — complete the match as a walkover with the capped
 * CP transfer.
 */
export const approveReport = async (
  report: Report,
  adminUserId: string,
): Promise<void> => {
  const reason = report.reason as DisqualificationReason;
  const isNoShow = report.reason === REPORT_REASONS.NO_SHOW;

  await runTransaction(db, async (tx) => {
    const writeStrikes = await prepareStrikeDelta(tx, report, (strikes) =>
      applyStrike(strikes, reason),
    );
    const writeWalkover =
      isNoShow && report.walkover
        ? await prepareWalkoverSettlement(tx, report, report.walkover, "approve")
        : null;

    writeStrikes();
    writeWalkover?.();
    tx.update(doc(db, REPORTS, report.reportId), {
      status: REPORT_STATUS.APPROVED,
      resolvedAt: new Date(),
      resolvedBy: adminUserId,
    });
  });
};

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

/**
 * Revert a resolved report back to pending. An approved report's effects are
 * undone atomically — one strike removed from each struck player's tallies, and
 * the walkover reversed for a no-show. A rejected report had no effects, so only
 * its status flips back.
 */
export const revertReport = async (
  report: Report,
  adminUserId: string,
): Promise<void> => {
  const reason = report.reason as DisqualificationReason;
  const wasApproved = report.status === REPORT_STATUS.APPROVED;
  const isNoShow = report.reason === REPORT_REASONS.NO_SHOW;

  await runTransaction(db, async (tx) => {
    let writeStrikes: (() => void) | null = null;
    let writeWalkover: (() => void) | null = null;
    if (wasApproved) {
      writeStrikes = await prepareStrikeDelta(tx, report, (strikes) =>
        removeStrike(strikes, reason),
      );
      if (isNoShow && report.walkover) {
        writeWalkover = await prepareWalkoverSettlement(
          tx,
          report,
          report.walkover,
          "revert",
        );
      }
    }

    writeStrikes?.();
    writeWalkover?.();
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
