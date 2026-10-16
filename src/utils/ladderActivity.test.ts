import {
  DISPUTE_STAGE,
  LADDER_MATCH_STATUS,
  LADDER_STATUS,
  REPORT_STATUS,
} from "courtchamps-shared/types";
import type { LadderMatch } from "courtchamps-shared/types";
import {
  buildLadderActivity,
  isLadderLocked,
  summarizeLadderMatches,
} from "./ladderActivity";

const now = new Date("2026-10-05T12:00:00Z");
const daysFromNow = (days: number) =>
  new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

describe("isLadderLocked", () => {
  const upcoming = {
    status: LADDER_STATUS.REGISTRATION_OPEN,
    registrationOpensAt: daysFromNow(3),
    participantCount: 0,
  };

  it("leaves an upcoming ladder with no entrants editable", () => {
    expect(isLadderLocked(upcoming, now)).toBe(false);
  });

  it("locks once registration has opened", () => {
    expect(
      isLadderLocked({ ...upcoming, registrationOpensAt: daysFromNow(-1) }, now),
    ).toBe(true);
  });

  it("locks once anyone has joined", () => {
    expect(isLadderLocked({ ...upcoming, participantCount: 1 }, now)).toBe(
      true,
    );
  });

  it("locks any ladder past registration open", () => {
    expect(
      isLadderLocked({ ...upcoming, status: LADDER_STATUS.CANCELLED }, now),
    ).toBe(true);
  });
});

const game = (approvalStatus: string, withResult = true) => ({
  approvalStatus,
  result: withResult ? { winner: {}, loser: {} } : null,
});

const match = (
  matchStatus: string,
  games: unknown[] = [],
  walkover = false,
) =>
  ({ matchStatus, games, walkover }) as unknown as Pick<
    LadderMatch,
    "matchStatus" | "games" | "walkover"
  >;

describe("summarizeLadderMatches", () => {
  it("counts matches by status and games by approval", () => {
    const summary = summarizeLadderMatches([
      match(LADDER_MATCH_STATUS.POSTED),
      match(LADDER_MATCH_STATUS.ACCEPTED, [
        game("approved"),
        game("Pending"),
        game("Scheduled", false),
      ]),
      match(LADDER_MATCH_STATUS.COMPLETED, [game("approved"), game("approved")]),
      match(LADDER_MATCH_STATUS.COMPLETED, [], true),
      match(LADDER_MATCH_STATUS.CANCELLED),
      match(LADDER_MATCH_STATUS.EXPIRED, [game("Pending", false)]),
    ]);

    expect(summary).toEqual({
      open: 1,
      inProgress: 1,
      completed: 2,
      walkovers: 1,
      cancelled: 1,
      expired: 1,
      gamesPlayed: 3,
      gamesAwaitingApproval: 1,
    });
  });
});

describe("buildLadderActivity", () => {
  const ladder = {
    participantCount: 300,
    maxPlayers: 512,
    entryFee: 10,
    playoffStartsAt: daysFromNow(10),
  };

  it("summarises entrants, disputes, reports and money", () => {
    const activity = buildLadderActivity({
      ladder,
      matches: [],
      disputes: [
        { stage: DISPUTE_STAGE.UNDER_REVIEW },
        { stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED },
        { stage: DISPUTE_STAGE.RESOLVED },
      ],
      reports: [
        { status: REPORT_STATUS.PENDING },
        { status: REPORT_STATUS.APPROVED },
      ],
      now,
    });

    expect(activity).toMatchObject({
      entrants: 300,
      maxEntrants: 512,
      playoffSpots: 16,
      openDisputes: 2,
      resolvedDisputes: 1,
      pendingReports: 1,
      entryFeesCollected: 3000,
      platformFees: 300,
      prizePool: 2700,
      daysToPlayoffs: 10,
    });
  });

  it("reports no money for a free ladder and no countdown once playoffs start", () => {
    const activity = buildLadderActivity({
      ladder: { ...ladder, entryFee: 0, playoffStartsAt: daysFromNow(-1) },
      matches: [],
      disputes: [],
      reports: [],
      now,
    });

    expect(activity.entryFeesCollected).toBe(0);
    expect(activity.platformFees).toBe(0);
    expect(activity.prizePool).toBe(0);
    expect(activity.daysToPlayoffs).toBeNull();
  });
});
