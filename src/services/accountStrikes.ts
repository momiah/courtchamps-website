import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase/config";
import { REPORTS_COLLECTION } from "courtchamps-shared/types";
import { getAccountStrikes } from "courtchamps-shared/helpers";
import type { AccountStrikeReport, AccountStrikes } from "courtchamps-shared/helpers";

export const fetchAccountStrikes = async (
  userId: string,
  now: Date = new Date(),
): Promise<AccountStrikes> => {
  const [profile, reports] = await Promise.all([
    getDoc(doc(db, "users", userId)),
    getDocs(
      query(collection(db, REPORTS_COLLECTION), where("target.userIds", "array-contains", userId)),
    ),
  ]);
  return getAccountStrikes({
    reports: reports.docs.map((report) => ({
      ...(report.data() as AccountStrikeReport),
      reportId: report.id,
    })),
    userId,
    now,
    liftedAt: profile.data()?.ladderBlockLiftedAt ?? null,
  });
};

export const fetchAccountStrikesFor = async (
  userIds: string[],
): Promise<Map<string, AccountStrikes>> => {
  const unique = Array.from(new Set(userIds));
  const results = await Promise.all(unique.map((userId) => fetchAccountStrikes(userId)));
  return new Map(unique.map((userId, index) => [userId, results[index]]));
};

export const liftLadderBlock = async (userId: string): Promise<void> => {
  await updateDoc(doc(db, "users", userId), { ladderBlockLiftedAt: new Date() });
};
