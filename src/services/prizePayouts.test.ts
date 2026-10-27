jest.mock("../firebase/config", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({}));

import { sortPrizePayouts, validatePrizeReview } from "./prizePayouts";

const payout = { prize: { cash: 512, cp: 1280 } };

describe("validatePrizeReview", () => {
  it("needs a reason the player can read", () => {
    expect(validatePrizeReview(payout, { decision: "pay", reason: "  " })).toBe(
      "Give a reason. The player will see it.",
    );
    expect(validatePrizeReview(payout, { decision: "withhold", reason: "Abuse towards an opponent" })).toBeNull();
  });

  it("accepts a part payment between nothing and the full prize", () => {
    const part = (cash: number, cp: number) =>
      validatePrizeReview(payout, { decision: "payPart", amount: { cash, cp }, reason: "Partial" });
    expect(part(256, 640)).toBeNull();
    expect(part(600, 0)).toBe("A part payment can't be more than the prize.");
    expect(part(0, 0)).toBe("Choose Don't pay to pay nothing.");
    expect(part(512, 1280)).toBe("Choose Pay in full to pay the whole prize.");
    expect(part(10, 10.5)).toBe("CP must be a whole number.");
    expect(part(-1, 10)).toBe("Amounts must be zero or more.");
  });
});

describe("sortPrizePayouts", () => {
  it("puts prizes under review first, then by place", () => {
    const sorted = sortPrizePayouts([
      { status: "paid", place: 1, userId: "user" },
      { status: "paid", place: 8, userId: "opponent" },
      { status: "held", place: 2, userId: "finalist" },
    ] as const as { status: "paid" | "held"; place: number; userId: string }[]);
    expect(sorted.map((payout) => payout.userId)).toEqual(["finalist", "user", "opponent"]);
  });
});
