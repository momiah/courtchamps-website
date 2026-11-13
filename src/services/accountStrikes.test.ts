jest.mock("../firebase/config", () => ({ db: {} }));

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
jest.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: (ref: unknown, ...constraints: unknown[]) => ({ ref, constraints }),
  where: (...args: unknown[]) => args,
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}));

// eslint-disable-next-line import/first
import { fetchAccountStrikesFor, liftLadderBlock } from "./accountStrikes";

const DAY = 24 * 60 * 60 * 1000;
const upheld = (userId: string, count: number) => ({
  docs: Array.from({ length: count }, (_, index) => ({
    id: `r${index}`,
    data: () => ({
      ladderId: `ladder-${index}`,
      reason: "cheating",
      status: "approved",
      target: { userIds: [userId] },
      resolvedAt: new Date(Date.now() - (index + 1) * 10 * DAY),
    }),
  })),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDoc.mockResolvedValue({ data: () => ({}) });
});

describe("account strikes on the Reports page", () => {
  it("counts each reported player's upheld strikes once", async () => {
    mockGetDocs.mockImplementation(async (q: { constraints: unknown[][] }) =>
      upheld(q.constraints[0][2] as string, q.constraints[0][2] === "user" ? 5 : 2),
    );
    const strikes = await fetchAccountStrikesFor(["user", "opponent", "user"]);
    expect(mockGetDocs).toHaveBeenCalledTimes(2);
    expect(strikes.get("user")).toMatchObject({ count: 5, blocked: true });
    expect(strikes.get("opponent")).toMatchObject({ count: 2, blocked: false });
  });

  it("lifts a block by stamping the profile", async () => {
    await liftLadderBlock("user");
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: "users/user" },
      { ladderBlockLiftedAt: expect.any(Date) },
    );
  });
});
