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
import { WALKOVER_FINAL_MESSAGE, approveReport, rejectReport, revertReport } from "./reports";

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
  jest.clearAllMocks();
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

  it("adds a strike only, with no walkover, once the ladder's standings are final", async () => {
    store["ladders/L1"] = { standingsFinalisedAt: new Date(), status: "completed" };
    store["ladders/L1/ladderMatches/m1"] = { matchStatus: "accepted", playoffTieId: "r3-s0" };

    await approveReport(report, "admin");

    const paths = tx.update.mock.calls.map(([ref]) => (ref as { path: string }).path);
    expect(paths).toEqual(["reports/r1"]);
    expect(tx.update.mock.calls[0][1]).toMatchObject({
      status: REPORT_STATUS.APPROVED,
      walkoverApplied: false,
    });
    expect(tx.set).toHaveBeenCalledWith(
      { path: "ladders/L1/reportCounts/b" },
      expect.objectContaining({ strikes: { no_show: 1 } }),
      { merge: true },
    );
    expect(tx.set).toHaveBeenCalledWith(
      { path: "users/b" },
      expect.objectContaining({ conduct: expect.objectContaining({ strikes: { no_show: 1 } }) }),
      { merge: true },
    );
  });
});

describe("rejectReport", () => {
  it("dismisses a report even once the ladder's standings are final", async () => {
    await rejectReport(report, "admin");
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { path: "reports/r1" },
      expect.objectContaining({ status: REPORT_STATUS.REJECTED, resolvedBy: "admin" }),
    );
    expect(mockBatchCommit).toHaveBeenCalled();
  });
});

describe("revertReport", () => {
  const approved = { ...report, status: REPORT_STATUS.APPROVED, resolvedAt: new Date() };

  it("removes a strike-only approval after the standings are final", async () => {
    store["ladders/L1"] = { standingsFinalisedAt: new Date() };
    store["ladders/L1/reportCounts/b"] = { strikes: { no_show: 1 } };
    store["users/b"] = { conduct: { strikes: { no_show: 1 } } };

    await revertReport({ ...approved, walkoverApplied: false }, "admin");

    expect(tx.update).toHaveBeenCalledWith(
      { path: "reports/r1" },
      expect.objectContaining({ status: REPORT_STATUS.PENDING, walkoverApplied: null }),
    );
    expect(tx.set).toHaveBeenCalledWith(
      { path: "ladders/L1/reportCounts/b" },
      expect.objectContaining({ strikes: {} }),
      { merge: true },
    );
  });

  it("won't reverse a walkover once the standings are final", async () => {
    store["ladders/L1"] = { standingsFinalisedAt: new Date() };
    await expect(revertReport(approved, "admin")).rejects.toThrow(WALKOVER_FINAL_MESSAGE);
    expect(tx.update).not.toHaveBeenCalled();
  });
});
