import {
  DISPUTE_STAGE,
  LADDER_MATCH_STATUS,
  LADDER_STATUS,
  REPORT_STATUS,
} from "courtchamps-shared/types";
import type {
  Dispute,
  Ladder,
  LadderMatch,
  Report,
} from "courtchamps-shared/types";
import { notificationTypes } from "courtchamps-shared/schema";
import {
  PLATFORM_FEE,
  calculateLadderPrizePool,
  getLadderPlayoffStructureForRegistrations,
} from "courtchamps-shared/helpers";

const APPROVED_GAME = notificationTypes.RESPONSE.APPROVED_GAME;
const PENDING_GAME = "Pending";
const DAY_MS = 24 * 60 * 60 * 1000;

export const isLadderLocked = (
  ladder: Pick<Ladder, "status" | "registrationOpensAt" | "participantCount">,
  now: Date = new Date(),
): boolean =>
  ladder.status !== LADDER_STATUS.REGISTRATION_OPEN ||
  ladder.participantCount > 0 ||
  ladder.registrationOpensAt.getTime() <= now.getTime();

export interface LadderMatchSummary {
  open: number;
  inProgress: number;
  completed: number;
  walkovers: number;
  cancelled: number;
  expired: number;
  gamesPlayed: number;
  gamesAwaitingApproval: number;
}

export const summarizeLadderMatches = (
  matches: Pick<LadderMatch, "matchStatus" | "games" | "walkover">[],
): LadderMatchSummary =>
  matches.reduce<LadderMatchSummary>(
    (summary, match) => {
      const games = match.games ?? [];
      return {
        open:
          summary.open +
          Number(match.matchStatus === LADDER_MATCH_STATUS.POSTED),
        inProgress:
          summary.inProgress +
          Number(match.matchStatus === LADDER_MATCH_STATUS.ACCEPTED),
        completed:
          summary.completed +
          Number(match.matchStatus === LADDER_MATCH_STATUS.COMPLETED),
        walkovers: summary.walkovers + Number(!!match.walkover),
        cancelled:
          summary.cancelled +
          Number(match.matchStatus === LADDER_MATCH_STATUS.CANCELLED),
        expired:
          summary.expired +
          Number(match.matchStatus === LADDER_MATCH_STATUS.EXPIRED),
        gamesPlayed:
          summary.gamesPlayed +
          games.filter((game) => game.approvalStatus === APPROVED_GAME).length,
        gamesAwaitingApproval:
          summary.gamesAwaitingApproval +
          games.filter(
            (game) => game.approvalStatus === PENDING_GAME && !!game.result,
          ).length,
      };
    },
    {
      open: 0,
      inProgress: 0,
      completed: 0,
      walkovers: 0,
      cancelled: 0,
      expired: 0,
      gamesPlayed: 0,
      gamesAwaitingApproval: 0,
    },
  );

export interface LadderActivity {
  entrants: number;
  maxEntrants: number;
  playoffSpots: number;
  matches: LadderMatchSummary;
  openDisputes: number;
  resolvedDisputes: number;
  pendingReports: number;
  entryFeesCollected: number;
  platformFees: number;
  prizePool: number;
  daysToPlayoffs: number | null;
}

export const buildLadderActivity = ({
  ladder,
  matches,
  disputes,
  reports,
  now = new Date(),
}: {
  ladder: Pick<
    Ladder,
    "participantCount" | "maxPlayers" | "entryFee" | "playoffStartsAt"
  >;
  matches: Pick<LadderMatch, "matchStatus" | "games" | "walkover">[];
  disputes: Pick<Dispute, "stage">[];
  reports: Pick<Report, "status">[];
  now?: Date;
}): LadderActivity => {
  const entryFeesCollected =
    ladder.entryFee > 0 ? ladder.entryFee * ladder.participantCount : 0;
  const msToPlayoffs = ladder.playoffStartsAt.getTime() - now.getTime();

  return {
    entrants: ladder.participantCount,
    maxEntrants: ladder.maxPlayers,
    playoffSpots: getLadderPlayoffStructureForRegistrations(
      ladder.participantCount,
      ladder.maxPlayers,
    ).playoffSpots,
    matches: summarizeLadderMatches(matches),
    openDisputes: disputes.filter(
      (dispute) => dispute.stage !== DISPUTE_STAGE.RESOLVED,
    ).length,
    resolvedDisputes: disputes.filter(
      (dispute) => dispute.stage === DISPUTE_STAGE.RESOLVED,
    ).length,
    pendingReports: reports.filter(
      (report) => report.status === REPORT_STATUS.PENDING,
    ).length,
    entryFeesCollected,
    platformFees: entryFeesCollected * PLATFORM_FEE,
    prizePool: calculateLadderPrizePool({
      entryFee: ladder.entryFee,
      participantCount: ladder.participantCount,
    }).cash,
    daysToPlayoffs: msToPlayoffs > 0 ? Math.ceil(msToPlayoffs / DAY_MS) : null,
  };
};
