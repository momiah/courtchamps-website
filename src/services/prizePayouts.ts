import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
} from "firebase/firestore";

import { db } from "../firebase/config";
import {
  LADDER_PRIZE_PAYOUTS_COLLECTION,
  LADDER_PRIZE_PAYOUT_STATUS,
  LADDER_PRIZE_REVIEW_DECISION,
} from "courtchamps-shared/types";
import type {
  LadderPrizeAmount,
  LadderPrizePayout,
  LadderPrizeReviewDecision,
} from "courtchamps-shared/types";

export interface EnrichedPrizePayout extends LadderPrizePayout {
  username: string;
}

const toDate = (value: unknown): Date =>
  value && typeof (value as { toDate?: unknown }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate()
    : (value as Date);

export const sortPrizePayouts = <T extends Pick<LadderPrizePayout, "status" | "place" | "userId">>(
  payouts: T[],
): T[] =>
  [...payouts].sort(
    (a, b) =>
      Number(b.status === LADDER_PRIZE_PAYOUT_STATUS.HELD) -
        Number(a.status === LADDER_PRIZE_PAYOUT_STATUS.HELD) ||
      a.place - b.place ||
      a.userId.localeCompare(b.userId),
  );

export const fetchLadderPrizePayouts = async (
  ladderId: string,
): Promise<EnrichedPrizePayout[]> => {
  const snapshot = await getDocs(
    collection(db, "ladders", ladderId, LADDER_PRIZE_PAYOUTS_COLLECTION),
  );
  const payouts = snapshot.docs.map((payoutDoc) => {
    const data = payoutDoc.data() as LadderPrizePayout;
    return { ...data, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) };
  });
  const userIds = Array.from(new Set(payouts.map((payout) => payout.userId)));
  const profiles = await Promise.all(
    userIds.map((userId) => getDoc(doc(db, "users", userId))),
  );
  const names = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.exists() ? (profile.data()?.username as string) || profile.id : "Deleted account",
    ]),
  );
  return sortPrizePayouts(
    payouts.map((payout) => ({ ...payout, username: names.get(payout.userId) ?? payout.userId })),
  );
};

export interface PrizeReviewInput {
  decision: LadderPrizeReviewDecision;
  amount?: LadderPrizeAmount;
  reason: string;
}

export const validatePrizeReview = (
  payout: Pick<LadderPrizePayout, "prize">,
  review: PrizeReviewInput,
): string | null => {
  if (!review.reason.trim()) return "Give a reason. The player will see it.";
  if (review.decision !== LADDER_PRIZE_REVIEW_DECISION.PAY_PART) return null;
  const amount = review.amount ?? { cash: 0, cp: 0 };
  const values = [amount.cash, amount.cp];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return "Amounts must be zero or more.";
  }
  if (amount.cash > payout.prize.cash || amount.cp > payout.prize.cp) {
    return "A part payment can't be more than the prize.";
  }
  if (!Number.isInteger(amount.cp)) return "CP must be a whole number.";
  if (amount.cash === 0 && amount.cp === 0) return "Choose Don't pay to pay nothing.";
  if (amount.cash === payout.prize.cash && amount.cp === payout.prize.cp) {
    return "Choose Pay in full to pay the whole prize.";
  }
  return null;
};

export const submitPrizeReview = async ({
  ladderId,
  payoutId,
  review,
  adminUserId,
}: {
  ladderId: string;
  payoutId: string;
  review: PrizeReviewInput;
  adminUserId: string;
}): Promise<void> => {
  const payoutRef = doc(db, "ladders", ladderId, LADDER_PRIZE_PAYOUTS_COLLECTION, payoutId);
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(payoutRef);
    const payout = snapshot.data() as LadderPrizePayout | undefined;
    if (!payout || payout.status !== LADDER_PRIZE_PAYOUT_STATUS.HELD || payout.review) {
      throw new Error("This prize has already been reviewed.");
    }
    const error = validatePrizeReview(payout, review);
    if (error) throw new Error(error);
    tx.update(payoutRef, {
      review: {
        decision: review.decision,
        ...(review.decision === LADDER_PRIZE_REVIEW_DECISION.PAY_PART
          ? { amount: review.amount }
          : {}),
        reason: review.reason.trim(),
        decidedBy: adminUserId,
        decidedAt: new Date(),
        appliedAt: null,
      },
    });
  });
};
