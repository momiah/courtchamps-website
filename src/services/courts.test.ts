import { COURT_SUBMISSION_STATUS } from "courtchamps-shared/types";
import { notificationTypes } from "courtchamps-shared/schema";

jest.mock("../firebase/config", () => ({ db: {} }));

const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockBatch = {
  update: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn(),
};
jest.mock("firebase/firestore", () => ({
  arrayUnion: (...values: unknown[]) => ({ __arrayUnion: values }),
  collection: (_db: unknown, ...path: string[]) => ({ __col: path.join("/") }),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  doc: (first: { __col?: string }, ...path: string[]) =>
    first && first.__col
      ? { __doc: `${first.__col}/new-notification` }
      : { __doc: path.join("/") },
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  serverTimestamp: () => "server-ts",
  setDoc: jest.fn(),
  Timestamp: class {},
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  writeBatch: () => mockBatch,
}));

// eslint-disable-next-line import/first
import { deleteCourt, updateCourt } from "./courts";

const location = (withCoordinates: boolean) => ({
  address: "1 High St",
  city: "London",
  country: "United Kingdom",
  countryCode: "GB",
  postCode: "E1 1AA",
  latitude: withCoordinates ? 51.5 : null,
  longitude: withCoordinates ? -0.1 : null,
});

const submission = (status: string = COURT_SUBMISSION_STATUS.PENDING) => ({
  submittedBy: "player-1",
  submittedByUsername: "player1",
  ladderId: "ladder-1",
  ladderName: "London Ladder",
  submittedAt: new Date("2026-10-01T10:00:00Z"),
  status,
  reviewedBy: null,
  reviewedAt: null,
});

const courtSnap = (data: Record<string, unknown> | null) => ({
  exists: () => data !== null,
  data: () => data,
});

const save = (withCoordinates = true) =>
  updateCourt({
    courtId: "court-1",
    court: { courtName: "Riverside", location: location(withCoordinates) },
    actorUserId: "admin-1",
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockBatch.commit.mockResolvedValue(undefined);
});

describe("updateCourt", () => {
  it("approves a pending submission: verifies, adds to the ladder and notifies", async () => {
    mockGetDoc.mockResolvedValue(
      courtSnap({
        courtName: "Riverside",
        verified: false,
        submission: submission(),
      }),
    );

    const result = await save();

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);

    const [courtRef, courtUpdate] = mockBatch.update.mock.calls[0];
    expect(courtRef).toEqual({ __doc: "courts/court-1" });
    expect(courtUpdate).toMatchObject({
      verified: true,
      verifiedBy: "admin-1",
      submission: {
        status: COURT_SUBMISSION_STATUS.APPROVED,
        reviewedBy: "admin-1",
      },
    });

    expect(mockBatch.update.mock.calls[1]).toEqual([
      { __doc: "ladders/ladder-1" },
      { courtIds: { __arrayUnion: ["court-1"] } },
    ]);

    const [notificationRef, notification] = mockBatch.set.mock.calls[0];
    expect(notificationRef).toEqual({
      __doc: "users/player-1/notifications/new-notification",
    });
    expect(notification).toMatchObject({
      recipientId: "player-1",
      senderId: "system",
      type: notificationTypes.INFORMATION.LADDER.TYPE,
      message:
        "Riverside has been approved. You can now select it in London Ladder.",
      data: { ladderId: "ladder-1", courtId: "court-1", tab: "Matchmaking" },
    });

    expect(result?.status).toBe(COURT_SUBMISSION_STATUS.APPROVED);
  });

  it("leaves a pending submission untouched when saved without coordinates", async () => {
    mockGetDoc.mockResolvedValue(
      courtSnap({ verified: false, submission: submission() }),
    );

    const result = await save(false);

    expect(mockBatch.commit).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { __doc: "courts/court-1" },
      expect.objectContaining({ verified: false }),
    );
    expect(result?.status).toBe(COURT_SUBMISSION_STATUS.PENDING);
  });

  it("does a plain update for courts that were not submitted by a player", async () => {
    mockGetDoc.mockResolvedValue(courtSnap({ verified: false }));

    const result = await save();

    expect(mockBatch.commit).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it("falls back to a plain update when the court document is missing", async () => {
    mockGetDoc.mockResolvedValue(courtSnap(null));

    const result = await save();

    expect(mockBatch.commit).not.toHaveBeenCalled();
    expect(mockBatch.set).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it("does not re-approve an already approved submission", async () => {
    mockGetDoc.mockResolvedValue(
      courtSnap({
        verified: true,
        submission: submission(COURT_SUBMISSION_STATUS.APPROVED),
      }),
    );

    await save();

    expect(mockBatch.commit).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });
});

describe("deleteCourt", () => {
  it("rejects a pending submission and notifies the player", async () => {
    mockGetDoc.mockResolvedValue(
      courtSnap({
        courtName: "Riverside",
        verified: false,
        submission: submission(),
      }),
    );

    await deleteCourt({ courtId: "court-1" });

    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockBatch.delete).toHaveBeenCalledWith({ __doc: "courts/court-1" });
    const [, notification] = mockBatch.set.mock.calls[0];
    expect(notification).toMatchObject({
      recipientId: "player-1",
      message: "Riverside was not accepted for London Ladder.",
      data: { ladderId: "ladder-1", tab: "Matchmaking" },
    });
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it("deletes an already approved submission without a notification", async () => {
    mockGetDoc.mockResolvedValue(
      courtSnap({
        courtName: "Riverside",
        verified: true,
        submission: submission(COURT_SUBMISSION_STATUS.APPROVED),
      }),
    );

    await deleteCourt({ courtId: "court-1" });

    expect(mockDeleteDoc).toHaveBeenCalledWith({ __doc: "courts/court-1" });
    expect(mockBatch.commit).not.toHaveBeenCalled();
    expect(mockBatch.set).not.toHaveBeenCalled();
  });

  it("only deletes the document when the court no longer exists", async () => {
    mockGetDoc.mockResolvedValue(courtSnap(null));

    await deleteCourt({ courtId: "court-1" });

    expect(mockDeleteDoc).toHaveBeenCalledWith({ __doc: "courts/court-1" });
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it("deletes other courts without a notification", async () => {
    mockGetDoc.mockResolvedValue(courtSnap({ verified: true }));

    await deleteCourt({ courtId: "court-1" });

    expect(mockDeleteDoc).toHaveBeenCalledWith({ __doc: "courts/court-1" });
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });
});
