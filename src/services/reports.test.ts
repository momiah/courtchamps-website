import { REPORT_REASONS, REPORT_STATUS } from "courtchamps-shared/types";
import type { Report } from "courtchamps-shared/types";

jest.mock("../firebase/config", () => ({ db: {} }));

const mockGetDoc = jest.fn();
const mockRunTransaction = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();
jest.mock("firebase/firestore", () => ({
  collection: () => ({}),
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: () => Promise.resolve({ docs: [] }),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  writeBatch: () => ({ update: mockBatchUpdate, commit: mockBatchCommit }),
}));

// eslint-disable-next-line import/first
import { STANDINGS_FINAL_MESSAGE } from "../utils/ladderStandings";
// eslint-disable-next-line import/first
import { approveReport, rejectReport } from "./reports";

const snapOf = (data: unknown) => ({
  exists: () => data !== undefined,
  data: () => data,
});

const report: Report = {
  reportId: "r1",
  ladderId: "L1",
  ladderType: "Singles",
  ladderMatchId: "m1",
  reason: REPORT_REASONS.NO_SHOW,
  reportedBy: "a",
  target: { type: "player", userIds: ["b"] },
  walkover: { winnerType: "player", winnerUserIds: ["a"] },
  status: REPORT_STATUS.PENDING,
  createdAt: new Date(),
};

const store: Record<string, unknown> = {};
const tx = { get: jest.fn(), set: jest.fn(), update: jest.fn() };

beforeEach(() => {
  Object.keys(store).forEach((key) => delete store[key]);
  tx.get.mockImplementation(async (ref: { path: string }) =>
    snapOf(store[ref.path]),
  );
  mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
});

describe("approveReport", () => {
  it("awards the walkover and the strike through the shared plans", async () => {
    store["ladders/L1"] = {
      playoffStartsAt: new Date(Date.now() + 30 * 86400000),
    };
    store["ladders/L1/ladderMatches/m1"] = { matchStatus: "accepted" };
    store["ladders/L1/ladderParticipants/a"] = {
      competitionXP: 100,
      numberOfWins: 0,
    };
    store["ladders/L1/ladderParticipants/b"] = {
      competitionXP: 20,
      numberOfLosses: 0,
    };

    await approveReport(report, "admin");

    const updates = Object.fromEntries(
      tx.update.mock.calls.map(([ref, data]) => [
        (ref as { path: string }).path,
        data,
      ]),
    );
    expect(updates["ladders/L1/ladderParticipants/a"]).toMatchObject({
      competitionXP: 120,
      numberOfWins: 1,
    });
    expect(updates["ladders/L1/ladderParticipants/b"]).toMatchObject({
      competitionXP: 0,
      numberOfLosses: 1,
    });
    expect(updates["ladders/L1/ladderMatches/m1"]).toMatchObject({
      walkover: true,
      walkoverCp: 20,
    });
    expect(updates["reports/r1"]).toMatchObject({
      status: REPORT_STATUS.APPROVED,
      resolvedBy: "admin",
    });
    expect(tx.set).toHaveBeenCalledWith(
      { path: "ladders/L1/reportCounts/b" },
      expect.objectContaining({ strikes: { no_show: 1 } }),
      { merge: true },
    );
  });

  it("refuses once the ladder's standings are final", async () => {
    store["ladders/L1"] = { standingsFinalisedAt: new Date() };
    await expect(approveReport(report, "admin")).rejects.toThrow(
      STANDINGS_FINAL_MESSAGE,
    );
    expect(tx.update).not.toHaveBeenCalled();
  });
});

describe("rejectReport", () => {
  it("refuses once the ladder's standings are final", async () => {
    mockGetDoc.mockResolvedValueOnce(
      snapOf({ standingsFinalisedAt: new Date() }),
    );
    await expect(rejectReport(report, "admin")).rejects.toThrow(
      STANDINGS_FINAL_MESSAGE,
    );
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});
