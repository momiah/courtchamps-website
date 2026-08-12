import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase/config";
import {
  GenderType,
  GENDER_TYPE,
  Ladder,
  LadderInput,
  LADDER_STATUS,
  LadderStatus,
  LadderType,
  LADDER_TYPE,
} from "../types/ladder";
import { deriveLadderDates } from "../utils/ladderDates";

const LADDERS_COLLECTION = "ladders";

interface LadderDocumentData {
  name?: string;
  description?: string;
  image?: string;
  region?: string;
  countryCode?: string;
  ladderType?: string;
  genderType?: string;
  courtIds?: string[];
  status?: string;
  registrationOpensAt?: Timestamp | null;
  registrationClosesAt?: Timestamp | null;
  seasonStartsAt?: Timestamp | null;
  seasonEndsAt?: Timestamp | null;
  playoffStartsAt?: Timestamp | null;
  playoffEndsAt?: Timestamp | null;
  entryFee?: number;
  currencyType?: string;
  minRank?: number;
  maxPlayers?: number;
  participantCount?: number;
  prizesDistributed?: boolean;
  createdBy?: string;
  createdAt?: Timestamp | null;
  updatedBy?: string;
  updatedAt?: Timestamp | null;
}

const toDate = (value: Timestamp | null | undefined): Date =>
  value instanceof Timestamp ? value.toDate() : new Date(0);

// Coerce any stored status that is missing or no longer part of the lifecycle
// (e.g. legacy "draft"/"inProgress") to registrationOpen so the UI never has
// to handle an unknown status.
const KNOWN_LADDER_STATUSES = new Set<string>(Object.values(LADDER_STATUS));
const normalizeLadderStatus = (value: string | undefined): LadderStatus =>
  value !== undefined && KNOWN_LADDER_STATUSES.has(value)
    ? (value as LadderStatus)
    : LADDER_STATUS.REGISTRATION_OPEN;

const mapLadderDocument = (
  ladderId: string,
  data: LadderDocumentData,
): Ladder => ({
  ladderId,
  name: data.name ?? "",
  description: data.description ?? "",
  image: data.image ?? "",
  region: data.region ?? "",
  countryCode: data.countryCode ?? "",
  ladderType: (data.ladderType as LadderType) ?? LADDER_TYPE.SINGLES,
  genderType: (data.genderType as GenderType) ?? GENDER_TYPE.MIXED,
  courtIds: data.courtIds ?? [],
  status: normalizeLadderStatus(data.status),
  registrationOpensAt: toDate(data.registrationOpensAt),
  registrationClosesAt: toDate(data.registrationClosesAt),
  seasonStartsAt: toDate(data.seasonStartsAt),
  seasonEndsAt: toDate(data.seasonEndsAt),
  playoffStartsAt: toDate(data.playoffStartsAt),
  playoffEndsAt: toDate(data.playoffEndsAt),
  entryFee: data.entryFee ?? 0,
  currencyType: data.currencyType ?? "GBP",
  minRank: data.minRank ?? 0,
  maxPlayers: data.maxPlayers ?? 0,
  participantCount: data.participantCount ?? 0,
  prizesDistributed: data.prizesDistributed === true,
  createdBy: data.createdBy ?? "",
  createdAt: toDate(data.createdAt),
  updatedBy: data.updatedBy ?? "",
  updatedAt: toDate(data.updatedAt),
});

export const fetchLadders = async (): Promise<Ladder[]> => {
  const laddersQuery = query(
    collection(db, LADDERS_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(laddersQuery);

  return snapshot.docs.map((ladderDocument) =>
    mapLadderDocument(
      ladderDocument.id,
      ladderDocument.data() as LadderDocumentData,
    ),
  );
};

export const countLaddersUsingCourt = async ({
  courtId,
}: {
  courtId: string;
}): Promise<number> => {
  const laddersQuery = query(
    collection(db, LADDERS_COLLECTION),
    where("courtIds", "array-contains", courtId),
  );
  const snapshot = await getCountFromServer(laddersQuery);
  return snapshot.data().count;
};

export const fetchLadder = async ({
  ladderId,
}: {
  ladderId: string;
}): Promise<Ladder | null> => {
  const ladderReference = doc(db, LADDERS_COLLECTION, ladderId);
  const snapshot = await getDoc(ladderReference);

  if (!snapshot.exists()) {
    return null;
  }

  return mapLadderDocument(snapshot.id, snapshot.data() as LadderDocumentData);
};

export const createLadder = async ({
  input,
  actorUserId,
}: {
  input: LadderInput;
  actorUserId: string;
}): Promise<string> => {
  const derivedDates = deriveLadderDates({
    seasonStartsAt: input.seasonStartsAt,
  });
  const now = new Date();

  const ladderReference = await addDoc(collection(db, LADDERS_COLLECTION), {
    ...input,
    ...derivedDates,
    status: LADDER_STATUS.REGISTRATION_OPEN,
    participantCount: 0,
    prizesDistributed: false,
    createdBy: actorUserId,
    createdAt: now,
    updatedBy: actorUserId,
    updatedAt: now,
  });

  return ladderReference.id;
};

export const updateLadder = async ({
  ladderId,
  input,
  actorUserId,
  seasonStartChanged,
}: {
  ladderId: string;
  input: LadderInput;
  actorUserId: string;
  seasonStartChanged: boolean;
}): Promise<void> => {
  const ladderReference = doc(db, LADDERS_COLLECTION, ladderId);
  const now = new Date();

  const derivedDates = seasonStartChanged
    ? deriveLadderDates({ seasonStartsAt: input.seasonStartsAt })
    : {};

  await updateDoc(ladderReference, {
    ...input,
    ...derivedDates,
    updatedBy: actorUserId,
    updatedAt: now,
  });
};
