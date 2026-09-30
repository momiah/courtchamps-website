/**
 * Unit tests for the admin dispute-resolution actions (approveDispute,
 * rejectDispute, voidDispute, requestMoreEvidence) and the admin queue's
 * fetchActiveDisputes enrichment. Firestore is mocked at the module boundary
 * so these exercise the real orchestration, guards, and notification copy in
 * services/disputes.ts without a live backend — mirrors the pattern already
 * used for the mobile app's own services/disputes.test.ts.
 */
import {
  DISPUTE_STAGE,
  DISPUTE_EVENT_TYPE,
  DISPUTE_RESOLUTION,
  DISPUTE_EVIDENCE_WINDOW_HOURS,
  LADDER_TYPE,
} from "courtchamps-shared/types";
import type { Dispute } from "courtchamps-shared/types";

// ── Mocks ────────────────────────────────────────────────────────────────
jest.mock("../firebase/config", () => ({ db: {} }));

const mockGetDocs = jest.fn();
const mockRunTransaction = jest.fn();
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
jest.mock("firebase/firestore", () => ({
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: jest.fn((_db, ...path) => ({ __col: path.join("/") })),
  doc: jest.fn((...args) => ({
    __ref: args,
    id: args.length <= 1 ? "generated-id" : String(args[args.length - 1]),
  })),
  getDoc: jest.fn(),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: jest.fn((...args) => ({ __query: args })),
  where: jest.fn((...args) => ({ __where: args })),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}));

const mockPlanDisputeResolution = jest.fn();
jest.mock("courtchamps-shared/helpers", () => ({
  ...jest.requireActual("courtchamps-shared/helpers"),
  planDisputeResolution: (...args: unknown[]) =>
    mockPlanDisputeResolution(...args),
  getDisputePlayerIds: () => [],
  isDoublesDispute: () => false,
}));

// Must follow the jest.mock calls above for readability;
// babel-plugin-jest-hoist hoists them either way.
// eslint-disable-next-line import/first
import {
  approveDispute,
  rejectDispute,
  voidDispute,
  requestMoreEvidence,
  fetchActiveDisputes,
} from "./disputes";

// ── Fixtures ─────────────────────────────────────────────────────────────
const snapOf = <T>(exists: boolean, data: T) => ({
  exists: () => exists,
  data: () => data,
});
const docsSnap = (docs: unknown[]) => ({ docs });

const makeMatch = () => ({
  ladderMatchId: "m1",
  games: [],
  teams: [],
  participants: ["opener", "reporter"],
});

const baseDispute: Dispute = {
  disputeId: "d1",
  ladderId: "L1",
  ladderName: "Test Ladder",
  ladderType: LADDER_TYPE.SINGLES,
  ladderMatchId: "m1",
  gameId: "g1",
  originalGame: {} as Dispute["originalGame"],
  disputedGame: {} as Dispute["disputedGame"],
  openedBy: "opener",
  participantIds: ["opener", "reporter"],
  stage: DISPUTE_STAGE.UNDER_REVIEW,
  events: [
    {
      type: DISPUTE_EVENT_TYPE.OPENED,
      stage: DISPUTE_STAGE.UNDER_REVIEW,
      createdBy: "opener",
      createdAt: new Date(),
    },
  ],
  evidenceDueAt: null,
  resolution: null,
  finalGame: null,
  adminNotes: null,
  createdAt: new Date(),
  resolvedAt: null,
  resolvedBy: null,
};

const makeTx = (getResults: Array<ReturnType<typeof snapOf>>) => {
  const get = jest.fn();
  getResults.forEach((r) => get.mockResolvedValueOnce(r));
  return { get, set: jest.fn(), update: jest.fn() };
};

const resolvedPlan = () => ({
  participants: [],
  users: [],
  teams: [],
  matchUpdate: { games: [] },
  disputeUpdate: { stage: DISPUTE_STAGE.RESOLVED },
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── approveDispute / rejectDispute ──────────────────────────────────────
describe("approveDispute", () => {
  it("resolves UPHELD through the shared plan and notifies players", async () => {
    const tx = makeTx([snapOf(true, makeMatch())]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    mockPlanDisputeResolution.mockResolvedValueOnce(resolvedPlan());

    await approveDispute(baseDispute, "admin1", "Looks correct");

    expect(mockPlanDisputeResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: DISPUTE_RESOLUTION.UPHELD,
        actorId: "admin1",
        note: "Looks correct",
      }),
    );
    expect(tx.update).toHaveBeenCalledTimes(2); // match + dispute
    expect(mockAddDoc).toHaveBeenCalledTimes(2); // one per participant
    const [, notification] = mockAddDoc.mock.calls[0];
    expect(notification.message).toMatch(/upheld/i);
  });

  it("throws when the match doc is missing", async () => {
    const tx = makeTx([snapOf(false, undefined)]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    await expect(approveDispute(baseDispute, "admin1")).rejects.toThrow(
      "Match not found",
    );
  });
});

describe("rejectDispute", () => {
  it("resolves REJECTED and notifies with the 'original score stands' message", async () => {
    const tx = makeTx([snapOf(true, makeMatch())]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    mockPlanDisputeResolution.mockResolvedValueOnce(resolvedPlan());

    await rejectDispute(baseDispute, "admin1");

    expect(mockPlanDisputeResolution).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: DISPUTE_RESOLUTION.REJECTED }),
    );
    const [, notification] = mockAddDoc.mock.calls[0];
    expect(notification.message).toMatch(/original score stands/i);
  });
});

// ── voidDispute ──────────────────────────────────────────────────────────
describe("voidDispute", () => {
  it("refuses when the evidence deadline hasn't passed yet", async () => {
    const notOverdue: Dispute = {
      ...baseDispute,
      stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
      evidenceDueAt: new Date(Date.now() + 60_000),
    };
    await expect(voidDispute(notOverdue, "admin1")).rejects.toThrow(
      "has not passed yet",
    );
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("refuses when the dispute was never put to more_evidence_requested", async () => {
    await expect(voidDispute(baseDispute, "admin1")).rejects.toThrow(
      "has not passed yet",
    );
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("resolves VOID once the deadline has passed", async () => {
    const overdue: Dispute = {
      ...baseDispute,
      stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
      evidenceDueAt: new Date(Date.now() - 60_000),
    };
    const tx = makeTx([snapOf(true, makeMatch())]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    mockPlanDisputeResolution.mockResolvedValueOnce(resolvedPlan());

    await voidDispute(overdue, "admin1");

    expect(mockPlanDisputeResolution).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: DISPUTE_RESOLUTION.VOID }),
    );
    const [, notification] = mockAddDoc.mock.calls[0];
    expect(notification.message).toMatch(/voided/i);
  });
});

// ── requestMoreEvidence ──────────────────────────────────────────────────
describe("requestMoreEvidence", () => {
  it("moves the dispute to more_evidence_requested with a due deadline and notifies players", async () => {
    await requestMoreEvidence(baseDispute, "admin1", "Please add a video");

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.stage).toBe(DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED);
    expect(update.evidenceDueAt.getTime() - Date.now()).toBeGreaterThan(
      (DISPUTE_EVIDENCE_WINDOW_HOURS - 1) * 60 * 60 * 1000,
    );
    expect(update.events).toHaveLength(2);
    const newEvent = update.events[1];
    expect(newEvent.type).toBe(DISPUTE_EVENT_TYPE.EVIDENCE_REQUESTED);
    expect(newEvent.stage).toBe(DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED);
    expect(newEvent.createdBy).toBe("admin1");
    expect(newEvent.note).toBe("Please add a video");

    expect(mockAddDoc).toHaveBeenCalledTimes(2);
    const [, notification] = mockAddDoc.mock.calls[0];
    expect(notification.message).toMatch(/requested more evidence/i);
  });

  it("omits the note field entirely when left blank", async () => {
    await requestMoreEvidence(baseDispute, "admin1", "   ");
    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.events[1]).not.toHaveProperty("note");
  });
});

// ── fetchActiveDisputes ──────────────────────────────────────────────────
describe("fetchActiveDisputes", () => {
  it("flags rows waiting on the admin and surfaces them first", async () => {
    const waitingOnAdmin = {
      disputeId: "d1",
      participantIds: ["p1"],
      createdAt: new Date(2026, 0, 1),
      events: [
        { type: DISPUTE_EVENT_TYPE.NOTES_SUBMITTED, createdBy: "p1", note: "x" },
      ],
    };
    const waitingOnPlayer = {
      disputeId: "d2",
      participantIds: ["p1"],
      createdAt: new Date(2026, 0, 2),
      events: [
        { type: DISPUTE_EVENT_TYPE.EVIDENCE_REQUESTED, createdBy: "admin1" },
      ],
    };
    mockGetDocs.mockResolvedValueOnce(
      docsSnap([snapOf(true, waitingOnPlayer), snapOf(true, waitingOnAdmin)]),
    );

    const result = await fetchActiveDisputes();

    // waitingOnAdmin (d1) sorts first even though it's the older dispute —
    // needsAttention (last action was a player's) outranks recency.
    expect(result.map((d) => d.disputeId)).toEqual(["d1", "d2"]);
    expect(result[0].needsAttention).toBe(true);
    expect(result[0].hasEvidence).toBe(true);
    expect(result[1].needsAttention).toBe(false);
  });
});
