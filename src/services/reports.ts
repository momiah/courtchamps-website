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
import { isLadderStandingsLocked } from "../utils/ladderStandings";
import {
  REPORT_STATUS,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORTS_COLLECTION,
  LADDER_REPORT_COUNTS_COLLECTION,
} from "courtchamps-shared/types";
import type {
  Ladder,
  LadderMatch,
  LadderMatchArrival,
  Report,
  ReportWalkover,
} from "courtchamps-shared/types";
import {
  getLadderArrival,
  getLadderStandingsDeadline,
  getLadderWalkoverSides,
  hasArrivedForLadderMatch,
  planLadderWalkover,
  planReportStrikes,
} from "courtchamps-shared/helpers";
import type { LadderWalkoverSide } from "courtchamps-shared/helpers";

const REPORTS = REPORTS_COLLECTION;
const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_TEAMS = "ladderTeams";
const LADDER_PARTICIPANTS = "ladderParticipants";
const TEAMS = "teams";
const USERS = "users";
const REPORT_COUNTS = LADDER_REPORT_COUNTS_COLLECTION;

export interface EnrichedReport extends Report {
  reporterLabel: string;
  targetLabel: string;
  reasonLabel: string;
  decideBy: Date | null;
  standingsLocked: boolean;
  reporterArrival: LadderMatchArrival | null;
  targetArrived: boolean;
}

interface ReportContext {
  ladder?: Ladder;
  match?: LadderMatch;
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

const enrich = async (
  report: Report,
  { ladder, match }: ReportContext,
): Promise<EnrichedReport> => {
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
    decideBy: ladder ? getLadderStandingsDeadline(ladder) : null,
    standingsLocked: isLadderStandingsLocked(ladder),
    reporterArrival: match ? getLadderArrival(match, report.reportedBy) : null,
    targetArrived: match
      ? hasArrivedForLadderMatch(match, report.target.userIds ?? [])
      : false,
  };
};

const loadReportContexts = async (
  reports: Report[],
): Promise<Map<string, ReportContext>> => {
  const ladderIds = Array.from(
    new Set(reports.map((report) => report.ladderId)),
  );
  const ladders = new Map(
    await Promise.all(
      ladderIds.map(async (ladderId) => {
        const snap = await getDoc(doc(db, LADDERS, ladderId));
        return [ladderId, snap.data() as Ladder | undefined] as const;
      }),
    ),
  );
  const contexts = new Map<string, ReportContext>();
  await Promise.all(
    reports.map(async (report) => {
      const match =
        report.reason === REPORT_REASONS.NO_SHOW
          ? ((
              await getDoc(
                doc(
                  db,
                  LADDERS,
                  report.ladderId,
                  LADDER_MATCHES,
                  report.ladderMatchId,
                ),
              )
            ).data() as LadderMatch | undefined)
          : undefined;
      contexts.set(report.reportId, {
        ladder: ladders.get(report.ladderId),
        match,
      });
    }),
  );
  return contexts;
};

export const fetchReports = async (): Promise<EnrichedReport[]> => {
  const snapshot = await getDocs(collection(db, REPORTS));
  const reports = snapshot.docs.map((d) => d.data() as Report);
  const contexts = await loadReportContexts(reports);
  const enriched = await Promise.all(
    reports.map((report) =>
      enrich(report, contexts.get(report.reportId) ?? {}),
    ),
  );
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

const walkoverSideRef = (ladderId: string, side: LadderWalkoverSide) =>
  side.kind === "ladderParticipant"
    ? doc(db, LADDERS, ladderId, LADDER_PARTICIPANTS, side.id)
    : side.kind === "ladderTeam"
      ? doc(db, LADDERS, ladderId, LADDER_TEAMS, side.id)
      : doc(db, TEAMS, side.id);

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
  const sides = getLadderWalkoverSides(report, walkover);
  const sideRefs = sides.map((side) => walkoverSideRef(report.ladderId, side));
  const [matchSnap, sideSnaps] = await Promise.all([
    tx.get(matchRef),
    Promise.all(sideRefs.map((ref) => tx.get(ref))),
  ]);
  const plan = planLadderWalkover({
    walkover,
    sides,
    sideData: sideSnaps.map((snap) =>
      snap.exists() ? snap.data() : undefined,
    ),
    match: matchSnap.exists() ? matchSnap.data() : undefined,
    mode,
    now: new Date(),
  });

  return () => {
    plan.sideUpdates.forEach((update, index) => {
      if (update) tx.update(sideRefs[index], update);
    });
    if (plan.matchUpdate) tx.update(matchRef, plan.matchUpdate);
  };
};

const prepareStrikeDelta = async (
  tx: Transaction,
  report: Report,
  mode: "apply" | "remove",
): Promise<() => void> => {
  const userIds = report.target.userIds ?? [];
  const countRefs = userIds.map((userId) =>
    doc(db, LADDERS, report.ladderId, REPORT_COUNTS, userId),
  );
  const userRefs = userIds.map((userId) => doc(db, USERS, userId));
  const countSnaps = await Promise.all(countRefs.map((ref) => tx.get(ref)));
  const userSnaps = await Promise.all(userRefs.map((ref) => tx.get(ref)));
  const plan = planReportStrikes({
    report,
    counts: countSnaps.map((snap) => (snap.exists() ? snap.data() : undefined)),
    users: userSnaps.map((snap) => (snap.exists() ? snap.data() : undefined)),
    mode,
    now: new Date(),
  });

  return () => {
    plan.countUpdates.forEach((update, index) =>
      tx.set(countRefs[index], update, { merge: true }),
    );
    plan.userUpdates.forEach((update, index) =>
      tx.set(userRefs[index], update, { merge: true }),
    );
  };
};

const isReportLadderOpen = async (
  report: Report,
  tx: Transaction,
): Promise<boolean> => {
  const ladderSnap = await tx.get(doc(db, LADDERS, report.ladderId));
  return !isLadderStandingsLocked(ladderSnap.data() as Ladder | undefined);
};

export const WALKOVER_FINAL_MESSAGE =
  "This walkover is part of standings that are now final, so it can't be reversed.";

const ranWalkover = (report: Report): boolean =>
  report.status === REPORT_STATUS.APPROVED &&
  report.reason === REPORT_REASONS.NO_SHOW &&
  !!report.walkover &&
  report.walkoverApplied !== false;

export const approveReport = async (
  report: Report,
  adminUserId: string,
): Promise<void> => {
  const isNoShow = report.reason === REPORT_REASONS.NO_SHOW;

  await runTransaction(db, async (tx) => {
    const standingsOpen = await isReportLadderOpen(report, tx);
    const writeStrikes = await prepareStrikeDelta(tx, report, "apply");
    const writeWalkover =
      isNoShow && report.walkover && standingsOpen
        ? await prepareWalkoverSettlement(
            tx,
            report,
            report.walkover,
            "approve",
          )
        : null;

    writeStrikes();
    writeWalkover?.();
    tx.update(doc(db, REPORTS, report.reportId), {
      status: REPORT_STATUS.APPROVED,
      resolvedAt: new Date(),
      resolvedBy: adminUserId,
      walkoverApplied: !!writeWalkover,
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
  if (report.reason === REPORT_REASONS.NO_SHOW) {
    batch.update(
      doc(db, LADDERS, report.ladderId, LADDER_MATCHES, report.ladderMatchId),
      { noShowReported: false },
    );
  }
  await batch.commit();
};

export const revertReport = async (
  report: Report,
  adminUserId: string,
): Promise<void> => {
  const wasApproved = report.status === REPORT_STATUS.APPROVED;
  const isNoShow = report.reason === REPORT_REASONS.NO_SHOW;

  await runTransaction(db, async (tx) => {
    const standingsOpen = await isReportLadderOpen(report, tx);
    if (ranWalkover(report) && !standingsOpen) {
      throw new Error(WALKOVER_FINAL_MESSAGE);
    }
    let writeStrikes: (() => void) | null = null;
    let writeWalkover: (() => void) | null = null;
    if (wasApproved) {
      writeStrikes = await prepareStrikeDelta(tx, report, "remove");
      if (ranWalkover(report) && report.walkover) {
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
      walkoverApplied: null,
    });
  });
};
